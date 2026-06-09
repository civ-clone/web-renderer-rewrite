# Work Priority & Implementation Roadmap

Last updated: 2026-06-09

All 6 pre-planning findings are now documented, decisions locked, and ready for implementation.

## Recommended work sequencing

### Phase 1 (Protocol foundation — WP-001 through WP-003)

**WP-001 ✅ DONE:** Protocol state package (`@civ-clone/protocol-state`)
- Status: types, schemas, tests complete; 23/23 passing
- No further action needed for this phase

**WP-002: Action DTO boundary (Finding 1)**
- Implement adapter functions: `describePlayerAction()`, `describeUnitActions()`
- Integrate into snapshot exporter
- Tests: descriptor accuracy, round-trip within session
- Dependency: None (can use ephemeral IDs temporarily)
- **Duration estimate:** 2–3 days
- **Ownership:** engine boundary package

**WP-002b: Stable ID foundation (Finding 2 Phase 1)**
- Add `stableId` field + `getStableId()` method to all DataObject subclasses
- Implement hybrid strategy: semantic for tiles/players, UUID for units/cities
- Tests: collision-free, save/load survival (if persisting), determinism (if semantic)
- Dependency: None (parallel with WP-002)
- **Duration estimate:** 2–3 days
- **Ownership:** core-data-object + domain packages

**WP-003: Action ingress engine handler (Finding 1 Phase 2)**
- Implement `onActionCommand()` in engine boundary
- Resolve player actions by `(tier, actionType, valueId)` lookup
- Resolve unit actions by `(unitId, actionType, fromTile, toTile)` lookup
- Tests: both tier resolution paths, idempotency, ordering
- Dependency: WP-002 (action DTOs must be finalized)
- **Duration estimate:** 2–3 days
- **Ownership:** engine boundary package

### Phase 2 (State export & sync — WP-004 through WP-005)

**WP-004: Snapshot exporter (Finding 3 Phase 1)**
- Build ID-indexed projections from registries
- Populate `entities`, `indexes`, `actionsByPlayer`, `unitActionsById`
- Compute checksum (SHA-256 of canonical JSON)
- Tests: export completeness, index correctness, stability
- Dependency: WP-002 (stable IDs available)
- **Duration estimate:** 2–3 days
- **Ownership:** engine boundary package

**WP-005: Delta exporter (Finding 3 Phase 2)**
- Track state changes between snapshots
- Emit JSON patches (set, remove, arrayPush, arrayRemoveItem)
- Optimize: only export changed entities
- Tests: patch validity, round-trip correctness
- Dependency: WP-004 (snapshot exporter)
- **Duration estimate:** 2–3 days
- **Ownership:** engine boundary package

### Phase 3 (Quality & Determinism — WP-006 through WP-007)

**WP-006: Seeded RNG integration (Finding 4)**
- Create SeededRNG abstraction (xorshift64* or similar)
- Inject into Spaceship, PlayerTradeRates, and other stochastic entities
- Derive seed from match/turn/player state (SHA-256)
- Tests: determinism (same seed → same outcome), entropy
- Dependency: None (can be done in parallel; no breaking changes to existing API)
- **Duration estimate:** 1–2 days
- **Ownership:** domain packages + engine initialization

**WP-007: Registry lifecycle & test infrastructure (Finding 6 Phase 1)**
- Add `reset()` method to all 22 singleton registries
- Create test setup helpers (beforeEach hook that calls all reset methods)
- Verify match-to-match isolation
- Tests: no state leakage between tests
- Dependency: None
- **Duration estimate:** 1 day
- **Ownership:** test infrastructure

### Phase 4 (Optional / Deferred — WP-008 onwards)

**WP-008: Action manifest extractor (Finding 5) ✅ DONE**
- `buildActionManifest(snapshot)` extracts stable, de-duplicated manifest from snapshot action descriptors
- Included in `SnapshotEnvelope` by default; opt-out via `includeActionManifest: false`
- Schema coverage: `actionManifestEntrySchema`, `actionManifestEnvelopeSchema` in `@civ-clone/protocol-state`
- 71 engine-adapter tests + 35 protocol-state tests passing
- Commit: `4675ff2`

**WP-009: Validation Boundary Layer (architectural WP-009) ✅ DONE**
- Added `ValidationBoundary` ingress/egress validation wired to `SCHEMA_INVALID` protocol boundary code
- Added boundary schema coverage tests and throughput benchmark runner
- Dependency: WP-001 ✅ (`validate()` helper in protocol-state)
- Commit: `8fb629d`

**WP-010: Observability and Replay Harness (architectural WP-010) ✅ DONE**
- Added structured observability sinks and event stream integration in action/snapshot/delta paths
- Added deterministic `ReplayHarness` for command stream replay + checksum verification
- Added `buildReproPacket(...)` for minimal repro artifact exports

**WP-011: Migration adapters and cutover (architectural WP-011)**
- Implement legacy-to-envelope adapters and subsystem-by-subsystem rollout
- Add targeted shadow checks for parity during migration
- **Priority:** High — primary remaining delivery lane
- **Status:** IN PROGRESS — units subsystem adapter + cutover hooks implemented in engine-adapter

**WP-012: Per-match registry container (Finding 6 Phase 2)**
- Implement RegistryContainer for multiplayer server scenarios
- Use context variable (Node.js AsyncLocalStorage or similar)
- Dependency: multiplayer server implementation
- **Priority:** Low (deferred until multiplayer work begins)

## Quick prioritization summary

> WP numbers align with `docs/planning/renderer-engine-work-packages-v1.md` (canonical).
> WP-002b is a tactical sub-step of WP-002 not listed in the architectural doc.

| WP | Finding / Scope | Phase | Duration | Blocker? | Start after | Status |
|---|---|---|---|---|---|---|
| WP-001 | Proto state | 1 | — | None | NOW | ✅ DONE |
| WP-002 | Action DTO | 1 | 2–3d | None | WP-001 ✅ | ✅ DONE |
| WP-002b | Stable IDs | 1 | 2–3d | None | WP-001 ✅ (parallel) | ✅ DONE |
| WP-003 | Action handler | 1 | 2–3d | WP-002 | WP-002 | ✅ DONE |
| WP-004 | Snapshot export | 2 | 2–3d | WP-002b | WP-002b | ✅ DONE |
| WP-005 | Delta export | 2 | 2–3d | WP-004 | WP-004 | ✅ DONE |
| WP-006 | Seeded RNG | 3 | 1–2d | None | Parallel | ✅ DONE |
| WP-007 | Registry lifecycle | 3 | 1d | None | Parallel | ✅ DONE |
| WP-008 | Action manifest | 4 | 1d | WP-002 | After MVP | ✅ DONE |
| WP-009 | Validation boundary | 4 | 1–2d | None | WP-001 ✅ | ✅ DONE |
| WP-010 | Observability / Replay | 4 | 2–3d | None | WP-009 | ✅ DONE |
| WP-011 | Migration / Cutover | 5 | ongoing | None | WP-010 | 🚧 IN PROGRESS |
| WP-012 | Registry container | 5 | 1–2d | Multiplayer | Multiplayer design | ⏳ |

## Critical path (minimum for MVP)

```
WP-001 ✅
  ↓
WP-002 (Action DTO) + WP-002b (Stable IDs) [parallel]
  ↓
WP-003 (Action handler)
  ↓
WP-004 (Snapshot exporter)
```

**Total:** ~2 weeks for a working, deterministic action/state protocol with snapshots.

Parallel tracks (WP-006, WP-007) can run in weeks 1–2 without blocking the critical path.

## Documentation references

- **All findings:** `docs/planning/engineering-review.md` (872 lines, fully detailed)
- **Protocol spec:** `docs/architecture/renderer-engine-protocol-v1.md`
- **Work breakdown:** `docs/planning/renderer-engine-work-packages-v1.md`
- **Decisions:** `docs/adr/renderer-engine-v1-decisions.md` (DEC-001 through DEC-014)
- **Source audit:** `docs/planning/source-model-audit.md`
- **Agent notes:** `.github/agent-notes/civ-clone-source-context.md`
- **Agent startup:** `.github/STARTUP_NOTE.md`

## Hand-off readiness

All work packages are ready for implementation by human engineers or AI agents. Each package includes:
- Clear problem statement and rationale
- Recommended approach with trade-offs
- Specific files/classes to modify
- Test coverage expectations
- Dependency order and blocking relationships
- Estimated duration

No further architecture discussions needed unless new constraints emerge.





