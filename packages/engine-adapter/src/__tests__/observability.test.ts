import { describe, expect, it } from "vitest";
import { PROTOCOL_VERSION, type SnapshotEnvelope } from "@civ-clone/protocol-state";
import { SnapshotExporter } from "../snapshot-exporter.js";
import { DeltaExporter } from "../delta-exporter.js";
import { InMemoryObservabilitySink } from "../observability.js";

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
});

