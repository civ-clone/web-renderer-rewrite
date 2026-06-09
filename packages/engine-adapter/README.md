# @civ-clone/engine-adapter

Action/state adapter layer for renderer-engine boundaries (WP-002 through WP-012).

It provides:

- `describePlayerAction(action)` -> `PlayerActionDescriptor`
- `describePlayerActions(player)` -> `PlayerActionDescriptor[]`
- `describeUnitAction(action)` -> `UnitActionDescriptor`
- `describeUnitActions(unit)` -> `UnitActionDescriptor[]`
- `ActionCommandHandler` / `ActionCommandHandlerContext`
- `SnapshotExporter` / `SnapshotExporterContext`
- `buildActionManifest(snapshot)`
- `ValidationBoundary` / `BOUNDARY_ERROR_CODES` / `BoundaryValidationResult`
- `InMemoryObservabilitySink` / `NoopObservabilitySink`
- `ReplayHarness` / `buildReproPacket(...)`
- `buildMigrationParityReport(events)`
- `buildAdditionalDataBridge(...)`
- `DefaultUnitsMigrationAdapter` / `DefaultCitiesMigrationAdapter` + cutover helpers (`cutoverMode`, `shouldUseMigratedPath`, `shouldShadowCompare`)
- `RegistryContainer` / `withRegistryContainer(...)` / `requireRegistryContainer()`
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
- Supports additional dynamic table/index providers via `getAdditionalEntityTables()` and `getAdditionalIndexes()`
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

## WP-009 validation boundary

`ValidationBoundary` validates raw unknown payloads at protocol trust boundaries before any domain logic runs:

- `validateInboundMessage(raw)` — validates against full `RendererMessage` discriminated union
- `validateOutboundMessage(raw)` — validates against full `EngineMessage` discriminated union
- `validateActionCommand(raw)` — standalone `ActionCommand` validation (convenience)
- `validateTurnEndRequest(raw)` — standalone `TurnEndRequest` validation
- `validateSnapshot(raw)` — standalone `SnapshotEnvelope` validation
- `validateDelta(raw)` — standalone `DeltaEnvelope` validation
- `validateActionResult(raw)` — standalone `ActionResult` validation
- `validateTurnEndResult(raw)` — standalone `TurnEndResult` validation

All methods return `BoundaryValidationResult<T>` — never throw. Failures carry `SCHEMA_INVALID` error code and a list of field-level error strings.

Typical ingress call chain:

```ts
const msg = boundary.validateInboundMessage(rawMessage);
if (!msg.ok) return sendError(msg.errorCode, msg.errors);

if (msg.data.type === "action") {
  const result = handler.onActionCommand(msg.data.payload, context);
  // ...
}
```

## WP-010 observability and replay harness

- `InMemoryObservabilitySink` captures structured events (`command.received`, `command.result`, `snapshot.exported`, `delta.exported`, `replay.*`)
- `ActionCommandHandler`, `SnapshotExporter`, and `DeltaExporter` emit observability events when a sink is provided
- `ReplayHarness#run(stream, context, options)` replays deterministic command streams and verifies final checksum expectations
- `buildReproPacket(...)` exports a minimal repro artifact: summary + command stream + recent observability events

## WP-011 migration adapters and cutover

- `MigrationCutoverConfig` controls subsystem rollout mode: `legacy`, `migrated`, `shadow`
- `DefaultUnitsMigrationAdapter` and `DefaultCitiesMigrationAdapter` provide concrete migrated subsystem serializers
- `SnapshotExporter` accepts optional `cutover`, `unitsAdapter`, and `citiesAdapter` hooks
- `ActionCommandHandler` accepts optional `cutover` + `unitsAdapter` hooks for unit command resolution routing
- `shadow` mode keeps legacy behavior active while emitting parity telemetry for migration checks
- `buildMigrationParityReport(events)` aggregates shadow parity telemetry into subsystem mismatch summaries

## WP-012 per-match registry container (phase start)

- `RegistryContainer` stores per-match registry instances by name
- `withRegistryContainer(container, fn)` binds the container to current async flow using `AsyncLocalStorage`
- `requireRegistryContainer()` reads current match container safely in async code
- Supports parallel match isolation and nested context scopes

## WP-013 AdditionalData rendering bridge

- `buildAdditionalDataBridge(...)` normalizes dynamic entity/index tables from `registerAdditionalData`-style providers
- Enforces protected core name collision checks by default (`players`, `units`, `cities`, and core indexes)
- `SnapshotExporter` consumes dynamic table/index hooks through deterministic merge behavior

## Development

```bash
pnpm build
pnpm test
pnpm lint
pnpm wp006:demo
pnpm wp009:bench
pnpm wp010:demo
pnpm wp011:demo
pnpm wp012:demo
pnpm wp013:demo
```




