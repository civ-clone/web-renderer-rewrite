import { describe, it, expect } from "vitest";
import { PROTOCOL_VERSION, type PatchOp, type SnapshotEnvelope } from "@civ-clone/protocol-state";
import { DeltaExporter } from "../delta-exporter.js";

function makeSnapshot(overrides: Partial<SnapshotEnvelope> = {}): SnapshotEnvelope {
  return {
    protocolVersion: PROTOCOL_VERSION,
    matchId: "match:abc",
    stateVersion: 1,
    turn: 1,
    entities: {},
    indexes: {},
    requirementsByPlayer: {},
    checksum: "checksum-1",
    ...overrides,
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function applyPatches(base: Record<string, unknown>, patches: PatchOp[]): Record<string, unknown> {
  const next = clone(base);

  for (const patch of patches) {
    const parts = patch.path.split(".");
    let current = next as Record<string, unknown>;
    for (const part of parts.slice(0, -1)) {
      if (!current[part] || typeof current[part] !== "object") {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    const key = parts[parts.length - 1];

    if (patch.op === "set") {
      current[key] = clone(patch.value);
      continue;
    }

    if (patch.op === "remove") {
      delete current[key];
      continue;
    }

    if (!Array.isArray(current[key])) {
      current[key] = [];
    }

    const arr = current[key] as unknown[];

    if (patch.op === "arrayPush") {
      arr.push(clone(patch.value));
    } else {
      const index = arr.findIndex((value) => Object.is(value, patch.value));
      if (index >= 0) {
        arr.splice(index, 1);
      }
    }
  }

  return next;
}

function deltaSource(snapshot: SnapshotEnvelope): Record<string, unknown> {
  return {
    turn: snapshot.turn,
    entities: snapshot.entities,
    indexes: snapshot.indexes,
    requirementsByPlayer: snapshot.requirementsByPlayer,
    actionsByPlayer: snapshot.actionsByPlayer,
    unitActionsById: snapshot.unitActionsById,
  };
}

describe("DeltaExporter", () => {
  it("builds metadata and result checksum", () => {
    const previous = makeSnapshot({ stateVersion: 10, checksum: "a" });
    const next = makeSnapshot({ stateVersion: 11, checksum: "b" });

    const delta = new DeltaExporter().buildDelta(previous, next);

    expect(delta.protocolVersion).toBe(PROTOCOL_VERSION);
    expect(delta.matchId).toBe("match:abc");
    expect(delta.baseVersion).toBe(10);
    expect(delta.targetVersion).toBe(11);
    expect(delta.resultChecksum).toBe("b");
  });

  it("emits set/remove/array ops for entity and index changes", () => {
    const previous = makeSnapshot({
      entities: { units: { "unit:1": { health: 100 } }, cities: { "city:1": { pop: 3 } } },
      indexes: { unitsByPlayer: { "player:1": ["unit:1"] } },
      stateVersion: 1,
      checksum: "a",
    });

    const next = makeSnapshot({
      entities: { units: { "unit:1": { health: 80 }, "unit:2": { health: 100 } }, cities: {} },
      indexes: { unitsByPlayer: { "player:1": ["unit:2"] } },
      stateVersion: 2,
      checksum: "b",
    });

    const delta = new DeltaExporter().buildDelta(previous, next);

    expect(delta.patches).toContainEqual({ op: "set", path: "entities.units.unit:1.health", value: 80 });
    expect(delta.patches).toContainEqual({ op: "set", path: "entities.units.unit:2", value: { health: 100 } });
    expect(delta.patches).toContainEqual({ op: "remove", path: "entities.cities.city:1" });
    expect(delta.patches).toContainEqual({ op: "arrayRemoveItem", path: "indexes.unitsByPlayer.player:1", value: "unit:1" });
    expect(delta.patches).toContainEqual({ op: "arrayPush", path: "indexes.unitsByPlayer.player:1", value: "unit:2" });
  });

  it("round-trips previous source to next source via patches", () => {
    const previous = makeSnapshot({
      turn: 7,
      entities: { units: { "unit:1": { health: 100 } } },
      indexes: { unitsByPlayer: { "player:1": ["unit:1"] } },
      requirementsByPlayer: { "player:1": { mandatory: [], optional: [] } },
      stateVersion: 4,
      checksum: "prev",
    });

    const next = makeSnapshot({
      turn: 8,
      entities: { units: { "unit:1": { health: 80 }, "unit:2": { health: 100 } } },
      indexes: { unitsByPlayer: { "player:1": ["unit:1", "unit:2"] } },
      requirementsByPlayer: { "player:1": { mandatory: [], optional: [] } },
      stateVersion: 5,
      checksum: "next",
    });

    const delta = new DeltaExporter().buildDelta(previous, next);
    const applied = applyPatches(deltaSource(previous), delta.patches);

    expect(applied).toEqual(deltaSource(next));
    expect(delta.resultChecksum).toBe("next");
  });

  it("throws on invalid continuity (protocol/match/version)", () => {
    const exporter = new DeltaExporter();

    expect(() =>
      exporter.buildDelta(
        makeSnapshot({ protocolVersion: PROTOCOL_VERSION, stateVersion: 1 }),
        makeSnapshot({ protocolVersion: "9.9" as never, stateVersion: 2 })
      )
    ).toThrow();

    expect(() =>
      exporter.buildDelta(
        makeSnapshot({ matchId: "m1", stateVersion: 1 }),
        makeSnapshot({ matchId: "m2", stateVersion: 2 })
      )
    ).toThrow();

    expect(() =>
      exporter.buildDelta(
        makeSnapshot({ stateVersion: 2 }),
        makeSnapshot({ stateVersion: 2 })
      )
    ).toThrow();
  });
});

