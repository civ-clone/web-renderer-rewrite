# @civ-clone/engine-adapter

Action/state adapter layer for renderer-engine boundaries (WP-002 through WP-007).

It provides:

- `describePlayerAction(action)` -> `PlayerActionDescriptor`
- `describePlayerActions(player)` -> `PlayerActionDescriptor[]`
- `describeUnitAction(action)` -> `UnitActionDescriptor`
- `describeUnitActions(unit)` -> `UnitActionDescriptor[]`
- `ActionCommandHandler` / `ActionCommandHandlerContext`
- `SnapshotExporter` / `SnapshotExporterContext`
- `buildActionManifest(snapshot)`
- `DeltaExporter`
- `createDeterministicRng` / `deriveDeterministicSeed`
- `RegistryLifecycle` / `resetRegistries`

## Why this exists

Engine objects are class-heavy and transport-hostile. This package keeps execution in-engine while exposing structured-clone-safe protocol envelopes/commands.

## ID strategy (transition-ready)

During WP-002b rollout, descriptors and commands can carry both:

- Ephemeral IDs (`valueId`, `unitId`) from `DataObject#id()`
- Stable IDs (`valueStableId`, `unitStableId`) when `getStableId()` is available

## WP-003 ingress behavior

`ActionCommandHandler#onActionCommand(command, context)`:

- Resolves player actions by `(actionType, valueStableId|valueId)`
- Resolves unit actions by `(actionType, unitStableId|unitId, fromTileId, toTileId)`
- Enforces idempotency by `commandId`
- Enforces per-player accepted sequence ordering by `clientSeq`
- Validates `matchId` and optional `expectedTurn`
- Optionally annotates results with RNG trace via `context.getRngTrace`

## WP-004 snapshot export

`SnapshotExporter#buildSnapshot(context)`:

- Builds `SnapshotEnvelope` from players/units/cities projections
- Populates `entities`, `indexes`, `requirementsByPlayer`
- Optionally includes `actionsByPlayer` and `unitActionsById`
- Optionally includes `actionManifest` (enabled by default)
- Optionally includes RNG metadata via `context.rng`
- Computes SHA-256 envelope checksum

## WP-008 action manifest

- `buildActionManifest(snapshot)` extracts a deterministic, de-duplicated manifest from `actionsByPlayer` and `unitActionsById`
- Manifest entries expose command-shape hints (`requiresValueRef`, `requiresUnitRef`, `requiresFromTileRef`, `requiresToTileRef`)
- `SnapshotExporter` includes `actionManifest` unless `includeActionManifest: false` is set

## WP-005 delta export

`DeltaExporter#buildDelta(previous, next)`:

- Emits `DeltaEnvelope` from two snapshots
- Validates protocol/match/version continuity
- Generates `set`, `remove`, `arrayPush`, `arrayRemoveItem` patch ops
- Includes `resultChecksum` from the target snapshot

## WP-006 deterministic RNG

- `deriveDeterministicSeed(...parts)` returns SHA-256 hex seed material
- `createDeterministicRng(seed)` returns deterministic xorshift64* RNG
- `rng.next()` yields float in `[0, 1)`
- `rng.nextInt(max)` yields bounded deterministic integer
- `rng.counter()` exposes draw count for trace/debug

## WP-007 registry lifecycle (boundary support)

- `RegistryLifecycle` registers resettable singleton registries and resets them deterministically
- `resetRegistries(...registries)` provides direct reset helper for test hooks
- This package provides orchestration utilities; upstream registry classes still need native `reset()` methods where absent

## Minimal usage

```ts
import {
  ActionCommandHandler,
  SnapshotExporter,
  DeltaExporter,
  deriveDeterministicSeed,
  createDeterministicRng,
  RegistryLifecycle,
} from "@civ-clone/engine-adapter";

const actionHandler = new ActionCommandHandler();
const snapshotExporter = new SnapshotExporter();
const deltaExporter = new DeltaExporter();

const seed = deriveDeterministicSeed("match:abc", 42, "player:1");
const rng = createDeterministicRng(seed);

const lifecycle = new RegistryLifecycle();
lifecycle.register(/* registries with reset() */);
lifecycle.resetAll();

const snapshotA = snapshotExporter.buildSnapshot(contextA);
const snapshotB = snapshotExporter.buildSnapshot(contextB);
const delta = deltaExporter.buildDelta(snapshotA, snapshotB);
```

## Development

```bash
pnpm build
pnpm test
pnpm lint
pnpm wp006:demo
```

