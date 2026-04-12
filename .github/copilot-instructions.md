# web-renderer-rewrite Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-12

## Active Technologies
- TypeScript 4.x (`typescript` from `package.json`) + `@civ-clone/core-engine`, `@civ-clone/core-player`, `@civ-clone/core-civ-client`, `@civ-clone/core-ai-client`, existing `@civ-clone/*` gameplay modules, current transport contract in `src/transport/` (003-create-feature-branch)
- N/A (in-memory runtime bootstrap only; no persistence introduced) (003-create-feature-branch)

- TypeScript 4.x (`typescript` from `package.json`) + `@civ-clone/core-client`, `@civ-clone/core-civ-client`, `@dom111/typed-event-emitter`, existing `@civ-clone/*` gameplay packages (002-swappable-transport-layer)

## Project Structure

```text
src/
scripts/
specs/
tests/
```

## Commands

npx pnpm test && npx pnpm run lint

## Code Style

TypeScript 4.x (`typescript` from `package.json`): Follow standard conventions

## Recent Changes
- 003-create-feature-branch: Added TypeScript 4.x (`typescript` from `package.json`) + `@civ-clone/core-engine`, `@civ-clone/core-player`, `@civ-clone/core-civ-client`, `@civ-clone/core-ai-client`, existing `@civ-clone/*` gameplay modules, current transport contract in `src/transport/`
- 003-create-feature-branch: Added [if applicable, e.g., PostgreSQL, CoreData, files or N/A]
- 003-create-feature-branch: Added [if applicable, e.g., PostgreSQL, CoreData, files or N/A]


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
