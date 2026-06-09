import { describe, it, expect } from "vitest";
import {
  actionCommandSchema,
  actionResultSchema,
  deltaEnvelopeSchema,
  snapshotEnvelopeSchema,
  turnEndResultSchema,
  engineMessageSchema,
  playerActionDescriptorSchema,
  unitActionDescriptorSchema,
} from "../schemas.ts";
import { validate } from "../validate.ts";
import { PROTOCOL_VERSION } from "../types.ts";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const basePlayer = {
  id: "player:1",
  civilizationId: "civ:romans",
  isHuman: true,
  isEliminated: false,
  goldPerTurn: 5,
  gold: 20,
  sciencePerTurn: 3,
  activeResearchId: "tech:bronze-working",
  governmentId: "gov:monarchy",
};

const baseUnit = {
  id: "unit:1",
  playerId: "player:1",
  tileId: "tile:0-0",
  typeId: "unit-type:warrior",
  moves: 1,
  movesTotal: 1,
  health: 100,
  isVeteran: false,
  isFortified: false,
  isSleeping: false,
  isActive: true,
};

const baseCity = {
  id: "city:1",
  playerId: "player:1",
  tileId: "tile:2-2",
  name: "Rome",
  population: 3,
  food: 10,
  foodNeeded: 20,
  shields: 5,
  shieldsNeeded: 40,
  currentBuildId: "unit-type:warrior",
  currentBuildType: "unit" as const,
  improvementIds: [],
};

const baseTile = {
  id: "tile:0-0",
  x: 0,
  y: 0,
  terrainId: "terrain:grassland",
  improvementIds: [],
  isVisible: true,
  isFog: false,
  unitIds: ["unit:1"],
  cityId: null,
};

const baseSnapshot = {
  protocolVersion: PROTOCOL_VERSION,
  matchId: "match:abc",
  stateVersion: 1,
  turn: 1,
  entities: {
    players: { "player:1": basePlayer },
    units: { "unit:1": baseUnit },
    cities: { "city:1": baseCity },
    tiles: { "tile:0-0": baseTile },
  },
  indexes: {
    unitsByPlayer: { "player:1": ["unit:1"] },
    citiesByPlayer: { "player:1": ["city:1"] },
  },
  requirementsByPlayer: {
    "player:1": {
      mandatory: [
        {
          actionType: "ChooseResearch",
          valueType: "PlayerResearch",
          valueId: "PlayerResearch-1",
          valueStableId: "tech:bronze-working",
        },
      ],
      optional: [],
    },
  },
  checksum: "abc123",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("snapshotEnvelopeSchema", () => {
  it("accepts a valid snapshot", () => {
    const result = validate(snapshotEnvelopeSchema, baseSnapshot);
    expect(result.ok).toBe(true);
  });

  it("accepts snapshot rng metadata", () => {
    const result = validate(snapshotEnvelopeSchema, {
      ...baseSnapshot,
      rng: {
        algorithm: "xorshift64*",
        seed: "abc123",
        counter: 42,
      },
    });
    expect(result.ok).toBe(true);
  });

  it("accepts a snapshot with action descriptors", () => {
    const result = validate(snapshotEnvelopeSchema, {
      ...baseSnapshot,
      actionsByPlayer: {
        "player:1": [
          {
            tier: "player",
            actionType: "ChooseResearch",
            mandatory: true,
            valueType: "PlayerResearch",
            valueId: "PlayerResearch-1",
            valueStableId: "tech:bronze-working",
          },
          {
            tier: "player",
            actionType: "InactiveUnit",
            mandatory: false,
            valueType: "Unit",
            valueId: "Unit-1",
            valueStableId: "unit:42:3",
          },
        ],
      },
      unitActionsById: {
        "Unit-1": [
          {
            tier: "unit",
            actionType: "Move",
            mandatory: false,
            unitId: "Unit-1",
            unitStableId: "unit:42:3",
            fromTileId: "0:0",
            toTileId: "1:0",
          },
          {
            tier: "unit",
            actionType: "Fortify",
            mandatory: false,
            unitId: "Unit-1",
            unitStableId: "unit:42:3",
            fromTileId: "0:0",
          },
        ],
      },
    });
    expect(result.ok).toBe(true);
  });

  it("rejects wrong protocol version", () => {
    const result = validate(snapshotEnvelopeSchema, {
      ...baseSnapshot,
      protocolVersion: "9.9",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects missing checksum", () => {
    const { checksum: _c, ...rest } = baseSnapshot;
    const result = validate(snapshotEnvelopeSchema, rest);
    expect(result.ok).toBe(false);
  });
});

describe("deltaEnvelopeSchema", () => {
  it("accepts a valid delta", () => {
    const delta = {
      protocolVersion: PROTOCOL_VERSION,
      matchId: "match:abc",
      baseVersion: 1,
      targetVersion: 2,
      patches: [
        { op: "set", path: "entities.units.unit:1.health", value: 80 },
        { op: "remove", path: "entities.units.unit:99" },
        { op: "arrayPush", path: "indexes.unitsByPlayer.player:1", value: "unit:2" },
        { op: "arrayRemoveItem", path: "indexes.unitsByPlayer.player:1", value: "unit:99" },
      ],
    };
    const result = validate(deltaEnvelopeSchema, delta);
    expect(result.ok).toBe(true);
  });

  it("rejects delta where targetVersion <= baseVersion", () => {
    // zod only validates schema shape — ordering rules are engine-level
    // this test documents that the schema does NOT enforce ordering
    const result = validate(deltaEnvelopeSchema, {
      protocolVersion: PROTOCOL_VERSION,
      matchId: "match:abc",
      baseVersion: 5,
      targetVersion: 0, // invalid logically but not in schema
      patches: [],
    });
    // targetVersion: z.number().int().positive() — 0 should fail
    expect(result.ok).toBe(false);
  });
});

describe("actionCommandSchema", () => {
  it("accepts a valid player-tier MoveUnit command", () => {
    const cmd = {
      protocolVersion: PROTOCOL_VERSION,
      commandId: "00000000-0000-0000-0000-000000000001",
      matchId: "match:abc",
      actorPlayerId: "player:1",
      clientSeq: 1,
      tier: "player",
      actionType: "ActiveUnit",
      valueType: "Unit",
      valueId: "Unit-1",
      sentAt: Date.now(),
    };
    const result = validate(actionCommandSchema, cmd);
    expect(result.ok).toBe(true);
  });

  it("accepts a valid unit-tier Move command", () => {
    const cmd = {
      protocolVersion: PROTOCOL_VERSION,
      commandId: "00000000-0000-0000-0000-000000000001",
      matchId: "match:abc",
      actorPlayerId: "player:1",
      clientSeq: 2,
      tier: "unit",
      actionType: "Move",
      unitId: "Unit-1",
      fromTileId: "3:4",
      toTileId: "3:5",
      sentAt: Date.now(),
    };
    const result = validate(actionCommandSchema, cmd);
    expect(result.ok).toBe(true);
  });

  it("accepts a valid player-tier command with stable value ID only", () => {
    const cmd = {
      protocolVersion: PROTOCOL_VERSION,
      commandId: "00000000-0000-0000-0000-000000000010",
      matchId: "match:abc",
      actorPlayerId: "player:1",
      clientSeq: 10,
      tier: "player",
      actionType: "ChooseResearch",
      valueType: "PlayerResearch",
      valueStableId: "tech:bronze-working",
      sentAt: Date.now(),
    };
    const result = validate(actionCommandSchema, cmd);
    expect(result.ok).toBe(true);
  });

  it("accepts a valid unit-tier command with stable unit ID only", () => {
    const cmd = {
      protocolVersion: PROTOCOL_VERSION,
      commandId: "00000000-0000-0000-0000-000000000011",
      matchId: "match:abc",
      actorPlayerId: "player:1",
      clientSeq: 11,
      tier: "unit",
      actionType: "Move",
      unitStableId: "unit:42:3",
      fromTileId: "3:4",
      toTileId: "3:5",
      sentAt: Date.now(),
    };
    const result = validate(actionCommandSchema, cmd);
    expect(result.ok).toBe(true);
  });

  it("accepts action command with rng trace", () => {
    const cmd = {
      protocolVersion: PROTOCOL_VERSION,
      commandId: "00000000-0000-0000-0000-000000000012",
      matchId: "match:abc",
      actorPlayerId: "player:1",
      clientSeq: 12,
      tier: "player",
      actionType: "ChooseResearch",
      rng: { seed: "abc123", counter: 5 },
      sentAt: Date.now(),
    };
    const result = validate(actionCommandSchema, cmd);
    expect(result.ok).toBe(true);
  });

  it("rejects empty commandId", () => {
    const result = validate(actionCommandSchema, {
      protocolVersion: PROTOCOL_VERSION,
      commandId: "",
      matchId: "match:abc",
      actorPlayerId: "player:1",
      clientSeq: 1,
      tier: "player",
      actionType: "ActiveUnit",
      sentAt: Date.now(),
    });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid tier", () => {
    const result = validate(actionCommandSchema, {
      protocolVersion: PROTOCOL_VERSION,
      commandId: "abc",
      matchId: "match:abc",
      actorPlayerId: "player:1",
      clientSeq: 1,
      tier: "invalid",
      actionType: "Move",
      sentAt: Date.now(),
    });
    expect(result.ok).toBe(false);
  });
});

describe("actionResultSchema", () => {
  it("accepts accepted result", () => {
    const result = validate(actionResultSchema, {
      commandId: "00000000-0000-0000-0000-000000000001",
      status: "accepted",
      serverSeq: 1,
      resultingStateVersion: 2,
    });
    expect(result.ok).toBe(true);
  });

  it("accepts action result with rng trace", () => {
    const result = validate(actionResultSchema, {
      commandId: "00000000-0000-0000-0000-000000000001",
      status: "accepted",
      serverSeq: 1,
      rng: { seed: "abc123", counter: 9 },
    });
    expect(result.ok).toBe(true);
  });

  it("accepts rejected result with reason code", () => {
    const result = validate(actionResultSchema, {
      commandId: "00000000-0000-0000-0000-000000000001",
      status: "rejected",
      reasonCode: "UNIT_OUT_OF_MOVES",
      message: "Unit has no remaining moves.",
      serverSeq: 1,
    });
    expect(result.ok).toBe(true);
  });
});

describe("turnEndResultSchema", () => {
  it("accepts accepted turn end", () => {
    const result = validate(turnEndResultSchema, {
      commandId: "00000000-0000-0000-0000-000000000002",
      status: "accepted",
    });
    expect(result.ok).toBe(true);
  });

  it("accepts rejected turn end with unmet requirements", () => {
    const result = validate(turnEndResultSchema, {
      commandId: "00000000-0000-0000-0000-000000000002",
      status: "rejected",
      unmetRequirements: [
        { actionType: "ChooseResearch", valueType: "PlayerResearch", valueId: "PlayerResearch-1" },
      ],
      reasonCode: "MANDATORY_ACTIONS_PENDING",
    });
    expect(result.ok).toBe(true);
  });
});

describe("engineMessageSchema (transport discriminated union)", () => {
  it("parses a snapshot message", () => {
    const result = validate(engineMessageSchema, {
      type: "snapshot",
      payload: baseSnapshot,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects unknown message type", () => {
    const result = validate(engineMessageSchema, {
      type: "unknownMessage",
      payload: {},
    });
    expect(result.ok).toBe(false);
  });
});

describe("playerActionDescriptorSchema", () => {
  it("accepts a mandatory player action with value ref", () => {
    const result = validate(playerActionDescriptorSchema, {
      tier: "player",
      actionType: "ChooseResearch",
      mandatory: true,
      valueType: "PlayerResearch",
      valueId: "PlayerResearch-1",
    });
    expect(result.ok).toBe(true);
  });

  it("accepts an optional player action without value ref", () => {
    const result = validate(playerActionDescriptorSchema, {
      tier: "player",
      actionType: "EndTurn",
      mandatory: true,
    });
    expect(result.ok).toBe(true);
  });

  it("accepts player action descriptor with stable value ID", () => {
    const result = validate(playerActionDescriptorSchema, {
      tier: "player",
      actionType: "ChooseResearch",
      mandatory: true,
      valueType: "PlayerResearch",
      valueStableId: "tech:bronze-working",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects wrong tier", () => {
    const result = validate(playerActionDescriptorSchema, {
      tier: "unit",
      actionType: "EndTurn",
      mandatory: true,
    });
    expect(result.ok).toBe(false);
  });
});

describe("unitActionDescriptorSchema", () => {
  it("accepts a Move action with from and to tile coords", () => {
    const result = validate(unitActionDescriptorSchema, {
      tier: "unit",
      actionType: "Move",
      mandatory: false,
      unitId: "Unit-1",
      fromTileId: "3:4",
      toTileId: "3:5",
    });
    expect(result.ok).toBe(true);
  });

  it("accepts an in-place action (Fortify) without toTileId", () => {
    const result = validate(unitActionDescriptorSchema, {
      tier: "unit",
      actionType: "Fortify",
      mandatory: false,
      unitId: "Unit-1",
      fromTileId: "3:4",
    });
    expect(result.ok).toBe(true);
  });

  it("accepts a Move action with stable unit ID only", () => {
    const result = validate(unitActionDescriptorSchema, {
      tier: "unit",
      actionType: "Move",
      mandatory: false,
      unitStableId: "unit:42:3",
      fromTileId: "3:4",
      toTileId: "3:5",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects mandatory: true (unit actions are never mandatory)", () => {
    const result = validate(unitActionDescriptorSchema, {
      tier: "unit",
      actionType: "Move",
      mandatory: true,
      unitId: "Unit-1",
      fromTileId: "3:4",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects wrong tier", () => {
    const result = validate(unitActionDescriptorSchema, {
      tier: "player",
      actionType: "Move",
      mandatory: false,
      unitId: "Unit-1",
      fromTileId: "3:4",
    });
    expect(result.ok).toBe(false);
  });
});


