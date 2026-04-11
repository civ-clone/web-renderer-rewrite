# Local Player / Transport Findings

Date: 2026-04-11

This document captures the main technical findings from the LocalPlayer and transport work completed so far, including corrected assumptions discovered during implementation.

> Important: if older generated feature artifacts mention preserving compatibility
> or keeping legacy fallback behavior, treat this memory document and
> `current-architecture-summary.md` as the current source of truth. Later
> project decisions explicitly accepted breaking changes to simplify the
> architecture.

## 1. Core client hierarchy

### `@civ-clone/core-client/Client`

`@civ-clone/core-client/Client` is the base gameplay client abstraction.

Its contract is:

- `chooseFromList(meta): Promise<...>`
- `player(): Player`
- `takeTurn(): Promise<any>`

This means a usable local human client must primarily answer two questions:

1. How does it choose from presented options?
2. How does it progress a turn when the engine asks it to?

### `@civ-clone/core-civ-client/Client`

`@civ-clone/core-civ-client/Client` extends the base client with civilization-specific setup behavior:

- `chooseCivilization(choices: typeof Civilization[]): void`
- `chooseLeader(civilization: Civilization): void`

This package is the correct parent class for the project `LocalPlayer`, not plain `@civ-clone/core-client/Client`.

## 2. Current `LocalPlayer` design

Current file: `src/client/local-player/LocalPlayer.ts`

`LocalPlayer` now:

- extends `@civ-clone/core-civ-client/Client`
- requires an injected transport at construction time
- runs in the engine/backend execution context
- serializes frontend-interaction requests into transport messages
- waits for a matching response by `correlationId`
- rejects timed-out requests with `TransportTimeoutError`
- discards orphan responses silently

### Current constructor shape

```ts
new LocalPlayer(player, leaderRegistry, transport, options)
```

Where:

- `player` is the engine-side `Player`
- `leaderRegistry` is passed to the civ-client base class
- `transport` must implement both `ITransport` and `ITransportListener`
- `options.timeoutMs` defaults to `30000`
- `options.randomNumberGenerator` is forwarded to the civ-client base class

### Important breaking-change decision

At this stage of the project, breaking changes are acceptable and preferred over carrying architectural compatibility baggage.

As a result:

- the old no-transport fallback path was removed
- `LocalPlayer` now always requires a transport
- old relay/intent helper modules were removed when they no longer matched the spec

## 3. How `takeTurn()` currently works

Current behavior in `LocalPlayer.takeTurn()`:

1. While `player.hasMandatoryActions()` is true:
2. Read `player.mandatoryActions()`
3. Create a `TransportRequest` with:
   - a generated `correlationId`
   - `type: 'mandatory-action'`
   - payload containing only action indexes
4. Send the request through the transport
5. Wait for a matching `TransportResponse`
6. Loop again until the player reports no remaining mandatory actions

### Important implementation finding

The current implementation establishes the request/response transport loop, but it does **not yet execute the selected action inside `LocalPlayer`**.

At the moment, the response only unblocks the awaiting promise. In tests, player state changes are simulated externally by mutating the test player before responding.

This means the transport infrastructure exists, but the final command-application semantics are still incomplete.

That is an important distinction:

- **implemented now**: transport-mediated turn interaction handshake
- **not yet implemented**: engine-side application of the chosen mandatory action in response to the returned selection

## 4. How `chooseFromList()` currently works

Current behavior in `LocalPlayer.chooseFromList()`:

1. Read `meta.choices()`
2. Create a `TransportRequest` with:
   - a generated `correlationId`
   - `type: 'choice-list'`
   - payload containing:
     - `key: meta.key()`
     - choice indexes only
3. Wait for a matching `TransportResponse`
4. Interpret `response.payload` as the selected index
5. Validate that the payload is an integer and in bounds
6. Return `choices[selectedIndex].value()`

### Important constraint

The transport boundary currently carries only serializable data. For choice prompts, the real choice objects stay in the engine process; the frontend sees an index-based representation and returns an index.

## 5. What a turn means in the backend model

From `@civ-clone/core-player/Player`:

- `hasActions()` / `actions()` expose general actions
- `hasMandatoryActions()` / `mandatoryActions()` expose required actions for progression
- `mandatoryAction()` returns the current mandatory action

From `@civ-clone/core-player/MandatoryPlayerAction`:

- `MandatoryPlayerAction` extends `PlayerAction`

From `@civ-clone/core-player/PlayerAction`:

- `PlayerAction` extends `DataObject`
- it carries:
  - `player()`
  - `value()`
- because it inherits `DataObject`, it also has the core object identity behavior (including `id()`)

### Architectural consequence

Mandatory actions should be modeled from `MandatoryPlayerAction` / `PlayerAction`, not from custom backend DTO types.

This was corrected during the session.

## 6. Action modeling findings

### Correct assumptions

- action type can be represented by the action class itself (for example `ChooseResearch`)
- mandatory-ness is already represented by the class hierarchy (`MandatoryPlayerAction`)
- action identity comes from inherited `DataObject` behavior (`id()`)

### Incorrect assumptions that were removed

The following assumptions turned out not to match the actual backend model:

- `label` being provided by the backend
- `turnToken` being a current backend concept
- custom `BackendMandatoryAction` DTOs as the primary action representation

### Current agreed direction

- backend owns action classes and state
- frontend owns display strings / localization
- action labels should come from frontend i18n, not from engine payloads
- if a label key is needed, it should be derived from action type/class identity rather than authored by the backend

## 7. Turn token finding

`turnToken` does **not** currently exist as a domain concept in the backend model.

It was removed from the in-repo local relay/intent code during cleanup.

A README TODO remains because a future turn token or revision marker could still be useful for:

- stale UI detection
- delayed-response rejection
- multiplayer / remote-client ordering
- debugging and replay correlation

Current location:

- `README.md` TODO section

## 8. Transport contract findings

Current files:

- `src/transport/TransportMessage.ts`
- `src/transport/ITransport.ts`
- `src/transport/ITransportListener.ts`
- `src/transport/adapters/PostMessageTransportAdapter.ts`

### `TransportRequest`

Current request shape:

- `correlationId: string`
- `type: 'mandatory-action' | 'choice-list'`
- `payload: Record<string, unknown>`

### `TransportResponse`

Current response shape:

- `correlationId: string`
- `payload: unknown`

### Design intent

The transport is designed to be swappable.

The same `LocalPlayer` should work unchanged over:

- Worker `postMessage`
- Electron IPC
- WebSocket
- WebRTC / p2p-style transports

The main thing that must stay stable is the request/response contract and correlation semantics.

## 9. PostMessage adapter findings

`PostMessageTransportAdapter` currently:

- calls `globalThis.postMessage(request)` to send
- listens to `globalThis.addEventListener('message', ...)`
- casts `globalThis` instead of depending on DOM globals in the engine modules

This keeps the core transport abstraction small and Worker-oriented, though the production integration layer is still early.

## 10. What was removed during cleanup

A significant amount of earlier experimental code was intentionally removed because it no longer matched the evolving architecture.

Removed concepts/modules included:

- backend relay DTO layer
- intent-to-command mapping layer
- intent validation layer
- submission lock layer
- telemetry helper layer
- custom mandatory action DTO mapper
- obsolete tests tied to those layers

Reason for removal:

- the code modeled a frontend-command relay design that no longer matched the cleaner `core-civ-client` + transport-driven interaction architecture
- the user explicitly confirmed that breaking changes are acceptable at this stage

## 11. Current implementation status

### Solidified

- `LocalPlayer` inherits from `@civ-clone/core-civ-client/Client`
- transport is mandatory
- request/response correlation and timeout handling are implemented
- orphan responses are safely ignored
- `chooseCivilization()` / `chooseLeader()` are inherited from the civ-client base
- tests cover transport correlation, timeout, orphan handling, round trips, and adapter swapping

### Still incomplete / should be treated as next-step work

- mapping a frontend selection back to a concrete backend mandatory action execution path
- building the real frontend rendering/selection loop around the transport messages
- deciding the final serializable payload shape for action presentation (beyond simple index-based transport)
- replacing early placeholder UI helper code with production-facing transport/UI integration

## 12. Testing findings

The tests currently prove:

- correlation IDs are unique and matched correctly
- timeouts reject as expected
- orphan responses do not crash or resolve the wrong request
- concurrent requests do not cross-contaminate
- `takeTurn()` and `chooseFromList()` can round-trip over test transports
- transport implementations are swappable without changing `LocalPlayer`

The tests do **not yet** prove:

- real game-rule mutation caused by a selected mandatory action through the transport response path
- a production frontend UI rendering actual localized labels and action metadata

## 13. Recommended next implementation focus

If this work continues, the most valuable next steps are:

1. Define the concrete serialized payload shape for mandatory actions presented to the frontend.
2. Define how a frontend response maps back to a specific backend action execution path.
3. Build the Worker/main-thread integration layer around `PostMessageTransportAdapter`.
4. Replace placeholder UI helpers with a real frontend controller that listens for transport requests and returns user selections.
5. Decide whether action transport should remain index-based or move to a more explicit stable identifier scheme.

## 14. Practical rule for future work

When working on `LocalPlayer` in this repository:

- prefer the installed civ-clone class hierarchy over custom DTO layers
- treat `Player` / `PlayerAction` / `MandatoryPlayerAction` as the source of truth
- keep transport payloads serializable and frontend-facing
- let frontend/i18n own display text
- prefer clean breaking refactors over preserving outdated compatibility paths


