/**
 * @civ-clone/renderer-state — WP-006: Renderer State Store
 *
 * Client-side store that:
 * - Hydrates from a full SnapshotEnvelope
 * - Applies sequential DeltaEnvelope patches
 * - Maintains a bounded delta retention window for catch-up
 * - Provides entity lookup, index lookup, and action descriptor accessors
 *
 * Design constraints:
 * - All state is plain JS — no circular refs, structured-clone-safe.
 * - Memory: delta window is bounded (maxDeltaWindow, default 128).
 * - Lookup helpers are O(1) / O(k) for single keys; no full-scan required.
 */

import {
  type SnapshotEnvelope,
  type DeltaEnvelope,
  type PatchOp,
  type EntityState,
  type StateEntities,
  type StateIndexes,
  type ActionRequirementState,
  type PlayerActionDescriptor,
  type UnitActionDescriptor,
  PROTOCOL_VERSION,
} from "@civ-clone/protocol-state";

// ---------------------------------------------------------------------------
// Internal mutable state — only kept in private fields of RendererStore.
// ---------------------------------------------------------------------------

interface StoredState {
  protocolVersion: string;
  matchId: string;
  stateVersion: number;
  turn: number;
  checksum: string;
  entities: StateEntities;
  indexes: StateIndexes;
  requirementsByPlayer: Record<string, ActionRequirementState>;
  actionsByPlayer: Record<string, PlayerActionDescriptor[]>;
  unitActionsById: Record<string, UnitActionDescriptor[]>;
}

// ---------------------------------------------------------------------------
// ApplyDeltaResult — returned by applyDelta()
// ---------------------------------------------------------------------------

export type ApplyDeltaResult =
  | { ok: true; stateVersion: number }
  | { ok: false; reason: "gap" | "stale" | "mismatch" | "unhydrated"; detail: string };

// ---------------------------------------------------------------------------
// Path helpers — dot-separated paths for PatchOp traversal
// ---------------------------------------------------------------------------

type PlainObject = Record<string, unknown>;

function pathSegments(path: string): string[] {
  return path.split(".");
}

function getAtPath(root: PlainObject, segments: string[]): unknown {
  let current: unknown = root;
  for (const seg of segments) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as PlainObject)[seg];
  }
  return current;
}

function ensurePath(root: PlainObject, segments: string[]): PlainObject {
  let current = root;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (
      current[seg] === undefined ||
      current[seg] === null ||
      typeof current[seg] !== "object"
    ) {
      current[seg] = {};
    }
    current = current[seg] as PlainObject;
  }
  return current;
}

function applyPatch(root: PlainObject, op: PatchOp): void {
  const segs = pathSegments(op.path);
  const parent = ensurePath(root, segs);
  const leaf = segs[segs.length - 1];

  switch (op.op) {
    case "set": {
      parent[leaf] = op.value;
      break;
    }
    case "remove": {
      delete parent[leaf];
      break;
    }
    case "arrayPush": {
      const arr = parent[leaf];
      if (!Array.isArray(arr)) {
        parent[leaf] = [op.value];
      } else {
        arr.push(op.value);
      }
      break;
    }
    case "arrayRemoveItem": {
      const arr = parent[leaf];
      if (!Array.isArray(arr)) break;
      const idx = arr.indexOf(op.value);
      if (idx !== -1) {
        arr.splice(idx, 1);
      }
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// RendererStore
// ---------------------------------------------------------------------------

export interface RendererStoreOptions {
  /**
   * Maximum number of delta envelopes retained in the catch-up window.
   * Clients that fall more than this behind need a full resync.
   * Default: 128.
   */
  maxDeltaWindow?: number;
}

/**
 * Client-side state store for the Civ-Clone renderer.
 *
 * Lifecycle:
 * ```
 * const store = new RendererStore();
 * store.hydrate(snapshotFromEngine);             // full sync
 * store.applyDelta(deltaFromEngine);             // incremental update
 *
 * store.getEntity("units", "unit:42");           // look up entity
 * store.lookupIndex("unitsByPlayer", "player:1") // all unit IDs for player
 * store.getActionsForPlayer("player:1");         // pending action descriptors
 * ```
 */
export class RendererStore {
  readonly #maxDeltaWindow: number;
  #state: StoredState | null = null;
  #deltaWindow: DeltaEnvelope[] = [];

  constructor(options?: RendererStoreOptions) {
    this.#maxDeltaWindow = options?.maxDeltaWindow ?? 128;
  }

  // -------------------------------------------------------------------------
  // Hydration
  // -------------------------------------------------------------------------

  /**
   * Fully hydrate the store from a snapshot.
   * Any previously stored state and delta window are discarded.
   */
  hydrate(snapshot: SnapshotEnvelope): void {
    this.#state = {
      protocolVersion: snapshot.protocolVersion,
      matchId: snapshot.matchId,
      stateVersion: snapshot.stateVersion,
      turn: snapshot.turn,
      checksum: snapshot.checksum,
      entities: JSON.parse(JSON.stringify(snapshot.entities)) as StateEntities,
      indexes: JSON.parse(JSON.stringify(snapshot.indexes)) as StateIndexes,
      requirementsByPlayer: JSON.parse(
        JSON.stringify(snapshot.requirementsByPlayer)
      ) as Record<string, ActionRequirementState>,
      actionsByPlayer: JSON.parse(
        JSON.stringify(snapshot.actionsByPlayer ?? {})
      ) as Record<string, PlayerActionDescriptor[]>,
      unitActionsById: JSON.parse(
        JSON.stringify(snapshot.unitActionsById ?? {})
      ) as Record<string, UnitActionDescriptor[]>,
    };
    // Clear delta window on resync — old deltas are invalid from the new base.
    this.#deltaWindow = [];
  }

  // -------------------------------------------------------------------------
  // Delta application
  // -------------------------------------------------------------------------

  /**
   * Apply an incremental delta to the stored state.
   *
   * Returns `{ ok: true }` on success, or `{ ok: false, reason }` for:
   * - `"unhydrated"` — no snapshot has been applied yet
   * - `"stale"` — delta targets a stateVersion we've already passed
   * - `"gap"` — delta base is ahead of our current stateVersion (missed deltas)
   * - `"mismatch"` — delta matchId doesn't match current store matchId
   */
  applyDelta(delta: DeltaEnvelope): ApplyDeltaResult {
    if (!this.#state) {
      return { ok: false, reason: "unhydrated", detail: "Store has not been hydrated yet." };
    }

    if (delta.matchId !== this.#state.matchId) {
      return {
        ok: false,
        reason: "mismatch",
        detail: `Delta matchId '${delta.matchId}' does not match store matchId '${this.#state.matchId}'.`,
      };
    }

    if (delta.baseVersion < this.#state.stateVersion) {
      return {
        ok: false,
        reason: "stale",
        detail: `Delta baseVersion ${delta.baseVersion} is behind current stateVersion ${this.#state.stateVersion}.`,
      };
    }

    if (delta.baseVersion > this.#state.stateVersion) {
      return {
        ok: false,
        reason: "gap",
        detail: `Delta baseVersion ${delta.baseVersion} is ahead of current stateVersion ${this.#state.stateVersion}. Missing deltas.`,
      };
    }

    // Apply patches against the mutable state tree.
    const root = this.#state as unknown as PlainObject;
    for (const patch of delta.patches) {
      applyPatch(root, patch);
    }

    this.#state.stateVersion = delta.targetVersion;
    if (delta.resultChecksum) {
      this.#state.checksum = delta.resultChecksum;
    }

    // Maintain bounded delta window for catch-up scenarios.
    this.#deltaWindow.push(delta);
    if (this.#deltaWindow.length > this.#maxDeltaWindow) {
      this.#deltaWindow.shift();
    }

    return { ok: true, stateVersion: this.#state.stateVersion };
  }

  // -------------------------------------------------------------------------
  // Catch-up: provide deltas from a given base version for reconnecting clients
  // -------------------------------------------------------------------------

  /**
   * Return retained deltas with baseVersion >= fromVersion.
   * Returns null if the window doesn't cover that far back (client needs resync).
   */
  getDeltasFrom(fromVersion: number): DeltaEnvelope[] | null {
    if (this.#deltaWindow.length === 0) return null;
    const first = this.#deltaWindow[0];
    if (first.baseVersion > fromVersion) return null; // gap — window doesn't go that far back
    return this.#deltaWindow.filter((d) => d.baseVersion >= fromVersion);
  }

  // -------------------------------------------------------------------------
  // Store metadata
  // -------------------------------------------------------------------------

  get isHydrated(): boolean {
    return this.#state !== null;
  }

  get stateVersion(): number {
    return this.#state?.stateVersion ?? 0;
  }

  get matchId(): string | undefined {
    return this.#state?.matchId;
  }

  get turn(): number | undefined {
    return this.#state?.turn;
  }

  get checksum(): string | undefined {
    return this.#state?.checksum;
  }

  // -------------------------------------------------------------------------
  // Entity lookups
  // -------------------------------------------------------------------------

  /** Look up a single entity by table name and entity ID. */
  getEntity(table: string, id: string): EntityState | undefined {
    return this.#state?.entities[table]?.[id];
  }

  /**
   * Return all entities in a table.
   * Returns an empty object if the table doesn't exist.
   */
  listTable(table: string): Record<string, EntityState> {
    return this.#state?.entities[table] ?? {};
  }

  /** Return the set of all entity IDs in a table. */
  listTableIds(table: string): string[] {
    return Object.keys(this.#state?.entities[table] ?? {});
  }

  // -------------------------------------------------------------------------
  // Index lookups
  // -------------------------------------------------------------------------

  /**
   * Look up a list of entity IDs for a single index key.
   * e.g. lookupIndex("unitsByPlayer", "player:1") → ["unit:1", "unit:2"]
   */
  lookupIndex(indexName: string, key: string): string[] {
    return this.#state?.indexes[indexName]?.[key] ?? [];
  }

  /**
   * Return the full index (all keys → ID lists).
   * Returns an empty object if the index doesn't exist.
   */
  getIndex(indexName: string): Record<string, string[]> {
    return this.#state?.indexes[indexName] ?? {};
  }

  // -------------------------------------------------------------------------
  // Action descriptor accessors
  // -------------------------------------------------------------------------

  /** Return pending requirements for a player. */
  getRequirementsForPlayer(playerId: string): ActionRequirementState | undefined {
    return this.#state?.requirementsByPlayer[playerId];
  }

  /** Return player-turn action descriptors for a player. */
  getActionsForPlayer(playerId: string): PlayerActionDescriptor[] {
    return this.#state?.actionsByPlayer[playerId] ?? [];
  }

  /** Return unit-level action descriptors for a unit entity ID. */
  getUnitActions(entityId: string): UnitActionDescriptor[] {
    return this.#state?.unitActionsById[entityId] ?? [];
  }

  // -------------------------------------------------------------------------
  // Debug / introspection
  // -------------------------------------------------------------------------

  /** Return a snapshot of the current entity table names (not their contents). */
  getEntityTableNames(): string[] {
    return Object.keys(this.#state?.entities ?? {});
  }

  /** Number of deltas currently held in the catch-up window. */
  get deltaWindowSize(): number {
    return this.#deltaWindow.length;
  }
}

