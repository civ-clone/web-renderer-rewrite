import { describe, expect, it } from "vitest";
import { DefaultCitiesMigrationAdapter } from "../cities-migration-adapter.js";

function makeCity() {
  const player = { id: () => "Player-1", getStableId: () => "player:1" };
  return {
    id: () => "City-1",
    getStableId: () => "city:alpha",
    player: () => player,
  };
}

describe("DefaultCitiesMigrationAdapter", () => {
  it("serializes city record with stable references", () => {
    const adapter = new DefaultCitiesMigrationAdapter();
    const record = adapter.toCityRecord(makeCity());

    expect(record).toEqual({
      cityId: "City-1",
      cityStableId: "city:alpha",
      playerId: "player:1",
      entityId: "city:alpha",
    });
  });
});

