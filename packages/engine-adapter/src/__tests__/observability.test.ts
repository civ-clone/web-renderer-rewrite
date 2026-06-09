import { describe, expect, it } from "vitest";
import { PROTOCOL_VERSION, type SnapshotEnvelope } from "@civ-clone/protocol-state";
import { SnapshotExporter } from "../snapshot-exporter.js";
import { DeltaExporter } from "../delta-exporter.js";
import { InMemoryObservabilitySink } from "../observability.js";
import { buildMigrationParityReport } from "../migration-parity-report.js";

function makeSnapshot(overrides: Partial<SnapshotEnvelope> = {}): SnapshotEnvelope {
  return {
    protocolVersion: PROTOCOL_VERSION,
    matchId: "match:obs",
    stateVersion: 1,
    turn: 1,
    entities: {},
    indexes: {},
    requirementsByPlayer: {},
    checksum: "checksum-1",
    ...overrides,
  };
}

function makePlayer() {
  return {
    id: () => "Player-1",
    getStableId: () => "player:1",
    actions: () => [] as never[],
  };
}

function makeUnit(player: ReturnType<typeof makePlayer>) {
  return {
    id: () => "Unit-1",
    getStableId: () => "unit:42:3",
    player: () => player,
    tile: () => ({ x: () => 3, y: () => 4 }),
    actions: () => [] as never[],
    actionsForNeighbours: () => ({} as Record<string, never[]>),
  };
}

function makeCity(player: ReturnType<typeof makePlayer>) {
  return {
    id: () => "City-1",
    getStableId: () => "city:alpha",
    player: () => player,
  };
}

describe("observability integration", () => {
  it("SnapshotExporter emits snapshot.exported", () => {
    const sink = new InMemoryObservabilitySink();

    new SnapshotExporter().buildSnapshot({
      matchId: "match:obs",
      stateVersion: 1,
      turn: 1,
      getPlayers: () => [],
      getUnits: () => [],
      getCities: () => [],
      observability: sink,
    });

    expect(sink.events().map((event) => event.type)).toContain("snapshot.exported");
  });

  it("DeltaExporter emits delta.exported", () => {
    const sink = new InMemoryObservabilitySink();
    const previous = makeSnapshot({ stateVersion: 1, checksum: "a" });
    const next = makeSnapshot({ stateVersion: 2, checksum: "b" });

    new DeltaExporter().buildDelta(previous, next, sink);

    expect(sink.events().map((event) => event.type)).toContain("delta.exported");
  });

  it("SnapshotExporter emits migration shadow events for units and cities", () => {
    const sink = new InMemoryObservabilitySink();
    const player = makePlayer();
    const unit = makeUnit(player);
    const city = makeCity(player);

    new SnapshotExporter().buildSnapshot({
      matchId: "match:obs",
      stateVersion: 2,
      turn: 2,
      getPlayers: () => [player],
      getUnits: () => [unit],
      getCities: () => [city],
      observability: sink,
      cutover: { units: "shadow", cities: "shadow" },
      toUnitRecord: () => ({ hp: 10 }),
      unitsAdapter: {
        toUnitRecord: () => ({ hp: 20 }),
        describeUnitActions: () => [],
        resolveUnitActions: (_command, actions) => actions,
      },
      toCityRecord: () => ({ pop: 3 }),
      citiesAdapter: {
        toCityRecord: () => ({ pop: 4 }),
      },
    });

    const types = sink.events().map((event) => event.type);
    expect(types).toContain("migration.shadow.units");
    expect(types).toContain("migration.shadow.cities");

    const cityShadow = sink
      .events()
      .find((event) => event.type === "migration.shadow.cities");
    expect(cityShadow?.payload).toMatchObject({
      parityMatched: false,
      mismatchType: "record",
    });

    const report = buildMigrationParityReport(sink.events());
    expect(report.bySubsystem.units.mismatched).toBeGreaterThanOrEqual(1);
    expect(report.bySubsystem.cities.mismatched).toBe(1);
  });
});

