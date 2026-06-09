import { describe, expect, it } from "vitest";
import { PROTOCOL_VERSION, type SnapshotEnvelope } from "@civ-clone/protocol-state";
import { buildActionManifest } from "../action-manifest.js";

function makeSnapshot(overrides: Partial<SnapshotEnvelope> = {}): SnapshotEnvelope {
  return {
    protocolVersion: PROTOCOL_VERSION,
    matchId: "match:1",
    stateVersion: 1,
    turn: 1,
    entities: {},
    indexes: {},
    requirementsByPlayer: {},
    checksum: "checksum",
    ...overrides,
  };
}

describe("buildActionManifest", () => {
  it("deduplicates equivalent descriptors", () => {
    const manifest = buildActionManifest(
      makeSnapshot({
        actionsByPlayer: {
          "player:1": [
            {
              tier: "player",
              actionType: "ChooseResearch",
              mandatory: true,
              valueType: "PlayerResearch",
              valueStableId: "tech:bronze-working",
            },
          ],
          "player:2": [
            {
              tier: "player",
              actionType: "ChooseResearch",
              mandatory: true,
              valueType: "PlayerResearch",
              valueStableId: "tech:iron-working",
            },
          ],
        },
      })
    );

    expect(manifest.entries).toHaveLength(1);
    expect(manifest.entries[0]).toMatchObject({
      tier: "player",
      actionType: "ChooseResearch",
      mandatory: true,
      valueType: "PlayerResearch",
      requiresValueRef: true,
    });
  });

  it("returns stable sorted output", () => {
    const manifest = buildActionManifest(
      makeSnapshot({
        actionsByPlayer: {
          "player:1": [
            {
              tier: "player",
              actionType: "InactiveUnit",
              mandatory: false,
              valueType: "Unit",
              valueId: "Unit-1",
            },
            {
              tier: "player",
              actionType: "ChooseResearch",
              mandatory: true,
              valueType: "PlayerResearch",
              valueId: "PlayerResearch-1",
            },
          ],
        },
        unitActionsById: {
          "unit:1": [
            {
              tier: "unit",
              actionType: "Move",
              mandatory: false,
              unitStableId: "unit:1",
              fromTileId: "1:1",
              toTileId: "2:1",
            },
            {
              tier: "unit",
              actionType: "Fortify",
              mandatory: false,
              unitStableId: "unit:1",
              fromTileId: "1:1",
            },
          ],
        },
      })
    );

    expect(manifest.entries.map((entry) => `${entry.tier}:${entry.actionType}`)).toEqual([
      "player:ChooseResearch",
      "player:InactiveUnit",
      "unit:Fortify",
      "unit:Move",
    ]);
  });

  it("derives metadata flags from descriptor refs", () => {
    const manifest = buildActionManifest(
      makeSnapshot({
        actionsByPlayer: {
          "player:1": [
            {
              tier: "player",
              actionType: "EndTurn",
              mandatory: true,
            },
            {
              tier: "player",
              actionType: "ChooseResearch",
              mandatory: true,
              valueType: "PlayerResearch",
              valueStableId: "tech:bronze-working",
            },
          ],
        },
        unitActionsById: {
          "unit:1": [
            {
              tier: "unit",
              actionType: "Move",
              mandatory: false,
              unitStableId: "unit:1",
              fromTileId: "1:1",
              toTileId: "2:1",
            },
            {
              tier: "unit",
              actionType: "Fortify",
              mandatory: false,
              unitStableId: "unit:1",
              fromTileId: "1:1",
            },
          ],
        },
      })
    );

    expect(manifest.entries).toContainEqual({
      tier: "player",
      actionType: "EndTurn",
      mandatory: true,
      valueType: undefined,
      requiresValueRef: false,
      requiresUnitRef: false,
      requiresFromTileRef: false,
      requiresToTileRef: false,
    });

    expect(manifest.entries).toContainEqual({
      tier: "player",
      actionType: "ChooseResearch",
      mandatory: true,
      valueType: "PlayerResearch",
      requiresValueRef: true,
      requiresUnitRef: false,
      requiresFromTileRef: false,
      requiresToTileRef: false,
    });

    expect(manifest.entries).toContainEqual({
      tier: "unit",
      actionType: "Move",
      mandatory: false,
      valueType: undefined,
      requiresValueRef: false,
      requiresUnitRef: true,
      requiresFromTileRef: true,
      requiresToTileRef: true,
    });

    expect(manifest.entries).toContainEqual({
      tier: "unit",
      actionType: "Fortify",
      mandatory: false,
      valueType: undefined,
      requiresValueRef: false,
      requiresUnitRef: true,
      requiresFromTileRef: true,
      requiresToTileRef: false,
    });
  });
});

