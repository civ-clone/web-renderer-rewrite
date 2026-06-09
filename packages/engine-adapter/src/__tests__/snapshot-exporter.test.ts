import { describe, it, expect } from "vitest";
import { PROTOCOL_VERSION } from "@civ-clone/protocol-state";
import { SnapshotExporter, type SnapshotExporterContext } from "../snapshot-exporter.js";

function makePlayer(id: string, stableId?: string) {
  return {
    id: () => id,
    getStableId: stableId ? () => stableId : undefined,
    actions: () => [] as never[],
  };
}

function makeUnit(id: string, player: ReturnType<typeof makePlayer>, stableId?: string) {
  return {
    id: () => id,
    getStableId: stableId ? () => stableId : undefined,
    player: () => player,
    tile: () => ({ x: () => 3, y: () => 4 }),
    actions: () => [] as never[],
    actionsForNeighbours: (_from: unknown) => ({} as Record<string, never[]>),
  };
}

function makeCity(id: string, player: ReturnType<typeof makePlayer>, stableId?: string) {
  return {
    id: () => id,
    getStableId: stableId ? () => stableId : undefined,
    player: () => player,
  };
}

function makeContext(overrides: Partial<SnapshotExporterContext> = {}): SnapshotExporterContext {
  return {
    matchId: "match-1",
    stateVersion: 1,
    turn: 3,
    getPlayers: () => [],
    getUnits: () => [],
    getCities: () => [],
    ...overrides,
  };
}

describe("SnapshotExporter — envelope structure", () => {
  it("includes required protocol metadata fields", () => {
    const snap = new SnapshotExporter().buildSnapshot(makeContext());

    expect(snap.protocolVersion).toBe(PROTOCOL_VERSION);
    expect(snap.matchId).toBe("match-1");
    expect(snap.stateVersion).toBe(1);
    expect(snap.turn).toBe(3);
  });

  it("includes optional rng metadata when provided", () => {
    const snap = new SnapshotExporter().buildSnapshot(
      makeContext({
        rng: {
          algorithm: "xorshift64*",
          seed: "abc123",
          counter: 7,
        },
      })
    );

    expect(snap.rng).toEqual({
      algorithm: "xorshift64*",
      seed: "abc123",
      counter: 7,
    });
  });

  it("includes a SHA-256 hex checksum", () => {
    const snap = new SnapshotExporter().buildSnapshot(makeContext());

    expect(snap.checksum).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces the same checksum for identical inputs (stability)", () => {
    const exporter = new SnapshotExporter();
    const player = makePlayer("player:1", "player:romans:abc");
    const ctx = makeContext({ getPlayers: () => [player] });

    expect(exporter.buildSnapshot(ctx).checksum).toBe(exporter.buildSnapshot(ctx).checksum);
  });

  it("produces a different checksum when turn changes", () => {
    const exporter = new SnapshotExporter();

    expect(exporter.buildSnapshot(makeContext({ turn: 1 })).checksum).not.toBe(
      exporter.buildSnapshot(makeContext({ turn: 2 })).checksum
    );
  });

  it("includes additional entity tables and indexes from provider hooks", () => {
    const snap = new SnapshotExporter().buildSnapshot(
      makeContext({
        getAdditionalEntityTables: () => ({
          worlds: {
            "world:player:1": { discoveredTileIds: ["0:0", "1:0"] },
          },
        }),
        getAdditionalIndexes: () => ({
          worldsByPlayer: {
            "player:1": ["world:player:1"],
          },
        }),
      })
    );

    expect(snap.entities["worlds"]["world:player:1"]).toEqual({
      discoveredTileIds: ["0:0", "1:0"],
    });
    expect(snap.indexes["worldsByPlayer"]["player:1"]).toEqual(["world:player:1"]);
  });

  it("produces stable checksum when additional providers return identical data", () => {
    const exporter = new SnapshotExporter();
    const context = makeContext({
      getAdditionalEntityTables: () => ({
        worlds: {
          "world:player:1": { discoveredTileIds: ["0:0"] },
        },
      }),
      getAdditionalIndexes: () => ({
        worldsByPlayer: {
          "player:1": ["world:player:1"],
        },
      }),
    });

    expect(exporter.buildSnapshot(context).checksum).toBe(
      exporter.buildSnapshot(context).checksum
    );
  });

  it("rejects additional providers that collide with protected core names", () => {
    const exporter = new SnapshotExporter();

    expect(() =>
      exporter.buildSnapshot(
        makeContext({
          getAdditionalEntityTables: () => ({
            players: {
              "player:mod": { test: true },
            },
          }),
        })
      )
    ).toThrow();

    expect(() =>
      exporter.buildSnapshot(
        makeContext({
          getAdditionalIndexes: () => ({
            unitsByPlayer: {
              "player:1": ["unit:x"],
            },
          }),
        })
      )
    ).toThrow();
  });
});

describe("SnapshotExporter — entities table", () => {
  it("uses ephemeral id as entity key when no stableId", () => {
    const player = makePlayer("Player-1");
    const snap = new SnapshotExporter().buildSnapshot(makeContext({ getPlayers: () => [player] }));

    expect(Object.keys(snap.entities["players"])).toContain("Player-1");
  });

  it("prefers stableId as entity key when available", () => {
    const player = makePlayer("Player-1", "player:romans:abc");
    const snap = new SnapshotExporter().buildSnapshot(makeContext({ getPlayers: () => [player] }));

    expect(Object.keys(snap.entities["players"])).toContain("player:romans:abc");
    expect(Object.keys(snap.entities["players"])).not.toContain("Player-1");
  });

  it("uses toPlayerRecord serializer when supplied", () => {
    const player = makePlayer("Player-1");
    const snap = new SnapshotExporter().buildSnapshot(
      makeContext({
        getPlayers: () => [player],
        toPlayerRecord: () => ({ gold: 42 }),
      })
    );

    expect(snap.entities["players"]["Player-1"]).toEqual({ gold: 42 });
  });

  it("defaults entity state to {} when no serializer provided", () => {
    const player = makePlayer("Player-1");
    const snap = new SnapshotExporter().buildSnapshot(makeContext({ getPlayers: () => [player] }));

    expect(snap.entities["players"]["Player-1"]).toEqual({});
  });

  it("populates entities.units for all units using stable IDs", () => {
    const player = makePlayer("Player-1");
    const unit1 = makeUnit("Unit-1", player, "unit:42:3");
    const unit2 = makeUnit("Unit-2", player, "unit:43:2");
    const snap = new SnapshotExporter().buildSnapshot(
      makeContext({ getPlayers: () => [player], getUnits: () => [unit1, unit2] })
    );

    expect(Object.keys(snap.entities["units"])).toContain("unit:42:3");
    expect(Object.keys(snap.entities["units"])).toContain("unit:43:2");
  });

  it("uses unitsAdapter serializer when units cutover mode is migrated", () => {
    const player = makePlayer("Player-1");
    const unit = makeUnit("Unit-1", player, "unit:42:3");
    const snap = new SnapshotExporter().buildSnapshot(
      makeContext({
        getPlayers: () => [player],
        getUnits: () => [unit],
        cutover: { units: "migrated" },
        unitsAdapter: {
          toUnitRecord: () => ({ migrated: true }),
          describeUnitActions: () => [],
          resolveUnitActions: (_command, actions) => actions,
        },
      })
    );

    expect(snap.entities["units"]["unit:42:3"]).toEqual({ migrated: true });
  });

  it("populates entities.cities for all cities", () => {
    const player = makePlayer("Player-1");
    const city = makeCity("City-1", player);
    const snap = new SnapshotExporter().buildSnapshot(
      makeContext({ getPlayers: () => [player], getCities: () => [city] })
    );

    expect(Object.keys(snap.entities["cities"])).toContain("City-1");
  });

  it("uses citiesAdapter serializer when cities cutover mode is migrated", () => {
    const player = makePlayer("Player-1");
    const city = makeCity("City-1", player, "city:alpha");
    const snap = new SnapshotExporter().buildSnapshot(
      makeContext({
        getPlayers: () => [player],
        getCities: () => [city],
        cutover: { cities: "migrated" },
        citiesAdapter: {
          toCityRecord: () => ({ migratedCity: true }),
        },
      })
    );

    expect(snap.entities["cities"]["city:alpha"]).toEqual({ migratedCity: true });
  });
});

describe("SnapshotExporter — indexes", () => {
  it("builds unitsByPlayer grouping units by player ID", () => {
    const p1 = makePlayer("p1", "player:romans:abc");
    const p2 = makePlayer("p2", "player:greeks:def");
    const u1 = makeUnit("u1", p1, "unit:10:1");
    const u2 = makeUnit("u2", p1, "unit:11:2");
    const u3 = makeUnit("u3", p2, "unit:20:1");
    const snap = new SnapshotExporter().buildSnapshot(
      makeContext({ getPlayers: () => [p1, p2], getUnits: () => [u1, u2, u3] })
    );

    expect(snap.indexes["unitsByPlayer"]["player:romans:abc"]).toContain("unit:10:1");
    expect(snap.indexes["unitsByPlayer"]["player:romans:abc"]).toContain("unit:11:2");
    expect(snap.indexes["unitsByPlayer"]["player:greeks:def"]).toContain("unit:20:1");
  });

  it("builds citiesByPlayer index", () => {
    const player = makePlayer("player:1");
    const city1 = makeCity("City-1", player);
    const city2 = makeCity("City-2", player);
    const snap = new SnapshotExporter().buildSnapshot(
      makeContext({ getPlayers: () => [player], getCities: () => [city1, city2] })
    );

    expect(snap.indexes["citiesByPlayer"]["player:1"]).toContain("City-1");
    expect(snap.indexes["citiesByPlayer"]["player:1"]).toContain("City-2");
  });
});

describe("SnapshotExporter — action descriptors", () => {
  it("includes empty actionsByPlayer by default when player has no actions", () => {
    const player = makePlayer("player:1");
    const snap = new SnapshotExporter().buildSnapshot(makeContext({ getPlayers: () => [player] }));

    expect(snap.actionsByPlayer).toBeDefined();
    expect(snap.actionsByPlayer!["player:1"]).toEqual([]);
  });

  it("propagates valueStableId into requirementsByPlayer", () => {
    class MandatoryPlayerAction {}
    class ChooseResearch extends MandatoryPlayerAction {
      value() {
        return {
          id: () => "PlayerResearch-1",
          getStableId: () => "tech:bronze-working",
        };
      }
    }

    const player = {
      id: () => "player:1",
      actions: () => [new ChooseResearch()],
    };

    const snap = new SnapshotExporter().buildSnapshot(
      makeContext({ getPlayers: () => [player] as never[] })
    );

    expect(snap.requirementsByPlayer["player:1"].mandatory[0].valueId).toBe(
      "PlayerResearch-1"
    );
    expect(
      snap.requirementsByPlayer["player:1"].mandatory[0].valueStableId
    ).toBe("tech:bronze-working");
  });

  it("omits actionsByPlayer when includeActionsByPlayer is false", () => {
    const snap = new SnapshotExporter().buildSnapshot(makeContext({ includeActionsByPlayer: false }));

    expect(snap.actionsByPlayer).toBeUndefined();
  });

  it("omits unitActionsById when includeUnitActionsById is false", () => {
    const snap = new SnapshotExporter().buildSnapshot(makeContext({ includeUnitActionsById: false }));

    expect(snap.unitActionsById).toBeUndefined();
  });

  it("includes actionManifest by default", () => {
    const player = makePlayer("player:1");
    const snap = new SnapshotExporter().buildSnapshot(makeContext({ getPlayers: () => [player] }));

    expect(snap.actionManifest).toBeDefined();
    expect(snap.actionManifest!.entries).toEqual([]);
  });

  it("omits actionManifest when includeActionManifest is false", () => {
    const snap = new SnapshotExporter().buildSnapshot(makeContext({ includeActionManifest: false }));

    expect(snap.actionManifest).toBeUndefined();
  });
});


