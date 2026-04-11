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

## TODO

- Evaluate adding a turn token or revision marker to action payloads to improve
  stale UI action detection in multi-step or delayed client interactions.

