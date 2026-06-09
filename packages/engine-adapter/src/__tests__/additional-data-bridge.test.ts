import { describe, expect, it } from "vitest";
import { buildAdditionalDataBridge } from "../additional-data-bridge.js";

describe("buildAdditionalDataBridge", () => {
  it("builds deterministic normalized entities and indexes", () => {
    const result = buildAdditionalDataBridge({
      entities: {
        worlds: {
          b: { v: 2 },
          a: { v: 1 },
        },
      },
      indexes: {
        worldsByPlayer: {
          "player:2": ["world:b"],
          "player:1": ["world:a"],
        },
      },
    });

    expect(Object.keys(result.entities)).toEqual(["worlds"]);
    expect(Object.keys(result.entities.worlds)).toEqual(["a", "b"]);
    expect(Object.keys(result.indexes.worldsByPlayer)).toEqual([
      "player:1",
      "player:2",
    ]);
  });

  it("rejects protected core table/index collisions by default", () => {
    expect(() =>
      buildAdditionalDataBridge({
        entities: { players: { "player:1": {} } },
        options: { protectedEntityTables: ["players"] },
      })
    ).toThrow();

    expect(() =>
      buildAdditionalDataBridge({
        indexes: { unitsByPlayer: { "player:1": ["unit:1"] } },
        options: { protectedIndexes: ["unitsByPlayer"] },
      })
    ).toThrow();
  });

  it("allows protected collisions when explicitly configured", () => {
    const result = buildAdditionalDataBridge({
      entities: { players: { "player:mod": { test: true } } },
      options: {
        protectedEntityTables: ["players"],
        allowProtectedOverride: true,
      },
    });

    expect(result.entities.players["player:mod"]).toEqual({ test: true });
  });
});

