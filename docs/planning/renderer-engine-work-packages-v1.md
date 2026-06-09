# Renderer-Engine v1 Work Packages

Status: Draft  
Last updated: 2026-06-09

This plan is organized so humans and AI agents can execute chunks in parallel with clear handoffs.

## Delivery Phases

- Phase A: Contract foundation
- Phase B: Engine emit/ingest pipeline
- Phase C: Renderer store and UI integration
- Phase D: Multiplayer hardening and quality gates

## WP-001: Protocol Types Package

**Scope**
- Create shared contract package (suggested: `@civ-clone/protocol-state`).
- Define envelope/action/result/delta/snapshot types.
- Add protocol version constant and compatibility helpers.

**Definition of Done**
- Package builds and is consumed by engine and renderer.
- All exported types are structured-clone-safe.
- Versioning rules are documented.

## WP-002: Engine Action Ingress

**Scope**
- Add command intake API for `ActionCommand`.
- Implement `commandId` idempotency cache.
- Return deterministic `ActionResult` values.

**Definition of Done**
- Repeated same `commandId` returns stable prior result.
- Rejection reason codes are stable and documented.
- Unit tests cover accepted/rejected/deferred paths.

## WP-003: Mandatory Action Gate

**Scope**
- Model `requirementsByPlayer` in authoritative state.
- Enforce turn-end gate against unmet mandatory actions.

**Definition of Done**
- Turn end fails when mandatory list non-empty.
- Turn end succeeds immediately when list is empty.
- Tests cover `MoveUnit` and `ChooseResearch` mandatory examples.

## WP-004: Snapshot Exporter

**Scope**
- Implement normalized state exporter from engine registry.
- Ensure all relationships are IDs only.

**Definition of Done**
- Snapshot contains no object references or cycles.
- Serializer output can be JSON-encoded cleanly.
- Snapshot checksum fixture exists for replay testing.

## WP-005: Delta Generator

**Scope**
- Emit ordered `DeltaEnvelope`s per `stateVersion` increment.
- Define patch operations (`set`, `update`, `remove`) and paths.

**Definition of Done**
- Applying deltas from a base snapshot reaches target checksum.
- Out-of-order delta application is detected and rejected.
- Delta retention policy is configurable.

## WP-006: Renderer State Store

**Scope**
- Build client store for snapshot and delta apply.
- Build indexes (`unitsByPlayer`, `citiesByPlayer`) and lookup helpers.

**Definition of Done**
- Store can hydrate from snapshot and process sequential deltas.
- UI selectors use IDs and local joins only.
- Memory use does not grow unbounded in long replay tests.

## WP-007: Transport Adapter Layer

**Scope**
- Create adapter interface to decouple transport from contract.
- Implement local loopback adapter and host-client adapter.

**Definition of Done**
- Same contract passes through both adapters unchanged.
- Adapter-level timeout/retry behavior is configurable.
- Integration test runs in loopback and network-simulated modes.

## WP-008: Action Manifest Extractor ✅ DONE

**Scope**
- Extract de-duplicated action manifest from live snapshot action descriptors.
- Include optional `actionManifest` in `SnapshotEnvelope` for validator/debugger use.

**Definition of Done** ✅
- `buildActionManifest(snapshot)` returns stable, sorted, de-duplicated entries.
- Each entry carries `requiresValueRef`, `requiresUnitRef`, `requiresFromTileRef`, `requiresToTileRef` flags.
- `SnapshotExporter` includes manifest by default; opt-out via `includeActionManifest: false`.
- Schema coverage in `@civ-clone/protocol-state` (`actionManifestEntrySchema`, `actionManifestEnvelopeSchema`).
- 71 engine-adapter tests + 35 protocol-state tests passing.

## WP-009: Validation Boundary Layer ✅ DONE

**Scope**
- Add boundary validation for inbound/outbound envelopes.
- Keep hot-path internals minimally validated for performance.

**Definition of Done** ✅
- Invalid envelopes are rejected before domain logic execution.
- Validation errors map to explicit protocol error codes.
- Benchmark confirms acceptable overhead at target action rate.

## WP-010: Observability and Replay Harness ✅ DONE

**Scope**
- Add structured logs for commands, results, versions, and resyncs.
- Add deterministic replay harness from recorded command streams.

**Definition of Done** ✅
- Replay run reaches stable checksum.
- Logs include enough data to debug desync root causes.
- Tooling can export a minimal repro packet for failures.

## WP-011: Migration Adapters and Cutover ✅ DONE

**Scope**
- Implement adapters from legacy object graph APIs to new envelopes.
- Migrate subsystems in order: units -> cities -> research -> diplomacy/world.

**Definition of Done** ✅
- At least one subsystem is fully migrated end-to-end.
- Legacy path remains functional for unmigrated subsystems.
- Targeted shadow checks compare critical behaviors.

Current progress:
- Units and cities subsystem migration adapters + cutover routing/shadow hooks landed in `@civ-clone/engine-adapter`.
- Shadow telemetry parity reporting helper (`buildMigrationParityReport`) is available for migration confidence checks.

## WP-012: Per-match Registry Container 🚧 IN PROGRESS

**Scope**
- Provide per-match registry isolation utility for async multiplayer/server flows.
- Support async-context binding with safe nested and parallel isolation.

**Definition of Done**
- Match-scoped container can be bound and resolved in async call chains.
- Parallel matches do not leak registry state.
- Demo + tests validate nested context behavior.

## WP-013: AdditionalData Rendering Bridge ✅ DONE

**Scope**
- Bridge upstream `registerAdditionalData` providers (realized via `DataObject.toPlainObject`) into protocol snapshots without hardcoding entity/table names.
- Keep renderer contract entity-agnostic by supporting dynamic tables/indexes in `entities`/`indexes`.

**Definition of Done** ✅
- `SnapshotExporter` supports additional table/index provider hooks with deterministic checksums.
- Protocol schema tests explicitly accept representative dynamic tables/indexes (e.g. per-player world views).
- Documentation defines naming/determinism rules for dynamic tables and index keys.

## Suggested Sequencing

1. WP-001, WP-002, WP-004
2. WP-003, WP-005
3. WP-006, WP-007
4. WP-008 ✅, WP-009 ✅, WP-010 ✅
5. WP-011
6. WP-012
7. Progressive subsystem cutovers

## Parallelization Opportunities

- WP-006 can begin once WP-001 contract drafts stabilize.
- WP-007 can proceed in parallel with WP-005 using mocked envelopes.
- WP-011 can start with one subsystem migration while others remain on legacy path.
- WP-013 can run in parallel with WP-012 because it is snapshot-contract focused.

## Initial Risks

- Delta complexity can cause subtle desync bugs.
- Requirement gating can drift between old and new systems.
- Historical state/version caches can leak memory.
- Protocol churn increases if action taxonomy is unstable.

## Exit Criteria for v1

- Multiplayer host-authoritative game runs with command and delta sync.
- Turn gating with mandatory actions is reliable.
- Renderer no longer consumes cyclic object graphs.
- Reconnect can recover from version mismatch via snapshot resync.


