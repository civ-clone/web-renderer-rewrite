# AGENTS.md: AI Agent Guide for web-renderer-rewrite

Quick reference index for AI agents. Start here, then read `docs/getting-started.md` for detailed onboarding context.

---

## High-Level Overview

This monorepo implements the **renderer-engine protocol v1** — a state-normalized async boundary replacing cyclic object graphs with ID-indexed DTOs. The engine stays authoritative; the renderer hydrates from normalized snapshots and applies deltas.

**Before making changes:** Read `docs/getting-started.md` for essential context (pnpm pathing, action/registry models, source discovery).

## Architecture (3-Package Pattern)

```
engine-adapter/       → Converts engine objects to transport DTOs; handles ActionCommand ingress
  ├─ SnapshotExporter → Builds normalized StateEnvelope from registries
  ├─ DeltaExporter    → Computes JSON patches between snapshots
  └─ ActionCommandHandler → Resolves & executes commands, routes to legacy/migrated subsystems

protocol-state/       → Shared types, Zod schemas, validation boundaries
  └─ SnapshotEnvelope, DeltaEnvelope, ActionCommand, ActionResult

renderer-state/       → Client-side read model; hydrates from snapshots, applies deltas
  └─ RendererStore.hydrate() / applyDelta()
```

**Why separate?** Engine stays authoritative with no cyclic references. Renderer hydrates from normalized state. Transport is swappable without breaking domain types.

## Protocol & Data Patterns

- **Entity IDs are strings** (`player:1`, `unit:234`, `city:88`), stable for entity lifetime
- **State is fully normalized** (`entities.units[unitId]`, `indexes.unitsByPlayer[playerId]`, never direct refs)
- **Commands flow:** `ActionCommand` → engine handler → `ActionResult` ack, then state update sent as `DeltaEnvelope`
- **No optimistic UI** — renderer waits for engine result before applying state (simplicity > latency in local/host modes)
- **Dynamic tables** — `registerAdditionalData` providers can inject extra entity tables/indexes; renderer discovers them generically via `getAdditionalEntityTables()` / `getAdditionalIndexes()`

Read: `docs/architecture/renderer-engine-protocol-v1.md` for the full 60-point specification.

## Critical Code Patterns

### Context-Based Dependency Injection
Commands and snapshots need game context (registries, RNG, subsystem adapters). Pass via `*Context` interfaces:
```ts
// ActionCommandHandlerContext: getPlayerActions(), getUnitActions(), executePlayerAction(), etc.
// SnapshotExporterContext: getPlayers(), getUnits(), getCities(), getAdditionalEntityTables()
```
Never global state; always async-local or passed explicitly for test isolation.

### Migration Cutover Pattern
Subsystems roll out via `legacy` → `shadow` → `migrated` modes, not big-bangs:
- `cutoverMode: "legacy"` → old behavior only
- `cutoverMode: "shadow"` → both paths run; emit parity telemetry to `buildMigrationParityReport()`
- `cutoverMode: "migrated"` → new path only

See: `packages/engine-adapter/src/migration-cutover.ts`, `units-migration-adapter.ts`.

### Adapter Factories
Classes like `SnapshotExporter`, `ActionCommandHandler` accept optional `*Adapter` parameters:
```ts
snapshotExporter = new SnapshotExporter();
snapshotExporter.buildSnapshot({
  …context,
  unitsAdapter: customUnitsAdapter,  // swappable
  citiesAdapter: customCitiesAdapter,
  cutover: { mode: "shadow", … },
});
```

### Type-Safe Boundaries
All trust boundaries use `ValidationBoundary` + Zod schemas:
```ts
const result = boundary.validateInboundMessage(rawData);
if (!result.ok) {
  // result.errorCode: "SCHEMA_INVALID", result.errors: string[]
}
```

**Current validation posture (important):**
- Keep envelope validation **generic** at boundary level during subsystem rollout
- Harden strict field schemas **only after** each domain adapter (actions, cities, units) is fully mapped
- Avoid shipping class instances, functions, or cyclic graphs over the renderer boundary

## Developer Workflows

### Build & Dev
```bash
# Root monorepo
pnpm build              # tsc --build + esbuild frontend/backend
pnpm build:dev          # unminified, sourcemaps
pnpm watch              # esbuild watch mode (frontend only)

# Per-package (engine-adapter example)
cd packages/engine-adapter
pnpm build              # tsc --build
pnpm test               # vitest run (includes __tests__/*.test.ts)
pnpm lint               # tsc --noEmit (type check only)
```

### Testing
- Tests live in `**/__tests__/*.test.ts` (not separate `*.spec.ts`)
- Vitest config: `globals: true`, environment: `node`
- Use `RegistryLifecycle.resetAll()` or mock per-test to isolate global registries
- Example demos: `pnpm wp006:demo`, `pnpm wp010:demo`, etc. (see package.json scripts)

### Linting & Format
```bash
pnpm lint               # prettier --check, tsc
pnpm prettier:format    # apply prettier
```

## When Adding Features

1. **Protocol changes?** Add to `protocol-state/src/schemas.ts` + update `TestData` fixtures
2. **New engine subsystem?** Implement adapter in `engine-adapter/src/`, add migration cutover boilerplate, shadow-compare tests
3. **Client-side logic?** Add to `renderer-state/src/renderer-store.ts`, test patch operations in `__tests__/`
4. **New entity type?** Register in `SnapshotExporterContext`, add to `entities` + `indexes` discovery, update `ValidationBoundary` schema

## Monorepo Conventions

- **pnpm workspace** — all packages must export `dist/index.js` + `dist/index.d.ts` from `src/index.ts`
- **tsconfig.json** — root is parent (no emit); package-level tsconfigss in `packages/*/tsconfig.json`
- **Module type** — all packages are `"type": "module"` (ESM); use `.js` in imports
- **No circular deps** — `protocol-state` ← `engine-adapter` ← (domain engines); unidirectional

## Documentation Index

| Document | Purpose |
|----------|---------|
| **docs/getting-started.md** | ⭐ **Start here**: Pnpm discovery, action/registry models, source context |
| `docs/architecture/renderer-engine-protocol-v1.md` | Full 60-point protocol spec with versioning, compression, multi-player modes |
| `docs/planning/source-model-audit.md` | Detailed action & registry findings from source code audit |
| `docs/adr/renderer-engine-v1-decisions.md` | Architectural decision rationale (optimistic UI policy, delta retention, RNG scope, etc.) |
| `docs/planning/implementation-roadmap.md` | Work package sequencing (WP-001 through WP-013) with ownership & dependencies |

## Agent-Specific Editing Workflow

- Prefer structured edit tools (`create_file`, `insert_edit_into_file`, `apply_patch`) over shell file writes
- Avoid shell redirection (`cat > file`, heredocs) unless absolutely necessary
- zsh can mis-handle `!` and heredoc edge cases; use quoted heredocs or Python scripts when needed
- Keep edits minimal and localized; avoid broad reformatting unless requested
- Avoid interactive pagers in automation: use `git --no-pager <command>` and `GH_PAGER=cat gh <command>`

## Key Code Paths

| File | Purpose |
|------|---------|
| `packages/engine-adapter/src/index.ts` | Public exports; entry point for all adapter features |
| `packages/engine-adapter/src/action-command-handler.ts` | Command ingress & action resolution |
| `packages/engine-adapter/src/snapshot-exporter.ts` | State export & normalization |
| `packages/protocol-state/src/schemas.ts` | Zod schema source of truth |
| `packages/renderer-state/src/renderer-store.ts` | Client store: hydrate & apply deltas |

## Observability & Debugging

Capture and replay:
- `InMemoryObservabilitySink` — structured event logging (`command.received`, `snapshot.exported`, `delta.exported`)
- `ReplayHarness` — deterministic command stream replay with checksum verification
- `buildReproPacket(...)` — export minimal repro artifacts for debugging

See: `packages/engine-adapter/src/observability.ts` and `replay-harness.ts`.

## Important Guardrails

- ❌ **Never store object references** in snapshot payloads; use ID strings with `Ids` suffix
- ❌ **Never mutate returned state** objects; treat as immutable; deltas compute diffs by comparing snapshots
- ❌ **Always use ValidationBoundary** on untrusted input (idempotency keys, actor IDs, command payloads)
- ❌ **Don't assume fixed entity tables**; use `listTable()` generically; dynamic tables discovered via protocol
- ❌ **Don't call registries directly** in command handlers; use `RegistryContainer` for per-match isolation

## Architectural Notes

- **Greenfield project** — No legacy data concerns; domain packages can be refactored if needed
- **State objects are ephemeral DTOs** — Reified via `DataObject.toPlainObject()`, never mutated
- **RNG determinism is aspirational** — Currently unused; useful for testing, replay, world generation consistency
- **Pessimistic UX** — Renderer waits for `ActionResult` ACK before applying state (simplicity over latency)

---

**Last updated:** 2026-06-10  
**Next:** Read `docs/getting-started.md` for onboarding context.



