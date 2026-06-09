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

export { DeltaExporter } from "./delta-exporter.js";

export {
  createDeterministicRng,
  deriveDeterministicSeed,
  type SeededRng,
} from "./deterministic-rng.js";
