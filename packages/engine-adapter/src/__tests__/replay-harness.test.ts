import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
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
import { buildReproPacket } from "../repro-packet.js";

function checksum(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function makeCommand(commandId: string, clientSeq: number): ActionCommand {
  return {
    protocolVersion: PROTOCOL_VERSION,
    commandId,
    matchId: "match:replay",
    actorPlayerId: "player:1",
    clientSeq,
    tier: "player",
    actionType: "EndTurn",
    sentAt: 1_000_000 + clientSeq,
  };
}

function makeReplayContext() {
  const state = {
    version: 1,
    turn: 1,
    accepted: 0,
  };

  class EndTurn {
    value(): undefined {
      return undefined;
    }
  }

  const action = new EndTurn();

  const actionContext: ActionCommandHandlerContext = {
    matchId: "match:replay",
    getPlayerActions: () => [action as never],
    getUnitActions: () => [],
    executePlayerAction: () => {
      state.accepted += 1;
      state.version += 1;
      state.turn += 1;
    },
    executeUnitAction: () => {
      throw new Error("unit path not expected");
    },
  };

  const exportSnapshot = (): SnapshotEnvelope => {
    const body = `${state.version}:${state.turn}:${state.accepted}`;
    return {
      protocolVersion: PROTOCOL_VERSION,
      matchId: "match:replay",
      stateVersion: state.version,
      turn: state.turn,
      entities: {},
      indexes: {},
      requirementsByPlayer: {},
      checksum: checksum(body),
    };
  };

  return {
    actionHandler: new ActionCommandHandler(),
    actionContext,
    exportSnapshot,
  };
}

describe("ReplayHarness", () => {
  it("reaches stable final checksum for deterministic command stream", () => {
    const stream = [
      { command: makeCommand("cmd-1", 1) },
      { command: makeCommand("cmd-2", 2) },
      { command: makeCommand("cmd-3", 3) },
    ];

    const runA = new ReplayHarness().run(stream, makeReplayContext());
    const runB = new ReplayHarness().run(stream, makeReplayContext());

    expect(runA.failures).toEqual([]);
    expect(runA.acceptedCount).toBe(3);
    expect(runA.rejectedCount).toBe(0);
    expect(runA.deltaCount).toBe(3);
    expect(runA.snapshotCount).toBe(4);
    expect(runA.finalChecksum).toBe(runB.finalChecksum);
  });

  it("records checksum mismatch as a replay failure", () => {
    const stream = [{ command: makeCommand("cmd-1", 1) }];

    const summary = new ReplayHarness().run(stream, makeReplayContext(), {
      expectedFinalChecksum: "not-the-real-checksum",
    });

    expect(summary.checksumMatched).toBe(false);
    expect(summary.failures.length).toBeGreaterThan(0);
    expect(summary.failures[0].commandId).toBe("<final-checksum>");
  });

  it("produces a minimal repro packet with command stream and recent logs", () => {
    const sink = new InMemoryObservabilitySink();
    const stream = [{ command: makeCommand("cmd-1", 1) }];

    const summary = new ReplayHarness().run(
      stream,
      {
        ...makeReplayContext(),
        observability: sink,
      },
      { expectedFinalChecksum: "wrong" }
    );

    const packet = buildReproPacket({
      reason: "CHECKSUM_MISMATCH",
      summary,
      stream,
      events: sink.events(),
      maxRecentEvents: 5,
    });

    expect(packet.reason).toBe("CHECKSUM_MISMATCH");
    expect(packet.commandStream).toHaveLength(1);
    expect(packet.actualFinalChecksum).toBe(summary.finalChecksum);
    expect(packet.recentEvents.length).toBeLessThanOrEqual(5);
  });
});

