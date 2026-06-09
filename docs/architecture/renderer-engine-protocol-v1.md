# Renderer-Engine Protocol v1 (State + ID References)

Status: Draft  
Last updated: 2026-06-09

## 1. Goals

- Replace cyclic object graph transfer with normalized raw state and ID references.
- Keep engine authoritative while renderer submits player `ActionCommand`s.
- Support multiplayer transports (local loopback, host-authoritative, future server-authoritative).
- Optimize for low-latency updates via delta-first sync with snapshot fallback.
- Keep protocol transport-agnostic and versioned.

## 2. Non-goals (v1)

- Backward compatibility with old object-graph payloads.
- Full anti-cheat guarantees for peer-to-peer mode.
- Perfectly minimal payloads from day one.

## 3. Architecture Boundaries

### Engine (authoritative)

- Owns all game truth, identity assignment, turn gating, and rule validation.
- Emits `SnapshotEnvelope` and `DeltaEnvelope` payloads.
- Accepts `ActionCommand`s and returns `ActionResult`.

### Renderer (client)

- Holds a local read model built from normalized entities and indexes.
- Resolves ID joins client-side (`unit.playerId -> player`).
- Can perform preflight validation for UX only; engine remains source of truth.

### Transport Adapter

- Moves envelopes/messages between engine and renderer.
- Must preserve ordering guarantees promised by the selected mode.
- Is replaceable without changing core contract types.

## 4. Core Data Model

### 4.1 Entity IDs

- Engine-issued string IDs per entity type (`player:1`, `unit:234`, `city:88`).
- Stable for entity lifetime.
- Save/load should preserve IDs where possible to keep replay/debug consistency.

### 4.2 Normalized State Shape

```ts
interface StateEnvelope {
  protocolVersion: "1.0";
  matchId: string;
  stateVersion: number; // monotonic
  turn: number;
  entities: {
    players: Record<string, PlayerState>;
    units: Record<string, UnitState>;
    cities: Record<string, CityState>;
    tiles: Record<string, TileState>;
    // extensible by rulesets/modules
  };
  indexes: {
    unitsByPlayer: Record<string, string[]>;
    citiesByPlayer: Record<string, string[]>;
  };
  requirementsByPlayer: Record<string, ActionRequirementState>;
}
```

- No direct object references, methods, closures, or cyclic object graphs.
- Relationships are always `...Id` or `...Ids`.

### 4.3 Action Requirements

```ts
interface ActionRequirementState {
  mandatory: MandatoryRequirement[];
  optional: AvailableAction[];
}
```

- `mandatory` gates turn progression.
- `optional` drives UI affordances but does not block turn end.

## 5. Commands and Results

### 5.1 ActionCommand

```ts
interface ActionCommand<TPayload = unknown> {
  protocolVersion: "1.0";
  commandId: string; // idempotency key
  matchId: string;
  actorPlayerId: string;
  clientSeq: number; // per-client monotonic
  expectedTurn?: number;
  actionType: string; // e.g. MoveUnit, ChooseResearch, ActivateUnit
  payload: TPayload;
  sentAt: number;
}
```

### 5.2 ActionResult

```ts
interface ActionResult {
  commandId: string;
  status: "accepted" | "rejected" | "deferred";
  reasonCode?: string;
  message?: string;
  serverSeq: number;
  resultingStateVersion?: number;
}
```

- Duplicate `commandId` is safe and returns same prior result.
- `rejected` must include stable `reasonCode` for deterministic UI handling.

## 6. Sync Protocol

### 6.1 SnapshotEnvelope (baseline + recovery)

- Full normalized state at a single `stateVersion`.
- Sent on join, reconnect, large divergence, or periodic checkpoint.

### 6.2 DeltaEnvelope (default path)

```ts
interface DeltaEnvelope {
  protocolVersion: "1.0";
  matchId: string;
  baseVersion: number;
  targetVersion: number;
  patches: PatchOp[]; // set/update/remove for entities/indexes/requirements
  checksum?: string;
}
```

- Client must apply deltas in strict version order.
- Any gap or checksum mismatch triggers snapshot resync.

### 6.3 Suggested defaults

- Delta retention window: start with 128 versions (tune later).
- Snapshot checkpoint frequency: every N turns or major world event.
- Compression: optional at transport layer, not in contract.

## 7. Validation Strategy

### Client preflight (fast UX)

- Local shape checks and obvious constraints (e.g., selected unit exists).
- Never treated as authoritative.

### Engine validation (authoritative)

- Full rule evaluation with deterministic result codes.
- Enforces turn order, fog-of-war constraints, and requirement completion.

### Runtime schema checks

- Validate envelopes at trust boundaries only (network ingress/egress).
- Use minimal hot-path validation internally after boundary checks.

## 8. Multiplayer Modes

- **Host-authoritative (v1 default):** one host engine, all clients submit commands.
- **Server-authoritative (v1.1+):** same contract; host replaced by dedicated server.
- **Peer-to-peer (future):** same command envelope, but consensus/arbiter rules required.

## 9. Failure and Recovery

- Timeouts return explicit transport-level failure (not rule rejection).
- Out-of-order or missing delta -> request snapshot.
- On reconnect: server sends latest snapshot + optional tail deltas.

## 10. Security and Abuse Surface

- Never trust client payload semantics.
- Enforce actor ownership (`actorPlayerId` can only act for owned entities).
- Rate-limit command spam per client/session.

## 11. Migration Strategy

Use subsystem-by-subsystem cutover with targeted shadow checks:

1. Implement protocol package and adapter layer.
2. Migrate one subsystem (`units`) to normalized export + command handling.
3. Keep legacy path active for non-migrated subsystems.
4. Add shadow assertions for critical flows (`mandatory` gating, turn end).
5. Repeat for `cities`, `research`, diplomacy, world state.
6. Remove legacy object transfer path when full parity is reached.

## 12. Open Decisions

- Optimistic UI policy for optional actions before ack.
- Whether rejected actions should include remediation hints.
- Final delta retention/checkpoint tuning.
- AI clients using exact same wire path from day one.

## 12.1 Schema Stabilization Policy

- Keep envelope schemas permissive while action/registry adapters are being discovered.
- Derive strict per-domain schemas from source packages (`civ1-*` actions and `core-*` registries), not from assumptions.
- Track discovery in `docs/planning/source-model-audit.md` and only then harden strict field contracts.

## 13. Acceptance Criteria for Protocol v1

- No cyclic references in any serialized state payload.
- Client can rebuild render state from snapshot + ordered deltas.
- Mandatory action gating blocks turn end correctly in multiplayer.
- Duplicate commands are idempotent via `commandId`.
- One transport swap can occur without changing domain contract types.


