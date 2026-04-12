# web-renderer-rewrite
Spec driven development rewrite of the web-renderer

Project governance and delivery rules are defined in
`.specify/memory/constitution.md`.

## Local Player Client Relay

The local-player feature is implemented in `src/client/local-player/` and builds
on `@civ-clone/core-civ-client`.

- Mandatory actions are modeled from `@civ-clone/core-player` action classes.
- Action display labels are frontend/i18n concern (derived from action type key),
  not backend-provided text.
- `LocalPlayer` now requires an injected transport and no longer supports a
  no-transport fallback path.
- The current transport contract is defined in `src/transport/` and is designed
  to be swappable across Worker `postMessage`, Electron IPC, WebSocket, and
  similar channels.

At this stage of the project, breaking changes are acceptable when they simplify
the architecture. Prefer removing outdated compatibility layers over preserving
them by default.

UI support helpers are in `src/ui/mandatory-actions/`.

## Agent Workflow Conventions

- Place temporary/debug artifacts in `.tmp/` (repository-local and git-ignored).
- Quote any `gh` argument containing `?` or `&` (for example: `gh api 'repos/org/repo/pulls/1/comments?per_page=100'`).
- When an agent posts PR comments or review replies, it should identify itself as acting on the maintainer's behalf.

## TODO

- Evaluate adding a turn token or revision marker to action payloads to improve
  stale UI action detection in multi-step or delayed client interactions.
- Explore a pluggable mandatory-action handler registry so new `PlayerAction`
  subclasses can be integrated without changing `LocalPlayer` core logic.

