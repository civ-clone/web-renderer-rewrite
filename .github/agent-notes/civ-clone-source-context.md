# Agent Context: civ-clone Source Discovery Notes

Last updated: 2026-06-09

This file captures practical context for future agents working on renderer/engine protocol migration.

## 1) pnpm pathing: where transitive `@civ-clone` modules actually live

In this workspace, top-level direct dependencies are available at:

- `node_modules/@civ-clone/<package>/...`

But many action packages are transitive and only present in pnpm's virtual store:

- `node_modules/.pnpm/@civ-clone+<package>@<version>/node_modules/@civ-clone/<package>/...`

Examples used during audit:

- `node_modules/.pnpm/@civ-clone+base-player-action-end-turn@0.1.0/node_modules/@civ-clone/base-player-action-end-turn/EndTurn.ts`
- `node_modules/.pnpm/@civ-clone+base-player-action-active-unit@0.1.1/node_modules/@civ-clone/base-player-action-active-unit/ActiveUnit.ts`
- `node_modules/.pnpm/@civ-clone+base-player-action-adjust-trade-rates@0.1.1/node_modules/@civ-clone/base-player-action-adjust-trade-rates/AdjustTradeRates.ts`

Rule of thumb:

1. Check `node_modules/@civ-clone/*` first.
2. If import target is missing there, search under `node_modules/.pnpm/`.

## 2) Reliable discovery commands

Use Python globbing if shell/search behaves unexpectedly:

```bash
python3 - <<'PY'
from pathlib import Path
root = Path('/Users/dom111/Code/civ-clone/web-renderer-rewrite/node_modules/@civ-clone')
for p in sorted(root.glob('*/PlayerActions.ts')):
    print(p)
PY
```

```bash
python3 - <<'PY'
from pathlib import Path
root = Path('/Users/dom111/Code/civ-clone/web-renderer-rewrite/node_modules/@civ-clone')
for p in sorted(root.glob('core-*/*Registry.ts')):
    print(p)
PY
```

```bash
python3 - <<'PY'
from pathlib import Path
root = Path('/Users/dom111/Code/civ-clone/web-renderer-rewrite/node_modules/.pnpm')
for p in root.glob('@civ-clone+base-player-action-end-turn@*/node_modules/@civ-clone/base-player-action-end-turn/EndTurn.ts'):
    print(p)
PY
```

## 3) Action model notes (important)

Canonical action base types:

- `node_modules/@civ-clone/core-player/PlayerAction.ts`
- `node_modules/@civ-clone/core-player/MandatoryPlayerAction.ts`

Key behavior:

- `PlayerAction<T>` stores `player` and `value` as object references.
- `MandatoryPlayerAction<T>` is only a subclass marker.
- Mandatory/optional status is determined by action class inheritance and action rules.

Concrete action findings from civ1 rules:

- Mandatory examples:
  - `EndTurn` (`MandatoryPlayerAction`, value often `null`)
  - `ChooseResearch` (`MandatoryPlayerAction`)
  - `ActiveUnit` (`MandatoryPlayerAction<Unit>`)
- Optional examples:
  - `InactiveUnit` (`PlayerAction<Unit>`)
  - `Revolution` (`PlayerAction<PlayerGovernment>`)
  - `AdjustTradeRates` (`PlayerAction<PlayerTradeRates>`)
  - `LaunchSpaceship` (`PlayerAction<Spaceship>`)
  - `CompleteProduction` (`PlayerAction<CityBuild>`)

## 4) Registry shape notes

Core registry foundation:

- `node_modules/@civ-clone/core-registry/EntityRegistry.ts`
- `node_modules/@civ-clone/core-registry/ConstructorRegistry.ts`

Current model is object-instance based:

- Registries store object instances, not IDs.
- Query methods often compare by object identity, e.g. `unit.player() === player`.
- Many domain registries export singleton `instance` values.

Domain registry examples:

- `node_modules/@civ-clone/core-unit/UnitRegistry.ts`
- `node_modules/@civ-clone/core-city/CityRegistry.ts`
- `node_modules/@civ-clone/core-science/PlayerResearchRegistry.ts`
- `node_modules/@civ-clone/core-government/PlayerGovernmentRegistry.ts`

## 5) Entity/reference cycle hotspots

Core entities are `DataObject`-based and frequently reference each other:

- `Unit -> player() -> Player`, `Unit -> tile() -> Tile`, `Unit -> city() -> City`
- `City -> player() -> Player`, `City -> tile() -> Tile`
- `PlayerResearch -> player() -> Player`
- `PlayerGovernment -> player() -> Player`
- `Spaceship -> player() -> Player`

References:

- `node_modules/@civ-clone/core-data-object/DataObject.ts`
- `node_modules/@civ-clone/core-unit/Unit.ts`
- `node_modules/@civ-clone/core-city/City.ts`
- `node_modules/@civ-clone/core-world/Tile.ts`
- `node_modules/@civ-clone/core-science/PlayerResearch.ts`
- `node_modules/@civ-clone/core-government/PlayerGovernment.ts`
- `node_modules/@civ-clone/core-spaceship/Spaceship.ts`

Implication for protocol work:

- Do not ship class instances over renderer boundary.
- Normalize to `{ id, ...fields, ...Id refs }` and action descriptors (`actionType`, mandatory flag, value reference).

## 6) Existing docs to consult before new changes

- `docs/planning/source-model-audit.md`
- `docs/architecture/renderer-engine-protocol-v1.md`
- `docs/adr/renderer-engine-v1-decisions.md`
- `docs/planning/renderer-engine-work-packages-v1.md`

## 7) Investigation caveats encountered

- Some search tooling did not return expected `node_modules` matches with globs; direct file reads and Python globbing were reliable.
- zsh can mis-handle `!` and some heredoc patterns; use quoted heredocs or Python scripts for robust path scanning.
- pnpm store package names encode scoped package names as `@scope+name@version`.

