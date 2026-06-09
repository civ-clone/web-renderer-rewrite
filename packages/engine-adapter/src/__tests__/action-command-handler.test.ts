import { describe, it, expect } from "vitest";
import { PROTOCOL_VERSION, type ActionCommand } from "@civ-clone/protocol-state";
import {
  ActionCommandHandler,
  type ActionCommandHandlerContext,
} from "../action-command-handler.js";
import { InMemoryObservabilitySink } from "../observability.js";

function makeCommand(overrides: Partial<ActionCommand> = {}): ActionCommand {
  return {
    protocolVersion: PROTOCOL_VERSION,
    commandId: "cmd-1",
    matchId: "match-1",
    actorPlayerId: "player:1",
    clientSeq: 1,
    tier: "player",
    actionType: "ChooseResearch",
    sentAt: 1,
    ...overrides,
  };
}

function makePlayerAction(actionType: string, value: unknown) {
  const ActionClass = { [actionType]: class {} }[actionType];

  return Object.assign(Object.create(ActionClass.prototype), {
    value: () => value,
  });
}

function makeContext(
  overrides: Partial<ActionCommandHandlerContext> = {}
): {
  context: ActionCommandHandlerContext;
  calls: { player: number; unit: number };
} {
  const calls = { player: 0, unit: 0 };

  const context: ActionCommandHandlerContext = {
    matchId: "match-1",
    currentTurn: 5,
    getPlayerActions: () => [],
    getUnitActions: () => [],
    executePlayerAction: () => {
      calls.player += 1;
    },
    executeUnitAction: () => {
      calls.unit += 1;
    },
    ...overrides,
  };

  return { context, calls };
}

describe("ActionCommandHandler", () => {
  it("accepts matching player-tier command", () => {
    const handler = new ActionCommandHandler();
    const action = makePlayerAction("ChooseResearch", {
      id: () => "PlayerResearch-1",
    });
    const { context, calls } = makeContext({
      getPlayerActions: () => [action],
    });

    const result = handler.onActionCommand(
      makeCommand({ valueId: "PlayerResearch-1" }),
      context
    );

    expect(result.status).toBe("accepted");
    expect(result.serverSeq).toBe(1);
    expect(calls.player).toBe(1);
  });

  it("returns cached accepted result for duplicate commandId", () => {
    const handler = new ActionCommandHandler();
    const action = makePlayerAction("ChooseResearch", {
      id: () => "PlayerResearch-1",
    });
    const { context, calls } = makeContext({
      getPlayerActions: () => [action],
    });

    const command = makeCommand({ valueId: "PlayerResearch-1" });
    const first = handler.onActionCommand(command, context);
    const second = handler.onActionCommand(command, context);

    expect(first.status).toBe("accepted");
    expect(second.status).toBe("accepted");
    expect(second.serverSeq).toBe(1);
    expect(calls.player).toBe(1);
  });

  it("rejects out-of-order client sequence", () => {
    const handler = new ActionCommandHandler();
    const action = makePlayerAction("ChooseResearch", {
      id: () => "PlayerResearch-1",
    });
    const { context } = makeContext({
      getPlayerActions: () => [action],
    });

    const accepted = handler.onActionCommand(
      makeCommand({ commandId: "cmd-2", clientSeq: 3, valueId: "PlayerResearch-1" }),
      context
    );
    const rejected = handler.onActionCommand(
      makeCommand({ commandId: "cmd-3", clientSeq: 3, valueId: "PlayerResearch-1" }),
      context
    );

    expect(accepted.status).toBe("accepted");
    expect(rejected.status).toBe("rejected");
    expect(rejected.reasonCode).toBe("CLIENT_SEQ_OUT_OF_ORDER");
  });

  it("rejects when no matching action exists", () => {
    const handler = new ActionCommandHandler();
    const { context } = makeContext();

    const result = handler.onActionCommand(
      makeCommand({ commandId: "cmd-4", valueId: "missing" }),
      context
    );

    expect(result.status).toBe("rejected");
    expect(result.reasonCode).toBe("ACTION_NOT_FOUND");
  });

  it("rejects mismatched match id", () => {
    const handler = new ActionCommandHandler();
    const { context } = makeContext();

    const result = handler.onActionCommand(
      makeCommand({ commandId: "cmd-5", matchId: "different-match" }),
      context
    );

    expect(result.status).toBe("rejected");
    expect(result.reasonCode).toBe("MATCH_ID_MISMATCH");
  });

  it("prefers valueStableId over valueId when both are provided", () => {
    const handler = new ActionCommandHandler();
    const action = makePlayerAction("ChooseResearch", {
      id: () => "PlayerResearch-ephemeral",
      getStableId: () => "tech:bronze-working",
    });
    const { context, calls } = makeContext({
      getPlayerActions: () => [action],
    });

    const result = handler.onActionCommand(
      makeCommand({
        commandId: "cmd-6",
        clientSeq: 6,
        valueId: "wrong-ephemeral-id",
        valueStableId: "tech:bronze-working",
      }),
      context
    );

    expect(result.status).toBe("accepted");
    expect(calls.player).toBe(1);
  });

  it("falls back to valueId when valueStableId is provided but unavailable on value", () => {
    const handler = new ActionCommandHandler();
    const action = makePlayerAction("ChooseResearch", {
      id: () => "PlayerResearch-1",
    });
    const { context, calls } = makeContext({
      getPlayerActions: () => [action],
    });

    const result = handler.onActionCommand(
      makeCommand({
        commandId: "cmd-7",
        clientSeq: 7,
        valueId: "PlayerResearch-1",
        valueStableId: "tech:bronze-working",
      }),
      context
    );

    expect(result.status).toBe("accepted");
    expect(calls.player).toBe(1);
  });

  it("includes rng trace in result when provided by context", () => {
    const handler = new ActionCommandHandler();
    const action = makePlayerAction("ChooseResearch", {
      id: () => "PlayerResearch-1",
    });
    const { context } = makeContext({
      getPlayerActions: () => [action],
      getRngTrace: () => ({ seed: "abc123", counter: 5 }),
    });

    const result = handler.onActionCommand(
      makeCommand({ commandId: "cmd-8", clientSeq: 8, valueId: "PlayerResearch-1" }),
      context
    );

    expect(result.status).toBe("accepted");
    expect(result.rng).toEqual({ seed: "abc123", counter: 5 });
  });

  it("emits command observability events when sink is provided", () => {
    const handler = new ActionCommandHandler();
    const action = makePlayerAction("ChooseResearch", {
      id: () => "PlayerResearch-1",
    });
    const sink = new InMemoryObservabilitySink();
    const { context } = makeContext({
      getPlayerActions: () => [action],
      observability: sink,
    });

    const result = handler.onActionCommand(
      makeCommand({ commandId: "cmd-9", clientSeq: 9, valueId: "PlayerResearch-1" }),
      context
    );

    expect(result.status).toBe("accepted");
    expect(sink.events().map((event) => event.type)).toEqual([
      "command.received",
      "command.result",
    ]);
  });

  it("uses migrated units resolver when cutover mode is migrated", () => {
    const handler = new ActionCommandHandler();
    const unitAction = {
      constructor: { name: "Move" },
      unit: () => ({ id: () => "Unit-1", getStableId: () => "unit:42:3" }),
      from: () => ({ x: () => 3, y: () => 4 }),
      to: () => ({ x: () => 3, y: () => 5 }),
    };
    let resolverCalls = 0;
    const { context, calls } = makeContext({
      getUnitActions: () => [unitAction as never],
      cutover: { units: "migrated" },
      unitsAdapter: {
        toUnitRecord: () => ({}),
        describeUnitActions: () => [],
        resolveUnitActions: (_command, legacyActions) => {
          resolverCalls += 1;
          return legacyActions;
        },
      },
    });

    const result = handler.onActionCommand(
      makeCommand({
        commandId: "cmd-10",
        clientSeq: 10,
        tier: "unit",
        actionType: "Move",
        unitStableId: "unit:42:3",
        fromTileId: "3:4",
        toTileId: "3:5",
      }),
      context
    );

    expect(result.status).toBe("accepted");
    expect(resolverCalls).toBe(1);
    expect(calls.unit).toBe(1);
  });

  it("emits units shadow mismatch telemetry when cutover mode is shadow", () => {
    const handler = new ActionCommandHandler();
    const unitAction = {
      constructor: { name: "Move" },
      unit: () => ({ id: () => "Unit-1", getStableId: () => "unit:42:3" }),
      from: () => ({ x: () => 3, y: () => 4 }),
      to: () => ({ x: () => 3, y: () => 5 }),
    };
    const sink = new InMemoryObservabilitySink();
    const { context } = makeContext({
      getUnitActions: () => [unitAction as never],
      cutover: { units: "shadow" },
      observability: sink,
      unitsAdapter: {
        toUnitRecord: () => ({}),
        describeUnitActions: () => [],
        // Return extra action to force mismatch telemetry.
        resolveUnitActions: (_command, legacyActions) => [
          ...legacyActions,
          legacyActions[0],
        ],
      },
    });

    handler.onActionCommand(
      makeCommand({
        commandId: "cmd-11",
        clientSeq: 11,
        tier: "unit",
        actionType: "Move",
        unitStableId: "unit:42:3",
        fromTileId: "3:4",
        toTileId: "3:5",
      }),
      context
    );

    const shadowEvent = sink.events().find((event) => event.type === "migration.shadow.units");
    expect(shadowEvent).toBeDefined();
    expect(shadowEvent!.payload).toMatchObject({
      parityMatched: false,
      mismatchType: "actions",
      legacyActionCount: 1,
      migratedActionCount: 2,
    });
  });
});

