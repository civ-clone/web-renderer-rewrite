# web-renderer-rewrite
Spec driven development rewrite of the web-renderer

Project governance and delivery rules are defined in
`.specify/memory/constitution.md`.

## Local Player Client Relay

The local-player relay feature is implemented in `src/client/local-player/` and
provides typed methods for mandatory-action retrieval and frontend intent
submission.

- Use `LocalPlayer.getMandatoryActions()` to retrieve the full mandatory action
  list for the active local player.
- Use `LocalPlayer.submitIntent(intent)` to relay frontend commands and receive
  normalized outcomes with refreshed mandatory actions.

UI support helpers are in `src/ui/mandatory-actions/`.

