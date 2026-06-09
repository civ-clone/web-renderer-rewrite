import type { EntityState } from "@civ-clone/protocol-state";
import type {
  CitiesMigrationAdapter,
  MigrationCity,
} from "./migration-types.js";

function cityId(city: MigrationCity): string {
  return typeof city.getStableId === "function" ? city.getStableId() : city.id();
}

function playerId(city: MigrationCity): string {
  const player = city.player();
  return typeof player.getStableId === "function" ? player.getStableId() : player.id();
}

/**
 * WP-011 migrated cities adapter.
 *
 * Provides deterministic city record serialization for cutover and parity checks.
 */
export class DefaultCitiesMigrationAdapter implements CitiesMigrationAdapter {
  toCityRecord(city: MigrationCity): EntityState {
    return {
      cityId: city.id(),
      cityStableId: typeof city.getStableId === "function" ? city.getStableId() : undefined,
      playerId: playerId(city),
      entityId: cityId(city),
    };
  }
}

