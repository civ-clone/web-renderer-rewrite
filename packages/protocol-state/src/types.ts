/**
 * @civ-clone/protocol-state
 *
 * All types in this file are structured-clone-safe:
 * no class instances, no functions, no cyclic references.
 * Relationships between entities are expressed as string ID references only.
 */

export const PROTOCOL_VERSION = "1.0" as const;
export type ProtocolVersion = typeof PROTOCOL_VERSION;

// ---------------------------------------------------------------------------
// Entity ID conventions
// IDs are engine-issued strings, stable for the entity lifetime.
// Format convention: "<type>:<opaque-id>", e.g. "player:1", "unit:234"
// ---------------------------------------------------------------------------
export type EntityId = string;
export type PlayerId = EntityId;
export type UnitId = EntityId;
export type CityId = EntityId;
export type TileId = EntityId;
export type StableEntityId = string; // Format depends on strategy: UUID, "${x}:${y}", "civ:xxx:hash", etc.

// ---------------------------------------------------------------------------
// State shapes (provisional)
//
// We intentionally keep these generic until all civ1 PlayerActions and
// core registries are mapped. Domain packages currently expose class-heavy
// values (e.g. Unit, CityBuild, PlayerResearch) through PlayerAction#value().
// The boundary contract should stabilize from that source model first.
// ---------------------------------------------------------------------------

export type EntityState = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Action requirements
// ---------------------------------------------------------------------------

export interface MandatoryRequirement {
  /** PlayerAction class name, e.g. "ChooseResearch", "ActiveUnit" */
  actionType: string;
  /** DataObject class name of PlayerAction#value(), when available */
  valueType?: string;
  /** Ephemeral entity ID from DataObject#id() (transition period) */
  valueId?: EntityId;
  /** Stable entity ID from getStableId() (preferred when available) */
  valueStableId?: StableEntityId;
}

export interface AvailableAction {
  actionType: string;
  valueType?: string;
  /** Ephemeral entity ID from DataObject#id() (transition period) */
  valueId?: EntityId;
  /** Stable entity ID from getStableId() (preferred when available) */
  valueStableId?: StableEntityId;
}

export interface ActionRequirementState {
  /** Must all be resolved before turn end is permitted */
  mandatory: MandatoryRequirement[];
  /** Optional — drives UI affordances only */
  optional: AvailableAction[];
}

// ---------------------------------------------------------------------------
// Normalized state envelope (snapshot)
// ---------------------------------------------------------------------------

export interface StateEntities {
  /** tableName -> entityId -> raw state object */
  [table: string]: Record<EntityId, EntityState>;
}

export interface StateIndexes {
  /** indexName -> key -> list of IDs */
  [indexName: string]: Record<string, string[]>;
}

export interface ActionDescriptor {
  /** Distinguishes player-turn decisions from unit movement decisions */
  tier: "player" | "unit";
  actionType: string;
  mandatory: boolean;
  valueType?: string;
  valueId?: EntityId;
  valueStableId?: StableEntityId;
}

/**
 * Player-turn action descriptor.
 * Produced from PlayerAction<T> at engine boundary.
 *
 * During transition to stable IDs (Finding 2):
 * - valueId: ephemeral DataObject#id() (valid only in current session)
 * - valueStableId: stable entity ID (valid across save/load, replay, reconnect)
 *
 * Once Finding 2 is fully deployed and all saves migrated, valueId will be removed.
 */
export interface PlayerActionDescriptor {
  tier: "player";
  actionType: string;
  mandatory: boolean;
  /** Constructor name of PlayerAction#value(), e.g. "PlayerResearch", "Unit" */
  valueType?: string;
  /** Ephemeral DataObject#id() of PlayerAction#value() (for transition) */
  valueId?: EntityId;
  /** Stable entity ID of PlayerAction#value() (for Finding 2+) */
  valueStableId?: StableEntityId;
}

/**
 * Unit-move action descriptor.
 * Produced from core-unit/Action at engine boundary.
 * Tile references use stable "${x}:${y}" format rather than DataObject#id().
 *
 * Operational pattern:
 * 1. Engine sends PlayerAction.ActiveUnit with valueStableId: "unit:42:3"
 * 2. Engine includes unitActionsById["unit:42:3"] with available unit actions
 * 3. Renderer displays those actions; player selects one
 * 4. Renderer sends ActionCommand(tier: "unit", unitStableId: "unit:42:3", actionType: "Fortify", ...)
 * 5. Engine processes and transitions to next turn decision
 *
 * Invariant: if ActiveUnit carries valueStableId X, then unitActionsById[X] is populated and non-empty.
 * (At minimum, every unit can perform NoOrders.)
 *
 * During transition to stable IDs:
 * - unitId: ephemeral DataObject#id() (for backward compat)
 * - unitStableId: stable entity ID (for Finding 2+)
 */
export interface UnitActionDescriptor {
  tier: "unit";
  actionType: string;
  mandatory: false;
  /** Ephemeral DataObject#id() (for transition) */
  unitId?: EntityId;
  /** Stable entity ID (for Finding 2+) */
  unitStableId?: StableEntityId;
  fromTileId: string; // "${x}:${y}" stable key
  toTileId?: string;  // "${x}:${y}" stable key; some actions are in-place
}

export interface ActionManifestEntry {
  tier: "player" | "unit";
  actionType: string;
  mandatory: boolean;
  valueType?: string;
  /** True when renderer commands for this action need valueId/valueStableId. */
  requiresValueRef: boolean;
  /** True when renderer commands for this action need unitId/unitStableId. */
  requiresUnitRef: boolean;
  /** True when renderer commands for this action need fromTileId. */
  requiresFromTileRef: boolean;
  /** True when renderer commands for this action need toTileId. */
  requiresToTileRef: boolean;
}

export interface ActionManifestEnvelope {
  entries: ActionManifestEntry[];
}

export interface RngMetadata {
  /** Algorithm identifier, e.g. "xorshift64*" */
  algorithm: string;
  /** Seed material (or deterministic seed digest) used for generation */
  seed: string;
  /** Optional draw counter for deterministic progression checkpoints */
  counter?: number;
}

export interface RngTrace {
  /** Seed associated with this command/result execution */
  seed?: string;
  /** Optional draw counter at ingress/egress */
  counter?: number;
}

export interface SnapshotEnvelope {
  protocolVersion: ProtocolVersion;
  matchId: string;
  /** Monotonically increasing counter across all state changes */
  stateVersion: number;
  turn: number;
  entities: StateEntities;
  indexes: StateIndexes;
  requirementsByPlayer: Record<PlayerId, ActionRequirementState>;
  /** Player-turn action descriptors per player */
  actionsByPlayer?: Record<PlayerId, PlayerActionDescriptor[]>;
  /** Unit-level action descriptors per unit (populated for active units) */
  unitActionsById?: Record<EntityId, UnitActionDescriptor[]>;
  /** Optional action contract metadata for tooling and validation */
  actionManifest?: ActionManifestEnvelope;
  /** Optional deterministic RNG metadata for replay/multiplayer diagnostics */
  rng?: RngMetadata;
  /** SHA-256 hex of canonical JSON of this envelope for integrity checks */
  checksum: string;
}

// ---------------------------------------------------------------------------
// Delta sync
// ---------------------------------------------------------------------------

export type PatchOpSet = {
  op: "set";
  path: string; // dot-separated, e.g. "entities.units.unit:42.health"
  value: unknown;
};

export type PatchOpRemove = {
  op: "remove";
  path: string;
};

export type PatchOpArrayPush = {
  op: "arrayPush";
  path: string;
  value: unknown;
};

export type PatchOpArrayRemoveItem = {
  op: "arrayRemoveItem";
  path: string;
  value: unknown;
};

export type PatchOp =
  | PatchOpSet
  | PatchOpRemove
  | PatchOpArrayPush
  | PatchOpArrayRemoveItem;

export interface DeltaEnvelope {
  protocolVersion: ProtocolVersion;
  matchId: string;
  /** The stateVersion this delta starts from */
  baseVersion: number;
  /** The stateVersion this delta produces when applied */
  targetVersion: number;
  patches: PatchOp[];
  /** Optional: checksum of the resulting state after applying patches */
  resultChecksum?: string;
}

// ---------------------------------------------------------------------------
// Action commands (renderer -> engine)
// ---------------------------------------------------------------------------

export interface ActionCommand<TPayload = unknown> {
  protocolVersion: ProtocolVersion;
  /** Client-generated idempotency token (UUID recommended, not required) */
  commandId: string;
  matchId: string;
  actorPlayerId: PlayerId;
  /** Per-client monotonic sequence number for ordering */
  clientSeq: number;
  /** Optional: refuse execution if server turn differs */
  expectedTurn?: number;
  /** Tier distinguishes player-turn decisions from unit move decisions */
  tier: "player" | "unit";
  /** Stable type identifier, e.g. "ChooseResearch", "Move", "Fortify" */
  actionType: string;
  // player tier fields (ephemeral + stable for transition)
  valueType?: string;
  valueId?: EntityId;
  valueStableId?: StableEntityId;
  // unit tier fields (ephemeral + stable for transition)
  unitId?: EntityId;
  unitStableId?: StableEntityId;
  fromTileId?: string;
  toTileId?: string;
  /** Optional deterministic RNG trace for command-side reproducibility */
  rng?: RngTrace;
  /** Arbitrary extra payload for complex actions (optional, engine-validated) */
  payload?: TPayload;
  sentAt: number; // unix ms
}

export interface ActionResult {
  commandId: string;
  status: "accepted" | "rejected" | "deferred";
  /** Stable machine-readable reason code for rejected/deferred commands */
  reasonCode?: string;
  /** Human-readable detail; not for programmatic branching */
  message?: string;
  serverSeq: number;
  /** Optional deterministic RNG trace emitted by engine */
  rng?: RngTrace;
  /** The stateVersion after this command was applied (accepted only) */
  resultingStateVersion?: number;
}

// ---------------------------------------------------------------------------
// Turn end
// ---------------------------------------------------------------------------

export interface TurnEndRequest {
  protocolVersion: ProtocolVersion;
  matchId: string;
  actorPlayerId: PlayerId;
  commandId: string;
  clientSeq: number;
  sentAt: number;
}

export interface TurnEndResult {
  commandId: string;
  status: "accepted" | "rejected";
  /** Populated when rejected: which mandatory requirements remain */
  unmetRequirements?: MandatoryRequirement[];
  reasonCode?: string;
}

// ---------------------------------------------------------------------------
// Transport-level messages (discriminated union)
// ---------------------------------------------------------------------------

export type EngineMessage =
  | { type: "snapshot"; payload: SnapshotEnvelope }
  | { type: "actionManifest"; payload: ActionManifestEnvelope }
  | { type: "delta"; payload: DeltaEnvelope }
  | { type: "actionResult"; payload: ActionResult }
  | { type: "turnEndResult"; payload: TurnEndResult };

export type RendererMessage =
  | { type: "action"; payload: ActionCommand }
  | { type: "turnEnd"; payload: TurnEndRequest }
  | { type: "requestSnapshot"; matchId: string; actorPlayerId: PlayerId };

