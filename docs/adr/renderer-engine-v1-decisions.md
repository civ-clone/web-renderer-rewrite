# Renderer-Engine v1 Decisions

Status: Draft  
Last updated: 2026-06-09

## DEC-001: Engine Is Authoritative

- **Decision:** Renderer submits actions, engine owns game truth and validation.
- **Why:** Supports deterministic multiplayer behavior and anti-desync guarantees.
- **Implication:** Renderer never mutates authoritative state directly.

## DEC-002: Delta-First Sync with Snapshot Recovery

- **Decision:** Use deltas as default, snapshots for join/reconnect/resync.
- **Why:** Better latency and bandwidth profile for multiplayer.
- **Implication:** Version ordering, gap detection, and checkpoint policy are required.

## DEC-003: Normalized State and ID-Only References

- **Decision:** Transport payloads contain raw state tables and `...Id` references only.
- **Why:** Eliminates cyclic graph serialization and reduces leak risk.
- **Implication:** Renderer performs joins locally via indexes/selectors.

## DEC-004: Mandatory Actions Gate Turn End

- **Decision:** Engine tracks `mandatory` and `optional` actions per player.
- **Why:** Matches game rules and keeps turn completion logic authoritative.
- **Implication:** Turn-end requests are rejected while mandatory actions remain.

## DEC-005: Idempotent Commands

- **Decision:** Every `ActionCommand` includes `commandId`; duplicates are safe.
- **Why:** Required for retries over unreliable transports.
- **Implication:** Engine stores recent command outcomes for replayed IDs.

## DEC-006: Validation at Trust Boundaries

- **Decision:** Runtime schema validation at ingress/egress boundaries, not deep hot-path internals.
- **Why:** Balances safety and performance.
- **Implication:** Invalid envelopes fail fast before domain logic.

## DEC-007: Migration Strategy

- **Decision:** Subsystem-by-subsystem cutover, with targeted shadow checks on critical flows.
- **Why:** Faster delivery than full dual-run with acceptable risk.
- **Implication:** Temporary adapters needed during partial migration.

## DEC-008: Source-Derived Schema Strictness

- **Decision:** Keep protocol envelope schemas generic until action and registry adapters are mapped.
- **Why:** Current engine model is object-instance heavy; strict schema now risks locking in the wrong shape.
- **Implication:** Strict field-level schemas are introduced per domain after adapter implementation.

## Pending Decisions
## DEC-009: Pre-Planning Risk Priority Order

- **Decision:** Address high-severity findings in this order: stable IDs (F2) → action DTO (F1) → determinism (F4) → registry projections (F3) → singleton lifecycle (F6) → action manifest (F5).
- **Why:** Stable IDs unblock both the action adapter and registry projection work. Action DTOs enable clean contract; manifest follows naturally. Determinism is low-surface and independent.
- **Implication:** No save/load or reconnect features ship until stable ID strategy is confirmed.
- **Reference:** `docs/planning/engineering-review.md`

## DEC-011: Registry projection strategy (Finding 3)

- **Decision:** Keep object-identity registries unchanged; build read-only ID-indexed projections at snapshot export time.
- **Why:** Registries are part of internal rule engine (correct to use object identity there). Protocol export needs stable-ID indexes.
- **Implication:** No changes to core-registry or domain registries; export layer handles projection.
- **Unblocks:** WP-004 (snapshot exporter), delta export, registry queries.
- **Reference:** `docs/planning/engineering-review.md` Finding 3.

## DEC-012: Seeded RNG for determinism (Finding 4)

- **Decision:** Inject deterministic RNG at entity creation; derive seed from match/turn/player state via SHA-256.
- **Why:** Spaceship already supports injectable RNG (good pattern). Essential for peer-to-peer and replay fidelity.
- **Implication:** Update stochastic entities (Spaceship, PlayerTradeRates, etc.) to accept optional RNG parameter.
- **Unblocks:** WP-006 (multiplayer/replay), deterministic test harness.
- **Reference:** `docs/planning/engineering-review.md` Finding 4.

## DEC-013: Action manifest as optional documentation (Finding 5)

- **Decision:** Build manifest extractor as post-hoc introspection tool; include in SnapshotEnvelope for validator/debugger use.
- **Why:** Manifest is derivable but not essential; action DTO (Finding 1) works without it.
- **Implication:** Low priority; deferred until after WP-002 (action DTO) is stable.
- **Unblocks:** Validator tools, test helpers, documentation.
- **Reference:** `docs/planning/engineering-review.md` Finding 5.

## DEC-014: Registry lifecycle and reset strategy (Finding 6)

- **Decision:** Phase 1: Add `reset()` method to all 22 singleton registries for test isolation. Phase 2 (deferred): if multiplayer server built, use per-match RegistryContainer.
- **Why:** Tests must not leak state between matches; singleton pattern makes this risky unless reset is explicit.
- **Implication:** Phase 1 is low-friction (add reset method + use in beforeEach). Phase 2 depends on multiplayer scope.
- **Unblocks:** WP-007 (testing infrastructure), WP-006 (multiplayer).
- **Reference:** `docs/planning/engineering-review.md` Finding 6.



- **P-001 RESOLVED:** Pessimistic UI for optional actions — renderer waits for `ActionResult` ack before applying any state change. Rationale: local/host-authoritative round-trip is sub-millisecond; avoids rollback complexity in the render-store state machine. Can be relaxed to optimistic per-action-type in a future iteration if latency becomes perceptible.
- **P-002 RESOLVED:** No remediation hints in `ActionResult`. `reasonCode` is sufficient; the renderer derives alternatives from the existing `actionsByPlayer`/`unitActionsById` snapshot data. Avoids duplicating work already done by the snapshot exporter and keeps the rejection path minimal. Revisit if a future UX requirement cannot be met from snapshot data alone.
- **P-003 RESOLVED:** Delta retention window = 128 versions; snapshot checkpoint emitted every turn. Simple defaults that are easy to reason about and adjust later with perf data. Clients falling more than 128 versions behind trigger a full snapshot resync.
- **P-004 RESOLVED:** AI clients run server-side as first-class protocol clients. They consume the same per-player `SnapshotEnvelope`/`DeltaEnvelope` stream as a human renderer and submit `ActionCommand`s through the same `ActionCommandHandler` path. AI receives only the information a human player would (no fog-of-war bypass, no cheating). This keeps the protocol contract continuously exercised by AI turns and makes mixed AI/human multiplayer trivially correct.
