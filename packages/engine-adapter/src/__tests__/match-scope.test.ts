import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { PROTOCOL_VERSION, type SnapshotEnvelope } from "@civ-clone/protocol-state";
import { ActionCommandHandler } from "../action-command-handler.js";
import { SnapshotExporter } from "../snapshot-exporter.js";
import {
  getMatchId,
  requireMatchId,
  withMatchScope,
} from "../match-scope.js";
import { requireRegistryContainer } from "../registry-container.js";

function sha256(s: string) {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

function makePlayer() {
  return {
    id: () => "Player-1",
    getStableId: () => "player:1",
    actions: () => [] as never[],
  };
}

describe("withMatchScope — match ID access", () => {
  it("makes matchId available via requireMatchId inside scope", async () => {
    await withMatchScope({ matchId: "match:integration" }, async () => {
      expect(requireMatchId()).toBe("match:integration");
    });
  });

  it("getMatchId returns undefined outside scope", () => {
    expect(getMatchId()).toBeUndefined();
  });

  it("getMatchId returns matchId inside scope", async () => {
    await withMatchScope({ matchId: "match:xyz" }, async () => {
      expect(getMatchId()).toBe("match:xyz");
    });
  });

  it("isolates parallel match scopes", async () => {
    const [a, b] = await Promise.all([
      withMatchScope({ matchId: "match:A" }, async () => requireMatchId()),
      withMatchScope({ matchId: "match:B" }, async () => requireMatchId()),
    ]);
    expect(a).toBe("match:A");
    expect(b).toBe("match:B");
  });
});

describe("withMatchScope — registry access in adapters", () => {
  it("ActionCommandHandler can access container for match context validation", async () => {
    const handler = new ActionCommandHandler();
    const player = makePlayer();

    class ChooseResearch {
      value() {
        return { id: () => "research-1", getStableId: () => "tech:bronze" };
      }
    }

    const action = new ChooseResearch();

    const result = await withMatchScope(
      {
        matchId: "match:adapter",
        registries: { actionLog: { entries: [] as string[] } },
      },
      async ({ matchId }) => {
        const container = requireRegistryContainer();
        const log = container.require<{ entries: string[] }>("actionLog");

        const r = handler.onActionCommand(
          {
            protocolVersion: PROTOCOL_VERSION,
            commandId: "cmd-1",
            matchId,
            actorPlayerId: "player:1",
            clientSeq: 1,
            tier: "player",
            actionType: "ChooseResearch",
            valueStableId: "tech:bronze",
            sentAt: Date.now(),
          },
          {
            matchId,
            getPlayerActions: () => [action as never],
            getUnitActions: () => [],
            executePlayerAction: () => {
              log.entries.push("ChooseResearch");
            },
            executeUnitAction: () => undefined,
          }
        );

        return { result: r, log: log.entries };
      }
    );

    expect(result.result.status).toBe("accepted");
    expect(result.log).toEqual(["ChooseResearch"]);
  });

  it("SnapshotExporter can read AdditionalData from container registries", async () => {
    const player = makePlayer();
    const exporter = new SnapshotExporter();

    const snap = await withMatchScope(
      {
        matchId: "match:snap",
        registries: {
          worldData: {
            "world:player:1": { discoveredTileIds: ["0:0", "1:0"] },
          },
        },
      },
      async ({ matchId }) => {
        const container = requireRegistryContainer();
        const worldData = container.require<Record<string, unknown>>("worldData");

        return exporter.buildSnapshot({
          matchId,
          stateVersion: 1,
          turn: 1,
          getPlayers: () => [player],
          getUnits: () => [],
          getCities: () => [],
          getAdditionalEntityTables: () => ({ worlds: worldData as never }),
        });
      }
    );

    expect(snap.entities["worlds"]["world:player:1"]).toEqual({
      discoveredTileIds: ["0:0", "1:0"],
    });
    expect(snap.checksum).toMatch(/^[0-9a-f]{64}$/);
  });

  it("resets resettable registries on match end by default", async () => {
    const calls: string[] = [];
    const registry = {
      name: "test-registry",
      reset() {
        calls.push("reset");
      },
    };

    await withMatchScope(
      { matchId: "match:reset", registries: { reg: registry } },
      async () => {
        // nothing — just run and exit
      }
    );

    expect(calls).toEqual(["reset"]);
  });

  it("does not reset when resetOnEnd is false", async () => {
    const calls: string[] = [];
    const registry = {
      reset() {
        calls.push("reset");
      },
    };

    await withMatchScope(
      { matchId: "match:no-reset", registries: { reg: registry }, resetOnEnd: false },
      async () => undefined
    );

    expect(calls).toHaveLength(0);
  });
});

describe("withMatchScope — deterministic snapshot checksums", () => {
  it("same scope state produces the same snapshot checksum on repeat runs", async () => {
    const player = makePlayer();
    const exporter = new SnapshotExporter();

    const run = () =>
      withMatchScope(
        { matchId: "match:checksum", registries: { worldData: { "world:1": { v: 1 } } } },
        async ({ matchId }) => {
          const container = requireRegistryContainer();
          const world = container.require<Record<string, unknown>>("worldData");
          return exporter
            .buildSnapshot({
              matchId,
              stateVersion: 1,
              turn: 1,
              getPlayers: () => [player],
              getUnits: () => [],
              getCities: () => [],
              getAdditionalEntityTables: () => ({ worlds: world as never }),
            })
            .checksum;
        }
      );

    const [a, b] = await Promise.all([run(), run()]);
    expect(a).toBe(b);
  });
});

