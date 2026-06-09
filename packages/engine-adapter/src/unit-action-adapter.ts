/**
 * @civ-clone/engine-adapter — unit action adapter
 *
 * Converts live core-unit Action instances into transport-safe
 * UnitActionDescriptor objects for the protocol.
 *
 * Design principles:
 * - Pure projection: engine state is read-only, no mutation occurs.
 * - Tile IDs use the stable `"${x}:${y}"` coordinate format — always safe
 *   across sessions because tile coordinates are immutable world properties.
 * - Unit IDs follow the same two-ID transition strategy as player actions:
 *   - `unitId`:       ephemeral DataObject#id(), valid within a single session.
 *   - `unitStableId`: stable ID if the unit exposes getStableId() (WP-002b).
 */

import type { UnitActionDescriptor } from "@civ-clone/protocol-state";

type EngineTile = {
  x(): number;
  y(): number;
};

type EngineUnitAction = {
  constructor: { name: string };
  unit(): EngineUnit;
  from(): EngineTile;
  to(): EngineTile;
};

type EngineUnit = {
  id(): string;
  getStableId?: () => string;
  tile(): EngineTile;
  actions(): EngineUnitAction[];
  actionsForNeighbours(from: EngineTile): Record<string, EngineUnitAction[]>;
};

/**
 * Produce the stable tile ID for a tile.
 * Format: "${x}:${y}" — stable because tile coordinates never change after world gen.
 */
function tileCoordId(tile: EngineTile): string {
  return `${tile.x()}:${tile.y()}`;
}

/**
 * Convert a single live unit Action to a transport-safe UnitActionDescriptor.
 */
export function describeUnitAction(action: EngineUnitAction): UnitActionDescriptor {
  const actionType = action.constructor.name;
  const unit = action.unit();
  const from = action.from();
  const to = action.to();

  const fromTileId = tileCoordId(from);
  const inPlace = from.x() === to.x() && from.y() === to.y();
  const toTileId = inPlace ? undefined : tileCoordId(to);

  const unitId = unit.id();
  const unitStableId =
    typeof unit.getStableId === "function" ? unit.getStableId() : undefined;

  return {
    tier: "unit",
    actionType,
    mandatory: false,
    unitId,
    unitStableId,
    fromTileId,
    toTileId,
  };
}

/**
 * Describe all available unit actions for a unit.
 */
export function describeUnitActions(unit: EngineUnit): UnitActionDescriptor[] {
  const currentTile = unit.tile();
  const inPlaceActions = unit.actions().map(describeUnitAction);
  const neighbourActions = Object.values(unit.actionsForNeighbours(currentTile))
    .flat()
    .map(describeUnitAction);

  return [...inPlaceActions, ...neighbourActions];
}
