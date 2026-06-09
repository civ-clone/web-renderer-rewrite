import { createHash } from "node:crypto";
import {
  PROTOCOL_VERSION,
  type ActionCommand,
  type SnapshotEnvelope,
} from "@civ-clone/protocol-state";
import {
  ActionCommandHandler,
  type ActionCommandHandlerContext,
} from "../action-command-handler.js";
import { InMemoryObservabilitySink } from "../observability.js";
import { ReplayHarness } from "../replay-harness.js";

function checksum(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function makeCommand(commandId: string, clientSeq: number): ActionCommand {
  return {
    protocolVersion: PROTOCOL_VERSION,
    commandId,
    matchId: "match:wp010-demo",
    actorPlayerId: "player:1",
    clientSeq,
    tier: "player",
    actionType: "EndTurn",
    sentAt: Date.now() + clientSeq,
  };
}

const sink = new InMemoryObservabilitySink();
const handler = new ActionCommandHandler();

const state = {
  stateVersion: 1,
  turn: 1,
  accepted: 0,
};

class EndTurn {
  value(): undefined {
    return undefined;
  }
}

const endTurnAction = new EndTurn();

const actionContext: ActionCommandHandlerContext = {
  matchId: "match:wp010-demo",
  observability: sink,
  getPlayerActions: () => [endTurnAction as never],
  getUnitActions: () => [],
  executePlayerAction: () => {
    state.accepted += 1;
    state.stateVersion += 1;
    state.turn += 1;
  },
  executeUnitAction: () => {
    throw new Error("unit path unused in this runner");
  },
};

function exportSnapshot(): SnapshotEnvelope {
  const body = `${state.stateVersion}:${state.turn}:${state.accepted}`;
  return {
    protocolVersion: PROTOCOL_VERSION,
    matchId: "match:wp010-demo",
    stateVersion: state.stateVersion,
    turn: state.turn,
    entities: {},
    indexes: {},
    requirementsByPlayer: {},
    checksum: checksum(body),
  };
}

const stream = [
  { command: makeCommand("cmd-1", 1), expectedStatus: "accepted" as const },
  { command: makeCommand("cmd-2", 2), expectedStatus: "accepted" as const },
  { command: makeCommand("cmd-3", 3), expectedStatus: "accepted" as const },
];

const summary = new ReplayHarness().run(
  stream,
  {
    actionHandler: handler,
    actionContext,
    exportSnapshot,
    observability: sink,
  },
  {
    failFast: false,
  }
);

console.log("WP-010 replay harness demo");
console.log("summary:", {
  commandCount: summary.commandCount,
  acceptedCount: summary.acceptedCount,
  rejectedCount: summary.rejectedCount,
  deltaCount: summary.deltaCount,
  finalChecksum: summary.finalChecksum,
  failures: summary.failures.length,
});
console.log("recent events:", sink.events().slice(-8));


