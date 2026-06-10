# Getting Started: Contributor Onboarding Guide

Last updated: 2026-06-10

This guide consolidates essential context for contributors making protocol and engine-boundary changes. Read in this order before deep work.

## Essential Reading (15-20 minutes)

1. **This document** (practical context + source discovery)
2. **docs/planning/source-model-audit.md** — Action/registry findings from source audit
3. **docs/adr/renderer-engine-v1-decisions.md** — Rationale for architectural decisions
4. **docs/architecture/renderer-engine-protocol-v1.md** — Full 60-point protocol spec
5. `AGENTS.md` (project root) — AI-agent-specific workflow and editing notes

## System Architecture at a Glance

The repo follows a 3-package split to keep engine truth isolated from renderer state:

```
packages/engine-adapter/  -> Engine boundary adapter (command ingress + snapshot/delta export)
packages/protocol-state/  -> Shared protocol types + Zod schemas
packages/renderer-state/  -> Client read model (hydrate/applyDelta)
```

Why this split matters:
- Engine remains authoritative and class-heavy internals stay engine-side
- Renderer consumes normalized DTOs only (no cyclic class graphs over the boundary)
- Transport can change without breaking domain contract types

## Core Protocol and Data Flow

- Entity IDs are strings (`player:1`, `unit:234`, `city:88`) and stable for entity lifetime
- State is normalized (`entities.*` + `indexes.*`), with relationships as `...Id` / `...Ids`
- Command flow is: `ActionCommand` -> engine handler -> `ActionResult` ACK -> snapshot/delta update
- Renderer currently uses pessimistic UX: submit command and wait for ACK before applying changes
- Dynamic data is allowed: additional entity tables/indexes can be discovered via exporter hooks

## Architectural Clarifications

### State Objects Are Ephemeral DTOs

- Objects reified via `DataObject.toPlainObject()` are ephemeral, never mutated after export
- Renderer state objects are immutable; deltas compute diffs by comparing snapshots
- Safe to rely on reference stability within a single snapshot; assume fresh instances on next export

### Greenfield Project with Freedom to Refactor

- No legacy data to preserve; existing save/load systems are unused
- Domain packages can be refactored if needed to avoid cyclic references (though complex across distributed repos)
- Current implementation ships object references; adapter layer handles all normalization

### RNG Determinism: Aspirational, Not Required Yet

- World generation and stochastic processes could benefit from seeded RNG someday
- Currently not enforced; determinism aids testing/replay/debugging
- Revisit when multiplayer consistency requirements tighten

### Command UX: Pessimistic (Submit & Wait)

- Renderer submits `ActionCommand` and waits for `ActionResult` ACK before applying state
- No optimistic UI yet; simplicity prioritized over perceived latency in local/host modes
- Can explore optimistic options if network latency becomes a problem

### RegistryContainer: Per-Match Isolation

- `RegistryContainer` provides async-local scoping for per-match registry instances
- Supports parallel match isolation and nested context scopes
- If documentation/implementation needs improvement, create WP ticket for iteration

## Migration Cutover Pattern

Subsystem migrations are phased (not big-bang):

- `legacy` -> old path only
- `shadow` -> old + new path, emit parity telemetry
- `migrated` -> new path only

See:
- `packages/engine-adapter/src/migration-cutover.ts`
- `packages/engine-adapter/src/units-migration-adapter.ts`
- `packages/engine-adapter/src/cities-migration-adapter.ts`

## Source Code Discovery

### pnpm Monorepo Structure

Direct dependencies are at:
```
node_modules/@civ-clone/<package>/...
```

But many transitive packages only exist in pnpm's virtual store:
```
node_modules/.pnpm/@civ-clone+<package>@<version>/node_modules/@civ-clone/<package>/...
```

**Rule of thumb:**
1. Check `node_modules/@civ-clone/*` first
2. If missing, search under `node_modules/.pnpm/`

### Reliable Discovery Commands

When shell globbing misses `.pnpm` paths, use Python:

```bash
# Find all PlayerActions.ts files
python3 - <<'PY'
from pathlib import Path
root = Path('node_modules/@civ-clone')
for p in sorted(root.glob('*/PlayerActions.ts')):
    print(p)
PY
```

```bash
# Find all *Registry.ts files in core packages
python3 - <<'PY'
from pathlib import Path
root = Path('node_modules/@civ-clone')
for p in sorted(root.glob('core-*/*Registry.ts')):
    print(p)
PY
```

```bash
# Find specific transitive package (e.g., base-player-action-end-turn)
python3 - <<'PY'
from pathlib import Path
root = Path('node_modules/.pnpm')
for p in root.glob('@civ-clone+base-player-action-end-turn@*/node_modules/@civ-clone/base-player-action-end-turn/EndTurn.ts'):
    print(p)
PY
```

## Action Model (Critical Reference)

### Base Classes

- `node_modules/@civ-clone/core-player/PlayerAction.ts` — Generic base
- `node_modules/@civ-clone/core-player/MandatoryPlayerAction.ts` — Mandatory marker

### Key Behavior

- `PlayerAction<T>` stores `player` and `value` as **object references** (must normalize before protocol boundary)
- `MandatoryPlayerAction<T>` is a subclass marker; actual mandatory/optional status determined by inheritance + rules

### Concrete Examples from Civ1

**Mandatory:**
- `EndTurn` (value often `null`)
- `ChooseResearch`
- `ActiveUnit<Unit>`

**Optional:**
- `InactiveUnit<Unit>`
- `Revolution<PlayerGovernment>`
- `AdjustTradeRates<PlayerTradeRates>`
- `LaunchSpaceship<Spaceship>`
- `CompleteProduction<CityBuild>`

### Adapter Pattern

All actions must pass through `describePlayerAction()` / `describeUnitAction()` adapters to normalize references before crossing the renderer boundary. Action descriptors carry:
- `actionType` — stable string identifier
- `mandatory` — boolean flag
- Normalized references (`valueId`, `valueStableId`, etc.)

## Registry Model (Critical Reference)

### Foundation

- `node_modules/@civ-clone/core-registry/EntityRegistry.ts` — Base class
- `node_modules/@civ-clone/core-registry/ConstructorRegistry.ts` — Specialized variant

### Current State

- Registries store **object instances**, not IDs
- Query methods often compare by object identity (e.g., `unit.player() === player`)
- Many registries export `instance` singletons

### Domain Examples

- `node_modules/@civ-clone/core-unit/UnitRegistry.ts`
- `node_modules/@civ-clone/core-city/CityRegistry.ts`
- `node_modules/@civ-clone/core-science/PlayerResearchRegistry.ts`
- `node_modules/@civ-clone/core-government/PlayerGovernmentRegistry.ts`

## Reference Cycles (Why Normalization Matters)

Core entities frequently reference each other:

```
Unit → player() → Player
Unit → tile() → Tile
Unit → city() → City

City → player() → Player
City → tile() → Tile

PlayerResearch → player() → Player
PlayerGovernment → player() → Player
Spaceship → player() → Player
```

Related files:
- `node_modules/@civ-clone/core-data-object/DataObject.ts`
- `node_modules/@civ-clone/core-unit/Unit.ts`
- `node_modules/@civ-clone/core-city/City.ts`
- `node_modules/@civ-clone/core-world/Tile.ts`
- `node_modules/@civ-clone/core-science/PlayerResearch.ts`
- `node_modules/@civ-clone/core-government/PlayerGovernment.ts`
- `node_modules/@civ-clone/core-spaceship/Spaceship.ts`

**Protocol implication:** Always normalize to `{ id, ...fields, ...IdRef }`. Never ship class instances over renderer boundary.

## pnpm Package Naming

- Scoped packages encoded as `@scope+name@version` in `.pnpm` folder names
- Example: `@civ-clone+base-player-action-end-turn@0.1.0`

## Current Contract Posture

### Validation Strategy

- Keep envelope validation **generic** at boundary level during subsystem rollout
- Harden strict field schemas **only after** each domain adapter (actions, cities, units) fully mapped
- Avoid shipping class instances, functions, or cyclic graphs over renderer boundary

### State Normalization

- All entities must have string IDs (`player:1`, `unit:234`, etc.)
- All relationships must be ID references (`...Id` or `...Ids`), never object references
- Dynamic tables/indexes discovered via `getAdditionalEntityTables()` / `getAdditionalIndexes()`

## Developer Workflows

Use these from repo root unless noted.

```bash
pnpm build
pnpm build:dev
pnpm watch
pnpm lint
```

Engine adapter package workflow:

```bash
cd packages/engine-adapter
pnpm build
pnpm test
pnpm lint
pnpm wp006:demo
pnpm wp010:demo
pnpm wp011:demo
pnpm wp012:demo
pnpm wp013:demo
```

Testing conventions:
- Tests live in `**/__tests__/*.test.ts`
- Vitest runs in Node with globals enabled
- Use `RegistryLifecycle.resetAll()` (or equivalent reset strategy) to avoid leaked registry state

## Where to Implement Changes

- Protocol/schema changes: `packages/protocol-state/src/schemas.ts`
- Command ingress or action resolution: `packages/engine-adapter/src/action-command-handler.ts`
- Snapshot or delta behavior: `packages/engine-adapter/src/snapshot-exporter.ts`, `packages/engine-adapter/src/delta-exporter.ts`
- Client state hydration/delta application: `packages/renderer-state/src/renderer-store.ts`

If adding a new engine subsystem, wire cutover mode + shadow parity checks from the start.

## Observability and Replay

- `InMemoryObservabilitySink` captures structured events (`command.*`, `snapshot.exported`, `delta.exported`, `replay.*`)
- `ReplayHarness` replays command streams and verifies final checksums
- `buildReproPacket(...)` exports minimal repro artifacts for debugging

See:
- `packages/engine-adapter/src/observability.ts`
- `packages/engine-adapter/src/replay-harness.ts`

## Monorepo Conventions

- Workspace uses pnpm (`pnpm-workspace.yaml` includes `packages/*`)
- Package outputs should be `dist/index.js` and `dist/index.d.ts` from `src/index.ts`
- Packages are ESM (`"type": "module"`), and local imports use `.js` extension
- Dependency direction is intentional: `protocol-state` <- `engine-adapter` <- domain engines (avoid circular package deps)

## Documentation Map

- `AGENTS.md` — Agent-focused quick index
- `docs/getting-started.md` — This onboarding guide
- `docs/architecture/renderer-engine-protocol-v1.md` — Full protocol contract
- `docs/planning/source-model-audit.md` — Source audit findings and evidence
- `docs/adr/renderer-engine-v1-decisions.md` — Architectural decisions and rationale
- `docs/planning/implementation-roadmap.md` — Work package sequencing

## Quick Reference: High-Signal Files

### For Action Work
- `node_modules/@civ-clone/core-player/PlayerAction.ts`
- `node_modules/@civ-clone/core-player/MandatoryPlayerAction.ts`
- `node_modules/@civ-clone/civ1-*/PlayerActions.ts`
- `node_modules/@civ-clone/civ1-*/Rules/Player/Action.ts`

### For Registry/State Work
- `node_modules/@civ-clone/core-registry/EntityRegistry.ts`
- `node_modules/@civ-clone/core-unit/UnitRegistry.ts`
- `node_modules/@civ-clone/core-city/CityRegistry.ts`
- `node_modules/@civ-clone/core-data-object/DataObject.ts`

### In This Repo (Adapter)
- `packages/engine-adapter/src/action-command-handler.ts` — Command ingress
- `packages/engine-adapter/src/snapshot-exporter.ts` — State export + normalization
- `packages/engine-adapter/src/player-action-adapter.ts` — Player action descriptors
- `packages/engine-adapter/src/unit-action-adapter.ts` — Unit action descriptors

---

**For high-level architecture, see AGENTS.md (project root).**  
**For full protocol details, see docs/architecture/renderer-engine-protocol-v1.md.**



