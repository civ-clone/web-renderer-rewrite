import type { ActionCommand, EntityState } from "@civ-clone/protocol-state";
import { describeUnitActions } from "./unit-action-adapter.js";
import type {
  MigrationUnit,
  MigrationUnitAction,
  UnitsMigrationAdapter,
} from "./migration-types.js";

function tileId(unit: MigrationUnit): string {
  const tile = unit.tile();
  return `${tile.x()}:${tile.y()}`;
}

function unitId(unit: MigrationUnit): string {
  return typeof unit.getStableId === "function" ? unit.getStableId() : unit.id();
}

function playerId(unit: MigrationUnit): string {
  const player = unit.player();
  return typeof player.getStableId === "function" ? player.getStableId() : player.id();
}

function actionSortKey(action: MigrationUnitAction): string {
  const from = action.from();
  const to = action.to();
  return `${action.constructor.name}|${from.x()}:${from.y()}|${to.x()}:${to.y()}|${unitId(action.unit())}`;
}

/**
 * WP-011 migrated units adapter.
 *
 * This adapter is deterministic and currently schema-compatible with existing
 * unit action descriptors, while adding a concrete unit entity serializer.
 */
export class DefaultUnitsMigrationAdapter implements UnitsMigrationAdapter {
  toUnitRecord(unit: MigrationUnit): EntityState {
    return {
      unitId: unit.id(),
      unitStableId: typeof unit.getStableId === "function" ? unit.getStableId() : undefined,
      playerId: playerId(unit),
      tileId: tileId(unit),
    };
  }

  describeUnitActions(unit: MigrationUnit) {
    return describeUnitActions(unit as never);
  }

  resolveUnitActions(
    _command: ActionCommand,
    legacyActions: MigrationUnitAction[]
  ): MigrationUnitAction[] {
    return [...legacyActions].sort((a, b) => actionSortKey(a).localeCompare(actionSortKey(b)));
  }
}

