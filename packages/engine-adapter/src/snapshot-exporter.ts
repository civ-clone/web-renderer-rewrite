/**
 * @civ-clone/engine-adapter — snapshot exporter (WP-004)
 *
 * Builds a transport-safe SnapshotEnvelope from live engine state at a point in time.
 *
 * Design principles:
 * - Pure projection: engine state is read-only, no mutation occurs.
 * - IDs: prefers `getStableId()` when available; falls back to ephemeral `id()`.
 * - Entity state records: caller supplies optional serializers per entity type;
 *   defaults to `{}` if none provided (domain serializers come in later WPs).
 * - Checksum: SHA-256 hex of the canonical JSON of the envelope body (pre-checksum).
 */

import { createHash } from "node:crypto";
import {
  PROTOCOL_VERSION,
  type ActionManifestEnvelope,
  type SnapshotEnvelope,
  type StateEntities,
  type StateIndexes,
  type EntityState,
  type ActionRequirementState,
  type PlayerActionDescriptor,
  type UnitActionDescriptor,
  type RngMetadata,
} from "@civ-clone/protocol-state";
import {
  createObservabilityEvent,
  type ObservabilitySink,
} from "./observability.js";
import {
  shouldShadowCompare,
  shouldUseMigratedPath,
  type MigrationCutoverConfig,
} from "./migration-cutover.js";
import type { UnitsMigrationAdapter } from "./migration-types.js";
import { describePlayerActions } from "./player-action-adapter.js";
import { describeUnitActions } from "./unit-action-adapter.js";
import { buildActionManifest } from "./action-manifest.js";

// ---------------------------------------------------------------------------
// Structural engine types (no import from core packages)
// ---------------------------------------------------------------------------

type EngineEntity = {
  id(): string;
  getStableId?: () => string;
};

type EngineTile = {
  x(): number;
  y(): number;
};

type EngineUnitAction = {
  constructor: { name: string };
  unit(): EngineEntity;
  from(): EngineTile;
  to(): EngineTile;
};

type EnginePlayer = EngineEntity & {
  actions(): Array<{ constructor: { name: string }; value(): unknown }>;
};

type EngineUnit = EngineEntity & {
  player(): EnginePlayer;
  tile(): EngineTile;
  actions(): EngineUnitAction[];
  actionsForNeighbours(from: EngineTile): Record<string, EngineUnitAction[]>;
};

type EngineCity = EngineEntity & {
  player(): EnginePlayer;
};

// ---------------------------------------------------------------------------
// Context contract
// ---------------------------------------------------------------------------

export interface SnapshotExporterContext {
  matchId: string;
  stateVersion: number;
  turn: number;

  getPlayers(): EnginePlayer[];
  getUnits(): EngineUnit[];
  getCities(): EngineCity[];

  /**
   * Optional entity serializers.
   * Return a plain key-value state record for the entity.
   * When omitted, the entity is exported as `{}` until domain adapters land.
   */
  toPlayerRecord?: (player: EnginePlayer) => EntityState;
  toUnitRecord?: (unit: EngineUnit) => EntityState;
  toCityRecord?: (city: EngineCity) => EntityState;

  /**
   * Set to `false` to skip including action descriptors in the envelope.
   * Defaults to `true`.
   */
  includeActionsByPlayer?: boolean;
  includeUnitActionsById?: boolean;
  includeActionManifest?: boolean;
  observability?: ObservabilitySink;
  cutover?: MigrationCutoverConfig;
  unitsAdapter?: UnitsMigrationAdapter;
  /** Optional RNG metadata to embed in snapshot for deterministic diagnostics */
  rng?: RngMetadata;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function entityId(entity: EngineEntity): string {
  return typeof entity.getStableId === "function"
    ? entity.getStableId()
    : entity.id();
}

/**
 * Canonical JSON for checksum computation.
 * Uses stable insertion-order iteration — fields are always added in the same
 * order within a single build call, so the result is deterministic per session.
 * Cross-session determinism requires WP-002b stable IDs.
 */
function canonicalJson(value: unknown): string {
  return JSON.stringify(value);
}

function sha256hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

// ---------------------------------------------------------------------------
// SnapshotExporter
// ---------------------------------------------------------------------------

export class SnapshotExporter {
  /**
   * Build a complete SnapshotEnvelope from the current engine state.
   *
   * This is a read-only projection: nothing in the engine is mutated.
   * The returned envelope is structured-clone safe.
   */
  buildSnapshot(context: SnapshotExporterContext): SnapshotEnvelope {
    const players = context.getPlayers();
    const units = context.getUnits();
    const cities = context.getCities();

    const entities: StateEntities = {};
    const indexes: StateIndexes = {};

    // ---- players ----
    entities["players"] = {};
    for (const player of players) {
      const id = entityId(player);
      entities["players"][id] = context.toPlayerRecord
        ? context.toPlayerRecord(player)
        : {};
    }

    // ---- units + unitsByPlayer index ----
    entities["units"] = {};
    indexes["unitsByPlayer"] = {};
    const useMigratedUnits =
      shouldUseMigratedPath(context.cutover, "units") && !!context.unitsAdapter;

    for (const unit of units) {
      const id = entityId(unit);
      const legacyRecord = context.toUnitRecord ? context.toUnitRecord(unit) : {};
      const migratedRecord =
        context.unitsAdapter?.toUnitRecord(unit as never) ?? legacyRecord;
      entities["units"][id] = useMigratedUnits ? migratedRecord : legacyRecord;

      if (shouldShadowCompare(context.cutover, "units") && context.unitsAdapter) {
        context.observability?.record(
          createObservabilityEvent(
            "migration.shadow.units",
            {
              entityId: id,
              parityMatched:
                canonicalJson(legacyRecord) === canonicalJson(migratedRecord),
            },
            context.matchId
          )
        );
      }

      const playerId = entityId(unit.player());
      if (!indexes["unitsByPlayer"][playerId]) {
        indexes["unitsByPlayer"][playerId] = [];
      }
      indexes["unitsByPlayer"][playerId].push(id);
    }

    // ---- cities + citiesByPlayer index ----
    entities["cities"] = {};
    indexes["citiesByPlayer"] = {};

    for (const city of cities) {
      const id = entityId(city);
      entities["cities"][id] = context.toCityRecord
        ? context.toCityRecord(city)
        : {};

      const playerId = entityId(city.player());
      if (!indexes["citiesByPlayer"][playerId]) {
        indexes["citiesByPlayer"][playerId] = [];
      }
      indexes["citiesByPlayer"][playerId].push(id);
    }

    // ---- requirementsByPlayer ----
    const requirementsByPlayer: Record<string, ActionRequirementState> = {};
    for (const player of players) {
      const id = entityId(player);
      const descriptors = describePlayerActions(player as never);

      requirementsByPlayer[id] = {
        mandatory: descriptors
          .filter((d) => d.mandatory)
          .map((d) => ({
            actionType: d.actionType,
            valueType: d.valueType,
            valueId: d.valueId,
            valueStableId: d.valueStableId,
          })),
        optional: descriptors
          .filter((d) => !d.mandatory)
          .map((d) => ({
            actionType: d.actionType,
            valueType: d.valueType,
            valueId: d.valueId,
            valueStableId: d.valueStableId,
          })),
      };
    }

    // ---- actionsByPlayer ----
    let actionsByPlayer: Record<string, PlayerActionDescriptor[]> | undefined;
    if (context.includeActionsByPlayer !== false) {
      actionsByPlayer = {};
      for (const player of players) {
        const id = entityId(player);
        actionsByPlayer[id] = describePlayerActions(player as never);
      }
    }

    // ---- unitActionsById ----
    let unitActionsById: Record<string, UnitActionDescriptor[]> | undefined;
    if (context.includeUnitActionsById !== false) {
      unitActionsById = {};
      for (const unit of units) {
        const id = entityId(unit);
        const legacyActions = describeUnitActions(unit as never);
        const migratedActions = context.unitsAdapter
          ? context.unitsAdapter.describeUnitActions(unit as never)
          : legacyActions;
        unitActionsById[id] = useMigratedUnits ? migratedActions : legacyActions;

        if (shouldShadowCompare(context.cutover, "units") && context.unitsAdapter) {
          context.observability?.record(
            createObservabilityEvent(
              "migration.shadow.units",
              {
                entityId: id,
                legacyActionCount: legacyActions.length,
                migratedActionCount: migratedActions.length,
                parityMatched: legacyActions.length === migratedActions.length,
              },
              context.matchId
            )
          );
        }
      }
    }

    let actionManifest: ActionManifestEnvelope | undefined;
    if (context.includeActionManifest !== false) {
      actionManifest = buildActionManifest({
        protocolVersion: PROTOCOL_VERSION,
        matchId: context.matchId,
        stateVersion: context.stateVersion,
        turn: context.turn,
        entities,
        indexes,
        requirementsByPlayer,
        ...(actionsByPlayer !== undefined && { actionsByPlayer }),
        ...(unitActionsById !== undefined && { unitActionsById }),
        checksum: "",
      });
    }

    const envelopeBody = {
      protocolVersion: PROTOCOL_VERSION,
      matchId: context.matchId,
      stateVersion: context.stateVersion,
      turn: context.turn,
      entities,
      indexes,
      requirementsByPlayer,
      ...(actionsByPlayer !== undefined && { actionsByPlayer }),
      ...(unitActionsById !== undefined && { unitActionsById }),
      ...(actionManifest !== undefined && { actionManifest }),
      ...(context.rng !== undefined && { rng: context.rng }),
    };

    const checksum = sha256hex(canonicalJson(envelopeBody));

    context.observability?.record(
      createObservabilityEvent(
        "snapshot.exported",
        {
          stateVersion: context.stateVersion,
          turn: context.turn,
          checksum,
          playerCount: players.length,
          unitCount: units.length,
          cityCount: cities.length,
          includesActionsByPlayer: actionsByPlayer !== undefined,
          includesUnitActionsById: unitActionsById !== undefined,
          includesActionManifest: actionManifest !== undefined,
        },
        context.matchId
      )
    );

    return { ...envelopeBody, checksum };
  }
}


