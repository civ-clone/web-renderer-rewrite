## Current Architecture Summary

Date: 2026-04-11

### Authoritative LocalPlayer model

- `LocalPlayer` lives in `src/client/local-player/LocalPlayer.ts`.
- It extends `@civ-clone/core-civ-client/Client`.
- It requires an injected transport at construction time.
- There is no legacy no-transport fallback path.

Current constructor shape:

```ts
new LocalPlayer(player, leaderRegistry, transport, options)
```

### Backend action model

- Use `@civ-clone/core-player` classes as source of truth:
  - `Player`
  - `PlayerAction`
  - `MandatoryPlayerAction`
- Do not introduce custom backend action DTOs unless explicitly required.
- Action identity comes from inherited `DataObject` behavior such as `id()`.

### Frontend action presentation

- Backend action classes should not be treated as providers of localized labels.
- Frontend-visible labels are an i18n concern.
- Keep transport payloads serializable and frontend-facing.

### Transport boundary

- `src/transport/` contains the swappable transport contract.
- Current default production adapter is Worker-style `postMessage`.
- The same contract should support Electron IPC, WebSocket, WebRTC, and similar adapters.

### Breaking-change guidance

- Breaking changes are acceptable at this stage when they simplify architecture.
- Do not preserve old compatibility paths by default.
- If a spec or older test artifact assumes compatibility preservation, prefer the newer documented architecture unless explicitly told otherwise.

### Important current caveat

- The transport request/response loop is implemented.
- `LocalPlayer.takeTurn()` currently serializes and waits for responses, but the full engine-side application of a selected mandatory action still needs explicit follow-through work.

### See also

- `.specify/memory/local-player-transport-findings.md`
- `.specify/memory/constitution.md`
