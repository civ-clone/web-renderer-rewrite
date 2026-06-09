# Source Model Audit: Actions and Registries

Status: Draft  
Last updated: 2026-06-09

Companion agent context note: `.github/agent-notes/civ-clone-source-context.md`

## Why this audit exists

Before hard-freezing protocol entity shapes, we should derive contracts from the real engine model:

- `node_modules/@civ-clone/civ1-*/PlayerActions.ts`
- `node_modules/@civ-clone/core-*/*Registry.ts`

This avoids baking assumptions into `@civ-clone/protocol-state` too early.

## Findings: PlayerActions in civ1 packages

Detected `PlayerActions.ts` files:

- `node_modules/@civ-clone/civ1-government/PlayerActions.ts`
- `node_modules/@civ-clone/civ1-player/PlayerActions.ts`
- `node_modules/@civ-clone/civ1-science/PlayerActions.ts`
- `node_modules/@civ-clone/civ1-spaceship/PlayerActions.ts`
- `node_modules/@civ-clone/civ1-trade-rate/PlayerActions.ts`
- `node_modules/@civ-clone/civ1-treasury/PlayerActions.ts`
- `node_modules/@civ-clone/civ1-unit/PlayerActions.ts`

### Action taxonomy (from rules and action classes)

| Action type | Mandatory? | `value()` shape today | Source |
|---|---|---|---|
| `EndTurn` | Yes | `null` | `civ1-player/Rules/Player/Action.ts` + base action class |
| `ChooseResearch` | Yes | `PlayerResearch` object | `civ1-science/Rules/Player/Action.ts` |
| `ActiveUnit` | Yes | `Unit` object | `civ1-unit/Rules/Player/Action.ts` |
| `InactiveUnit` | No | `Unit` object | `civ1-unit/Rules/Player/Action.ts` |
| `Revolution` | No | `PlayerGovernment` object | `civ1-government/Rules/Player/Action.ts` |
| `AdjustTradeRates` | No | `PlayerTradeRates` object | `civ1-trade-rate/Rules/Player/Action.ts` |
| `LaunchSpaceship` | No | `Spaceship` object | `civ1-spaceship/Rules/Player/Action.ts` |
| `CompleteProduction` | No | `CityBuild` object | `civ1-treasury/Rules/Player/Action.ts` |

## Findings: Registry model in core packages

Registry classes are strongly object-instance based (`EntityRegistry`), not ID-index based:

- `node_modules/@civ-clone/core-registry/EntityRegistry.ts`
- `node_modules/@civ-clone/core-registry/ConstructorRegistry.ts`

Domain registries are thin wrappers over object identity lookups, for example:

- `node_modules/@civ-clone/core-unit/UnitRegistry.ts` (`getByPlayer(player)`, `getByTile(tile)`)
- `node_modules/@civ-clone/core-city/CityRegistry.ts` (`getByPlayer(player)`, `getByTile(tile)`)
- `node_modules/@civ-clone/core-science/PlayerResearchRegistry.ts` (`getByPlayer(player)`)

## Cycle pressure points (today)

The current model carries rich object references that naturally form cycles:

- `Unit -> player() -> Player` and `Unit -> tile() -> Tile` (`core-unit/Unit.ts`)
- `City -> player() -> Player`, `City -> tile() -> Tile` (`core-city/City.ts`)
- `PlayerResearch -> player() -> Player` (`core-science/PlayerResearch.ts`)
- `PlayerGovernment -> player() -> Player` (`core-government/PlayerGovernment.ts`)
- `Spaceship -> player() -> Player` (`core-spaceship/Spaceship.ts`)

This validates your concern about recursive serialization and memory issues.

## Recommended protocol direction (updated)

1. Keep `SnapshotEnvelope.entities` and `indexes` generic for now.
2. Stabilize action contracts first as `{ actionType, mandatory, valueType?, valueId? }`.
3. Build per-registry adapters (`UnitRegistry`, `CityRegistry`, etc.) that emit normalized records.
4. Introduce strict per-domain schemas only after each adapter is implemented and tested.

## Engine change suggestions (to make migration easier)

If we can change engine internals early, these will reduce migration friction:

1. Add explicit stable IDs on every object type in action payload paths (not just `DataObject#id()`).
2. Add a small adapter API in each core domain package:
   - `toStateRecord(entity): Record<string, unknown>`
   - `toRef(entity): { valueType: string; valueId: string }`
3. Add action metadata helper (or static fields) on player action classes:
   - `actionType`
   - `mandatory`
   - `valueType`
4. Keep object-heavy rule execution internal, and expose only normalized boundary objects.

## Implications for `@civ-clone/protocol-state`

- `packages/protocol-state/src/schemas.ts` should remain permissive at the envelope layer.
- Boundary validation should focus on envelope integrity, ordering, and discriminants.
- Domain strictness should move into adapter-level schema modules in later work packages.

## Next implementation slice

1. WP-002: action ingress + idempotency using `actionType` and `valueId` references.
2. WP-004: snapshot adapter for `UnitRegistry` and `CityRegistry` as first concrete tables.
3. WP-005: delta emission for those two tables only (iterate domain by domain).


