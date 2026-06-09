import { describe, it, expect, beforeEach } from "vitest";
import { PROTOCOL_VERSION, type SnapshotEnvelope, type DeltaEnvelope } from "@civ-clone/protocol-state";
import { RendererStore } from "../renderer-store.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSnapshot(overrides: Partial<SnapshotEnvelope> = {}): SnapshotEnvelope {
  return {
    protocolVersion: PROTOCOL_VERSION,
    matchId: "match:test",
    stateVersion: 1,
    turn: 1,
    checksum: "abc123",
    entities: {
      units: {
        "unit:1": { playerId: "player:1", type: "Warrior", x: 0, y: 0, health: 10 },
        "unit:2": { playerId: "player:2", type: "Settler", x: 5, y: 5, health: 10 },
      },
      cities: {
        "city:1": { playerId: "player:1", name: "Rome", x: 1, y: 1, size: 1 },
      },
    },
    indexes: {
      unitsByPlayer: {
        "player:1": ["unit:1"],
        "player:2": ["unit:2"],
      },
      citiesByPlayer: {
        "player:1": ["city:1"],
      },
    },
    requirementsByPlayer: {
      "player:1": {
        mandatory: [{ actionType: "ChooseResearch" }],
        optional: [{ actionType: "ActiveUnit", valueStableId: "unit:1" }],
      },
    },
    ...overrides,
  };
}

function makeDelta(
  base: number,
  target: number,
  patches: DeltaEnvelope["patches"] = [],
  overrides: Partial<DeltaEnvelope> = {}
): DeltaEnvelope {
  return {
    protocolVersion: PROTOCOL_VERSION,
    matchId: "match:test",
    baseVersion: base,
    targetVersion: target,
    patches,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RendererStore — initial state", () => {
  it("is not hydrated before first snapshot", () => {
    const store = new RendererStore();
    expect(store.isHydrated).toBe(false);
    expect(store.stateVersion).toBe(0);
    expect(store.matchId).toBeUndefined();
    expect(store.turn).toBeUndefined();
    expect(store.checksum).toBeUndefined();
  });

  it("applyDelta returns unhydrated error when no snapshot loaded", () => {
    const store = new RendererStore();
    const result = store.applyDelta(makeDelta(1, 2));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("unhydrated");
    }
  });
});

describe("RendererStore — hydration", () => {
  it("hydrate sets stateVersion, matchId, turn, checksum", () => {
    const store = new RendererStore();
    store.hydrate(makeSnapshot());
    expect(store.isHydrated).toBe(true);
    expect(store.stateVersion).toBe(1);
    expect(store.matchId).toBe("match:test");
    expect(store.turn).toBe(1);
    expect(store.checksum).toBe("abc123");
  });

  it("hydrate deep-copies entities — mutations in store do not affect original", () => {
    const snap = makeSnapshot();
    const store = new RendererStore();
    store.hydrate(snap);
    store.applyDelta(makeDelta(1, 2, [{ op: "set", path: "entities.units.unit:1.health", value: 5 }]));
    // Original snapshot is unchanged
    expect((snap.entities.units["unit:1"] as { health: number }).health).toBe(10);
  });

  it("re-hydrating clears previous state and delta window", () => {
    const store = new RendererStore();
    store.hydrate(makeSnapshot({ matchId: "match:old", stateVersion: 10 }));
    store.applyDelta(makeDelta(10, 11, [], { matchId: "match:old" }));
    expect(store.deltaWindowSize).toBe(1);

    store.hydrate(makeSnapshot({ matchId: "match:new", stateVersion: 1 }));
    expect(store.matchId).toBe("match:new");
    expect(store.stateVersion).toBe(1);
    expect(store.deltaWindowSize).toBe(0);
  });
});

describe("RendererStore — entity lookups", () => {
  let store: RendererStore;

  beforeEach(() => {
    store = new RendererStore();
    store.hydrate(makeSnapshot());
  });

  it("getEntity returns correct entity state", () => {
    const unit = store.getEntity("units", "unit:1");
    expect(unit).toMatchObject({ type: "Warrior", playerId: "player:1", health: 10 });
  });

  it("getEntity returns undefined for missing table", () => {
    expect(store.getEntity("tiles", "tile:0:0")).toBeUndefined();
  });

  it("getEntity returns undefined for missing entity within existing table", () => {
    expect(store.getEntity("units", "unit:999")).toBeUndefined();
  });

  it("listTable returns all entities in a table", () => {
    const units = store.listTable("units");
    expect(Object.keys(units)).toHaveLength(2);
    expect(units["unit:1"]).toMatchObject({ type: "Warrior" });
    expect(units["unit:2"]).toMatchObject({ type: "Settler" });
  });

  it("listTable returns empty object for missing table", () => {
    expect(store.listTable("nonexistent")).toEqual({});
  });

  it("listTableIds returns correct IDs", () => {
    expect(store.listTableIds("units").sort()).toEqual(["unit:1", "unit:2"]);
  });

  it("getEntityTableNames returns all tables", () => {
    expect(store.getEntityTableNames().sort()).toEqual(["cities", "units"]);
  });
});

describe("RendererStore — index lookups", () => {
  let store: RendererStore;

  beforeEach(() => {
    store = new RendererStore();
    store.hydrate(makeSnapshot());
  });

  it("lookupIndex returns IDs for a specific key", () => {
    expect(store.lookupIndex("unitsByPlayer", "player:1")).toEqual(["unit:1"]);
    expect(store.lookupIndex("unitsByPlayer", "player:2")).toEqual(["unit:2"]);
  });

  it("lookupIndex returns empty array for missing key", () => {
    expect(store.lookupIndex("unitsByPlayer", "player:999")).toEqual([]);
  });

  it("lookupIndex returns empty array for missing index", () => {
    expect(store.lookupIndex("tilesByPlayer", "player:1")).toEqual([]);
  });

  it("getIndex returns full index map", () => {
    expect(store.getIndex("citiesByPlayer")).toEqual({ "player:1": ["city:1"] });
  });

  it("getIndex returns empty object for missing index", () => {
    expect(store.getIndex("missing")).toEqual({});
  });
});

describe("RendererStore — action descriptor accessors", () => {
  let store: RendererStore;

  beforeEach(() => {
    store = new RendererStore();
    store.hydrate(
      makeSnapshot({
        actionsByPlayer: {
          "player:1": [
            { tier: "player", actionType: "ChooseResearch", mandatory: true },
          ],
        },
        unitActionsById: {
          "unit:1": [
            { tier: "unit", actionType: "Move", mandatory: false, fromTileId: "0:0", toTileId: "1:0" },
          ],
        },
      })
    );
  });

  it("getRequirementsForPlayer returns correct requirement state", () => {
    const reqs = store.getRequirementsForPlayer("player:1");
    expect(reqs?.mandatory).toHaveLength(1);
    expect(reqs?.mandatory[0].actionType).toBe("ChooseResearch");
  });

  it("getRequirementsForPlayer returns undefined for missing player", () => {
    expect(store.getRequirementsForPlayer("player:999")).toBeUndefined();
  });

  it("getActionsForPlayer returns player action descriptors", () => {
    const actions = store.getActionsForPlayer("player:1");
    expect(actions).toHaveLength(1);
    expect(actions[0].actionType).toBe("ChooseResearch");
  });

  it("getActionsForPlayer returns empty array for missing player", () => {
    expect(store.getActionsForPlayer("player:999")).toEqual([]);
  });

  it("getUnitActions returns unit action descriptors", () => {
    const actions = store.getUnitActions("unit:1");
    expect(actions).toHaveLength(1);
    expect(actions[0].actionType).toBe("Move");
    expect(actions[0].fromTileId).toBe("0:0");
  });

  it("getUnitActions returns empty array for unknown unit", () => {
    expect(store.getUnitActions("unit:999")).toEqual([]);
  });
});

describe("RendererStore — delta application: patch ops", () => {
  let store: RendererStore;

  beforeEach(() => {
    store = new RendererStore();
    store.hydrate(makeSnapshot());
  });

  it("set: updates a scalar entity field", () => {
    const result = store.applyDelta(makeDelta(1, 2, [
      { op: "set", path: "entities.units.unit:1.health", value: 5 },
    ]));
    expect(result.ok).toBe(true);
    expect(store.getEntity("units", "unit:1")?.health).toBe(5);
    expect(store.stateVersion).toBe(2);
  });

  it("set: creates a new entity in an existing table", () => {
    store.applyDelta(makeDelta(1, 2, [
      { op: "set", path: "entities.units.unit:99", value: { playerId: "player:1", type: "Cannon", x: 9, y: 9, health: 8 } },
    ]));
    const unit = store.getEntity("units", "unit:99");
    expect(unit).toMatchObject({ type: "Cannon" });
  });

  it("set: creates a new table", () => {
    store.applyDelta(makeDelta(1, 2, [
      { op: "set", path: "entities.tiles.0:0", value: { terrain: "Grassland" } },
    ]));
    expect(store.getEntity("tiles", "0:0")).toMatchObject({ terrain: "Grassland" });
    expect(store.getEntityTableNames()).toContain("tiles");
  });

  it("remove: removes an entity from a table", () => {
    store.applyDelta(makeDelta(1, 2, [
      { op: "remove", path: "entities.units.unit:2" },
    ]));
    expect(store.getEntity("units", "unit:2")).toBeUndefined();
    expect(Object.keys(store.listTable("units"))).toHaveLength(1);
  });

  it("arrayPush: appends to an index key", () => {
    store.applyDelta(makeDelta(1, 2, [
      { op: "arrayPush", path: "indexes.unitsByPlayer.player:1", value: "unit:99" },
    ]));
    expect(store.lookupIndex("unitsByPlayer", "player:1")).toEqual(["unit:1", "unit:99"]);
  });

  it("arrayPush: creates index key array when missing", () => {
    store.applyDelta(makeDelta(1, 2, [
      { op: "arrayPush", path: "indexes.unitsByPlayer.player:3", value: "unit:99" },
    ]));
    expect(store.lookupIndex("unitsByPlayer", "player:3")).toEqual(["unit:99"]);
  });

  it("arrayRemoveItem: removes a specific ID from an index key", () => {
    // First push an extra unit into player:1's index
    store.applyDelta(makeDelta(1, 2, [
      { op: "arrayPush", path: "indexes.unitsByPlayer.player:1", value: "unit:99" },
    ]));
    store.applyDelta(makeDelta(2, 3, [
      { op: "arrayRemoveItem", path: "indexes.unitsByPlayer.player:1", value: "unit:1" },
    ]));
    expect(store.lookupIndex("unitsByPlayer", "player:1")).toEqual(["unit:99"]);
  });

  it("resultChecksum is updated when provided", () => {
    store.applyDelta(makeDelta(1, 2, [], { resultChecksum: "deadbeef" }));
    expect(store.checksum).toBe("deadbeef");
  });

  it("checksum stays unchanged when not provided in delta", () => {
    const original = store.checksum;
    store.applyDelta(makeDelta(1, 2, [{ op: "set", path: "turn", value: 2 }]));
    expect(store.checksum).toBe(original);
  });
});

describe("RendererStore — delta rejection", () => {
  let store: RendererStore;

  beforeEach(() => {
    store = new RendererStore();
    store.hydrate(makeSnapshot());
  });

  it("rejects delta with wrong matchId", () => {
    const result = store.applyDelta(makeDelta(1, 2, [], { matchId: "match:wrong" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("mismatch");
  });

  it("rejects stale delta (baseVersion < stateVersion)", () => {
    store.applyDelta(makeDelta(1, 2));
    const result = store.applyDelta(makeDelta(1, 2)); // already applied
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("stale");
  });

  it("rejects delta with gap (baseVersion > stateVersion)", () => {
    const result = store.applyDelta(makeDelta(3, 4)); // we're at v1, delta wants v3
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("gap");
  });
});

describe("RendererStore — sequential deltas", () => {
  it("applies a sequence of deltas in order", () => {
    const store = new RendererStore();
    store.hydrate(makeSnapshot({ stateVersion: 1, turn: 1 }));

    store.applyDelta(makeDelta(1, 2, [{ op: "set", path: "turn", value: 2 }]));
    store.applyDelta(makeDelta(2, 3, [{ op: "set", path: "entities.units.unit:1.health", value: 8 }]));
    store.applyDelta(makeDelta(3, 4, [{ op: "set", path: "entities.units.unit:1.health", value: 6 }]));

    expect(store.stateVersion).toBe(4);
    expect(store.turn).toBe(2);
    expect(store.getEntity("units", "unit:1")?.health).toBe(6);
  });
});

describe("RendererStore — delta window / catch-up", () => {
  it("holds applied deltas in window (up to max)", () => {
    const store = new RendererStore({ maxDeltaWindow: 4 });
    store.hydrate(makeSnapshot({ stateVersion: 0 }));

    for (let i = 0; i < 6; i++) {
      store.applyDelta(makeDelta(i, i + 1));
    }

    // Window is bounded to 4
    expect(store.deltaWindowSize).toBe(4);
  });

  it("getDeltasFrom returns deltas from a given base version", () => {
    const store = new RendererStore();
    store.hydrate(makeSnapshot({ stateVersion: 0 }));
    for (let i = 0; i < 5; i++) {
      store.applyDelta(makeDelta(i, i + 1));
    }
    const catchup = store.getDeltasFrom(2);
    expect(catchup).not.toBeNull();
    expect(catchup!.map((d) => d.baseVersion)).toEqual([2, 3, 4]);
  });

  it("getDeltasFrom returns null when the window doesn't cover the requested version", () => {
    const store = new RendererStore({ maxDeltaWindow: 3 });
    store.hydrate(makeSnapshot({ stateVersion: 0 }));
    for (let i = 0; i < 10; i++) {
      store.applyDelta(makeDelta(i, i + 1));
    }
    // Oldest retained delta has baseVersion = 7 (10 total, window=3 → [7,8,9])
    expect(store.getDeltasFrom(0)).toBeNull();
  });

  it("getDeltasFrom returns null when no deltas in window", () => {
    const store = new RendererStore();
    store.hydrate(makeSnapshot());
    expect(store.getDeltasFrom(1)).toBeNull();
  });

  it("re-hydration resets delta window", () => {
    const store = new RendererStore();
    store.hydrate(makeSnapshot({ stateVersion: 0 }));
    store.applyDelta(makeDelta(0, 1));
    expect(store.deltaWindowSize).toBe(1);
    store.hydrate(makeSnapshot({ stateVersion: 0 }));
    expect(store.deltaWindowSize).toBe(0);
  });
});

describe("RendererStore — memory: bounded growth under long replay", () => {
  it("delta window does not grow unboundedly over many deltas", () => {
    const store = new RendererStore({ maxDeltaWindow: 128 });
    store.hydrate(makeSnapshot({ stateVersion: 0 }));

    const ITERATIONS = 1_000;
    for (let i = 0; i < ITERATIONS; i++) {
      store.applyDelta(makeDelta(i, i + 1));
    }

    expect(store.deltaWindowSize).toBe(128);
    expect(store.stateVersion).toBe(ITERATIONS);
  });
});

