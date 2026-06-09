import {
  PROTOCOL_VERSION,
  type ActionCommand,
  type ActionResult,
  type RngTrace,
} from "@civ-clone/protocol-state";
import {
  createObservabilityEvent,
  type ObservabilitySink,
} from "./observability.js";

type EngineValueRef = {
  id?: () => string;
  getStableId?: () => string;
};

type EnginePlayerAction = {
  constructor: { name: string };
  value(): unknown;
};

type EngineTile = {
  x(): number;
  y(): number;
};

type EngineUnitRef = {
  id(): string;
  getStableId?: () => string;
};

type EngineUnitAction = {
  constructor: { name: string };
  unit(): EngineUnitRef;
  from(): EngineTile;
  to(): EngineTile;
};

export interface ActionCommandHandlerContext {
  matchId: string;
  currentTurn?: number;
  observability?: ObservabilitySink;
  getPlayerActions(command: ActionCommand): EnginePlayerAction[];
  getUnitActions(command: ActionCommand): EngineUnitAction[];
  executePlayerAction(action: EnginePlayerAction, command: ActionCommand): void;
  executeUnitAction(action: EngineUnitAction, command: ActionCommand): void;
  /** Optional RNG trace provider to annotate results for deterministic diagnostics */
  getRngTrace?: (command: ActionCommand) => RngTrace | undefined;
}

function tileId(tile: EngineTile): string {
  return `${tile.x()}:${tile.y()}`;
}

function valueMatches(command: ActionCommand, value: unknown): boolean {
  if (command.valueStableId) {
    const stableValue = value as EngineValueRef;

    if (typeof stableValue?.getStableId === "function") {
      return stableValue.getStableId() === command.valueStableId;
    }
  }

  if (command.valueId) {
    const idValue = value as EngineValueRef;

    if (typeof idValue?.id === "function") {
      return idValue.id() === command.valueId;
    }
  }

  return !command.valueStableId && !command.valueId;
}

function playerActionMatches(
  command: ActionCommand,
  action: EnginePlayerAction
): boolean {
  if (action.constructor.name !== command.actionType) {
    return false;
  }

  return valueMatches(command, action.value());
}

function unitRefMatches(command: ActionCommand, unit: EngineUnitRef): boolean {
  if (command.unitStableId && typeof unit.getStableId === "function") {
    return unit.getStableId() === command.unitStableId;
  }

  if (command.unitId) {
    return unit.id() === command.unitId;
  }

  return false;
}

function unitActionMatches(command: ActionCommand, action: EngineUnitAction): boolean {
  if (action.constructor.name !== command.actionType) {
    return false;
  }

  if (!unitRefMatches(command, action.unit())) {
    return false;
  }

  const fromTileId = tileId(action.from());
  if (command.fromTileId && command.fromTileId !== fromTileId) {
    return false;
  }

  const toTileId = tileId(action.to());
  if (command.toTileId) {
    return command.toTileId === toTileId;
  }

  return fromTileId === toTileId;
}

export class ActionCommandHandler {
  #serverSeq = 0;
  #resultByCommandId = new Map<string, ActionResult>();
  #lastAcceptedClientSeqByPlayer = new Map<string, number>();

  onActionCommand(
    command: ActionCommand,
    context: ActionCommandHandlerContext
  ): ActionResult {
    const emit = (type: string, payload: Record<string, unknown>): void => {
      context.observability?.record(createObservabilityEvent(type, payload, context.matchId));
    };

    emit("command.received", {
      commandId: command.commandId,
      actorPlayerId: command.actorPlayerId,
      clientSeq: command.clientSeq,
      tier: command.tier,
      actionType: command.actionType,
    });

    const cached = this.#resultByCommandId.get(command.commandId);
    if (cached) {
      emit("command.result", {
        commandId: command.commandId,
        status: cached.status,
        serverSeq: cached.serverSeq,
        reasonCode: cached.reasonCode,
        cached: true,
      });
      return cached;
    }

    const rng = context.getRngTrace?.(command);

    const reject = (reasonCode: string, message: string): ActionResult => ({
      commandId: command.commandId,
      status: "rejected",
      reasonCode,
      message,
      serverSeq: this.#serverSeq,
      ...(rng ? { rng } : {}),
    });

    const rejectAndEmit = (reasonCode: string, message: string): ActionResult => {
      const result = reject(reasonCode, message);
      emit("command.result", {
        commandId: command.commandId,
        status: result.status,
        serverSeq: result.serverSeq,
        reasonCode,
        cached: false,
      });
      return result;
    };

    if (command.protocolVersion !== PROTOCOL_VERSION) {
      return rejectAndEmit("PROTOCOL_VERSION_MISMATCH", "Unsupported protocol version.");
    }

    if (command.matchId !== context.matchId) {
      return rejectAndEmit("MATCH_ID_MISMATCH", "Command matchId does not match handler context.");
    }

    if (
      typeof context.currentTurn === "number" &&
      typeof command.expectedTurn === "number" &&
      context.currentTurn !== command.expectedTurn
    ) {
      return rejectAndEmit("TURN_MISMATCH", "Command expectedTurn does not match current turn.");
    }

    const lastSeq = this.#lastAcceptedClientSeqByPlayer.get(command.actorPlayerId);
    if (typeof lastSeq === "number" && command.clientSeq <= lastSeq) {
      return rejectAndEmit(
        "CLIENT_SEQ_OUT_OF_ORDER",
        "Command clientSeq must be greater than last accepted sequence."
      );
    }

    let resolved: EnginePlayerAction | EngineUnitAction | undefined;

    if (command.tier === "player") {
      const matches = context
        .getPlayerActions(command)
        .filter((action) => playerActionMatches(command, action));

      if (matches.length > 1) {
        return rejectAndEmit("ACTION_AMBIGUOUS", "Multiple player actions matched command.");
      }

      if (matches.length === 0) {
        return rejectAndEmit("ACTION_NOT_FOUND", "No player action matched command.");
      }

      resolved = matches[0];
    } else {
      const matches = context
        .getUnitActions(command)
        .filter((action) => unitActionMatches(command, action));

      if (matches.length > 1) {
        return rejectAndEmit("ACTION_AMBIGUOUS", "Multiple unit actions matched command.");
      }

      if (matches.length === 0) {
        return rejectAndEmit("ACTION_NOT_FOUND", "No unit action matched command.");
      }

      resolved = matches[0];
    }

    try {
      if (command.tier === "player") {
        context.executePlayerAction(resolved as EnginePlayerAction, command);
      } else {
        context.executeUnitAction(resolved as EngineUnitAction, command);
      }
    } catch (error) {
      return rejectAndEmit(
        "ACTION_EXECUTION_ERROR",
        error instanceof Error ? error.message : "Unknown execution error."
      );
    }

    this.#serverSeq += 1;
    this.#lastAcceptedClientSeqByPlayer.set(command.actorPlayerId, command.clientSeq);

    const accepted: ActionResult = {
      commandId: command.commandId,
      status: "accepted",
      serverSeq: this.#serverSeq,
      ...(rng ? { rng } : {}),
    };

    emit("command.result", {
      commandId: command.commandId,
      status: accepted.status,
      serverSeq: accepted.serverSeq,
      cached: false,
    });

    this.#resultByCommandId.set(command.commandId, accepted);

    return accepted;
  }
}

