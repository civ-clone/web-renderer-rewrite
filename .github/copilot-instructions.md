# web-renderer-rewrite Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-11

## Active Technologies

- TypeScript 4.x (`typescript` from `package.json`) + `@civ-clone/core-client`, `@civ-clone/core-civ-client`, `@dom111/typed-event-emitter`, existing `@civ-clone/*` gameplay packages (002-swappable-transport-layer)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npx pnpm test && npx pnpm run lint

## Code Style

TypeScript 4.x (`typescript` from `package.json`): Follow standard conventions

## Recent Changes

- 002-swappable-transport-layer: Added swappable transport layer and refactored `LocalPlayer` to require an injected transport while extending `@civ-clone/core-civ-client`

<!-- MANUAL ADDITIONS START -->
- Breaking changes are acceptable at this stage when they simplify the architecture. Do not preserve legacy compatibility by default.
- `LocalPlayer` in `src/client/local-player/LocalPlayer.ts` now requires a transport at construction time. There is no no-transport fallback path.
- Treat `@civ-clone/core-player` classes (`Player`, `PlayerAction`, `MandatoryPlayerAction`) as the source of truth for backend action modeling.
- Frontend-facing labels are an i18n concern; do not expect backend actions to provide display strings.
- Prefer `npx pnpm ...` for package-management and script execution requests.
<!-- MANUAL ADDITIONS END -->
