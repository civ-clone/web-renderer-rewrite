/**
 * @civ-clone/engine-adapter
 *
 * Engine boundary adapter: converts live engine objects to transport-safe protocol DTOs.
 *
 * Public API:
 * - `describePlayerAction(action)`  → PlayerActionDescriptor
 * - `describePlayerActions(player)` → PlayerActionDescriptor[]
 * - `describeUnitAction(action)`    → UnitActionDescriptor
 * - `describeUnitActions(unit)`     → UnitActionDescriptor[]
 */

// Player action adapters
export {
  describePlayerAction,
  describePlayerActions,
} from "./player-action-adapter.js";

// Unit action adapters
export {
  describeUnitAction,
  describeUnitActions,
} from "./unit-action-adapter.js";

export {
  ActionCommandHandler,
  type ActionCommandHandlerContext,
} from "./action-command-handler.js";

export {
  SnapshotExporter,
  type SnapshotExporterContext,
} from "./snapshot-exporter.js";

export { buildActionManifest } from "./action-manifest.js";

export {
  ValidationBoundary,
  BOUNDARY_ERROR_CODES,
  type BoundaryErrorCode,
  type BoundaryValidationResult,
} from "./validation-boundary.js";

export {
  InMemoryObservabilitySink,
  NoopObservabilitySink,
  createObservabilityEvent,
  type ObservabilityEvent,
  type ObservabilitySink,
} from "./observability.js";

export {
  ReplayHarness,
  type ReplayCommandStreamEntry,
  type ReplayHarnessContext,
  type ReplayFailure,
  type ReplayRunOptions,
  type ReplayRunSummary,
} from "./replay-harness.js";

export {
  buildReproPacket,
  type ReplayFailurePacket,
} from "./repro-packet.js";

export {
  buildMigrationParityReport,
  type MigrationParityReport,
  type SubsystemParitySummary,
} from "./migration-parity-report.js";

export {
  buildAdditionalDataBridge,
  type AdditionalDataBridgeOptions,
  type AdditionalDataBridgeResult,
} from "./additional-data-bridge.js";

export {
  cutoverMode,
  shouldUseMigratedPath,
  shouldShadowCompare,
  type SubsystemName,
  type CutoverMode,
  type MigrationCutoverConfig,
} from "./migration-cutover.js";

export {
  DefaultUnitsMigrationAdapter,
} from "./units-migration-adapter.js";

export {
  DefaultCitiesMigrationAdapter,
} from "./cities-migration-adapter.js";

export type {
  MigrationTile,
  MigrationPlayer,
  MigrationUnit,
  MigrationUnitAction,
  UnitsMigrationAdapter,
  MigrationCity,
  CitiesMigrationAdapter,
} from "./migration-types.js";

export {
  RegistryContainer,
  withRegistryContainer,
  getRegistryContainer,
  requireRegistryContainer,
} from "./registry-container.js";

export { DeltaExporter } from "./delta-exporter.js";

export {
  createDeterministicRng,
  deriveDeterministicSeed,
  type SeededRng,
} from "./deterministic-rng.js";

export {
  RegistryLifecycle,
  resetRegistries,
  type ResettableRegistry,
} from "./registry-lifecycle.js";



