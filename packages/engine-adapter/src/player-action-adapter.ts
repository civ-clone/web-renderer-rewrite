/**
 * @civ-clone/engine-adapter — player action adapter
 *
 * Converts live PlayerAction<T> instances from the engine into
 * transport-safe PlayerActionDescriptor objects for the protocol.
 *
 * Design principles:
 * - Pure projection: engine state is read-only, no mutation occurs.
 * - Two IDs during transition (Finding 2 / WP-002b):
 *   - `valueId`:       ephemeral DataObject#id(), valid within a single session only.
 *   - `valueStableId`: stable ID (UUID / semantic), valid across save/load + replay.
 *                      Populated when the entity exposes `getStableId()` (WP-002b).
 */

import type { PlayerActionDescriptor } from "@civ-clone/protocol-state";

type EnginePlayerAction = {
  constructor: { name: string; prototype?: object | null };
  value(): unknown;
};

type EnginePlayer = {
  actions(): EnginePlayerAction[];
};

function isMandatoryPlayerAction(action: EnginePlayerAction): boolean {
  let prototype = Object.getPrototypeOf(action);

  while (prototype && prototype.constructor) {
    if (prototype.constructor.name === "MandatoryPlayerAction") {
      return true;
    }

    prototype = Object.getPrototypeOf(prototype);
  }

  return false;
}

/**
 * Convert a single live PlayerAction to a transport-safe PlayerActionDescriptor.
 *
 * - `actionType`     <- action class constructor name (e.g. "ChooseResearch")
 * - `mandatory`      <- true when action inherits from MandatoryPlayerAction
 * - `valueType`      <- value class constructor name (e.g. "PlayerResearch"), if any
 * - `valueId`        <- ephemeral DataObject#id() of the value (transition period)
 * - `valueStableId`  <- stable ID if entity exposes getStableId() (added in WP-002b)
 */
export function describePlayerAction(
  action: EnginePlayerAction
): PlayerActionDescriptor {
  const actionType = action.constructor.name;
  const mandatory = isMandatoryPlayerAction(action);

  const value: unknown = action.value();

  let valueType: string | undefined;
  let valueId: string | undefined;
  let valueStableId: string | undefined;

  if (value != null && typeof value === "object") {
    valueType = value.constructor?.name;

    const asRecord = value as Record<string, unknown>;
    if (typeof asRecord["id"] === "function") {
      valueId = (value as { id(): string }).id();
    }

    if (typeof asRecord["getStableId"] === "function") {
      valueStableId = (value as { getStableId(): string }).getStableId();
    }
  }

  return {
    tier: "player",
    actionType,
    mandatory,
    valueType,
    valueId,
    valueStableId,
  };
}

/**
 * Convert all actions for a player to PlayerActionDescriptors.
 */
export function describePlayerActions(
  player: EnginePlayer
): PlayerActionDescriptor[] {
  return player.actions().map(describePlayerAction);
}
