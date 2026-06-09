# Startup Note (Agents)

Last updated: 2026-06-09

Use this as the first read before making protocol or engine-boundary changes.

## Quick checklist

- Read `README.md` docs links.
- Read `.github/agent-notes/civ-clone-source-context.md`.
- Read `docs/planning/source-model-audit.md`.
- Read `docs/adr/renderer-engine-v1-decisions.md`.
- Confirm protocol package status in `packages/protocol-state`.

## Where to find real source of truth

- Direct packages: `node_modules/@civ-clone/*`
- Transitive packages (pnpm virtual store):
  - `node_modules/.pnpm/@civ-clone+<package>@<version>/node_modules/@civ-clone/<package>/...`

## High-signal files for action contract work

- `node_modules/@civ-clone/core-player/PlayerAction.ts`
- `node_modules/@civ-clone/core-player/MandatoryPlayerAction.ts`
- `node_modules/@civ-clone/civ1-*/PlayerActions.ts`
- `node_modules/@civ-clone/civ1-*/Rules/Player/Action.ts`

## High-signal files for state/registry work

- `node_modules/@civ-clone/core-registry/EntityRegistry.ts`
- `node_modules/@civ-clone/core-unit/UnitRegistry.ts`
- `node_modules/@civ-clone/core-city/CityRegistry.ts`
- `node_modules/@civ-clone/core-data-object/DataObject.ts`

## Current contract posture

- Keep envelope validation generic at boundary level.
- Harden strict field schemas only after each domain adapter is mapped.
- Avoid shipping class instances/functions/cyclic graphs over renderer boundary.

## Practical caveats

- Some search helpers miss `node_modules` + `.pnpm` paths; prefer Python globbing when needed.
- Prefer `create_file` / `insert_edit_into_file` / `apply_patch` for file edits; avoid shell redirection (`cat > file`, heredocs) unless absolutely necessary.
- zsh can mis-handle some heredoc or special characters; use quoted heredocs.
- pnpm scoped package folders are encoded as `@scope+name@version`.
