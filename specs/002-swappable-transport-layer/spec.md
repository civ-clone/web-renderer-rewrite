# Feature Specification: Swappable Transport Layer

**Feature Branch**: `002-swappable-transport-layer`  
**Created**: 2026-04-11  
**Status**: Draft  
**Input**: User description: "Separate the game engine (backend) from the UI (frontend) by running the engine in a Web Worker (or equivalent isolated process). The LocalPlayer client runs in the backend process alongside the engine. When the engine calls LocalPlayer.takeTurn(), the LocalPlayer posts a message containing the current mandatory actions to the frontend and awaits a response. The frontend renders the mandatory action list and posts back the player's chosen action. LocalPlayer.chooseFromList() follows the same pattern — posting the available choices to the frontend and awaiting a user selection response. The message transport layer must be swappable so the same LocalPlayer can work over postMessage (Web Worker), Electron IPC, WebSocket, or WebRTC, enabling local, Electron, and multiplayer clients without engine changes."

> Update (2026-04-11): project direction now explicitly allows breaking changes
> to simplify the architecture. `LocalPlayer` requires a transport at
> construction time and no longer preserves any no-transport compatibility path.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Player Takes Turn via Isolated Engine Process (Priority: P1)

The game engine runs in an isolated execution context (e.g., a background thread). When it is the player's turn, the engine asks the LocalPlayer what action to take. The LocalPlayer serialises the available mandatory actions and passes them to the frontend over the configured transport. The frontend renders the action list and the player picks one. The player's choice is relayed back to the LocalPlayer, which returns it to the engine so the turn can advance.

**Why this priority**: This is the foundational flow for the entire feature — it proves that engine and UI can be fully separated while gameplay remains functional and deterministic. Everything else builds on this.

**Independent Test**: Can be fully tested by starting an in-process game with a Web Worker–style transport stub, completing a single mandatory-action turn, and confirming the engine advances to the correct post-turn state.

**Acceptance Scenarios**:

1. **Given** the engine is running in an isolated context with one mandatory action available, **When** the engine requests the player's decision, **Then** the LocalPlayer serialises the mandatory actions and dispatches them to the frontend via the configured transport without error.
2. **Given** the frontend has received the mandatory action list, **When** the player selects an action and the frontend posts the choice back, **Then** the LocalPlayer resolves its pending request and returns the chosen action to the engine.
3. **Given** the engine receives the returned choice, **When** it applies the action, **Then** the game state advances correctly and a fresh mandatory action list is available for the next request.

---

### User Story 2 - Player Responds to a Choice Prompt (Priority: P2)

The engine needs the player to pick from an explicit list of options — for example, choosing a technology to research or naming a city. The LocalPlayer serialises the choices and dispatches them to the frontend via the transport. The frontend presents the choice dialog and the player selects an option. The selection is returned to the engine via the same transport.

**Why this priority**: `chooseFromList()` is the second core engine interaction pattern and must work over the same transport abstraction as `takeTurn()` to support full gameplay.

**Independent Test**: Can be tested in isolation by triggering a `chooseFromList` call through a transport stub, providing a synthetic player selection, and verifying the correct value is returned to the engine.

**Acceptance Scenarios**:

1. **Given** the engine requests a player choice from a list of options, **When** the LocalPlayer receives the request, **Then** it serialises all available choices and dispatches them to the frontend with a unique correlation ID.
2. **Given** the frontend has received the choice list, **When** the player selects an option and posts the response, **Then** the LocalPlayer matches the response to the pending request via correlation ID and returns the selected value to the engine.
3. **Given** multiple sequential choice prompts are issued, **When** each is resolved in order, **Then** no response is delivered to the wrong pending request.

---

### User Story 3 - Developer Swaps Transport to Electron IPC (Priority: P3)

A developer deploying the game as an Electron desktop application replaces the Web Worker postMessage transport with an Electron IPC adapter. The LocalPlayer, game engine, and all gameplay logic remain unchanged. The frontend continues to send and receive the same message shapes, now over Electron IPC channels instead.

**Why this priority**: Transport swappability is the primary architectural goal of this feature; a concrete second-transport scenario validates that the abstraction boundary is genuine, not incidental.

**Independent Test**: Can be tested by instantiating LocalPlayer with a mock IPC transport instead of the postMessage transport and confirming that a full `takeTurn()` round-trip completes correctly with identical results.

**Acceptance Scenarios**:

1. **Given** the LocalPlayer is configured with an Electron IPC transport adapter instead of the default postMessage transport, **When** the engine runs a standard turn, **Then** the turn completes without any modification to LocalPlayer or engine source code.
2. **Given** any compliant transport adapter is provided at configuration time, **When** all transport-specific details are encapsulated inside the adapter, **Then** no transport-specific code leaks into LocalPlayer or the engine.

---

### User Story 4 - Developer Swaps Transport to WebSocket for Multiplayer (Priority: P4)

A developer building a networked multiplayer mode connects a remote player's frontend over WebSocket. The same LocalPlayer that handles local turns can now relay turns to a remote browser without changes to engine logic.

**Why this priority**: Demonstrates the feature delivers on its stated multiplayer goal and validates that the transport contract handles both in-process and out-of-process message passing.

**Independent Test**: Can be tested by configuring LocalPlayer with a WebSocket transport stub and a simulated remote client, completing a `takeTurn()` cycle, and confirming the engine receives the correct choice from the remote player.

**Acceptance Scenarios**:

1. **Given** a WebSocket transport is configured in place of postMessage, **When** the engine calls `takeTurn()` for the local player, **Then** the mandatory actions are dispatched over WebSocket and the player's remote response is correctly returned to the engine.
2. **Given** network latency is simulated in the WebSocket transport, **When** the response is delayed, **Then** the LocalPlayer awaits the response without blocking other engine activity and resolves correctly when the response arrives.

---

### Edge Cases

- What happens when the frontend never responds to a dispatched mandatory action request (transport timeout or closed tab)?
- How does the system handle a response that arrives with a correlation ID that matches no pending request (stale or duplicate message)?
- What happens when the engine issues a new request while a previous request from the same player is still pending?
- How does the system behave when the transport channel is closed or errors mid-round-trip?
- What happens when the serialised payload exceeds the transport's message size limit?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The game engine MUST run in a distinct execution context from the UI so that neither can directly invoke the other's methods at runtime.
- **FR-002**: The LocalPlayer client MUST run in the same execution context as the game engine.
- **FR-003**: When the engine requests a mandatory-action decision via the LocalPlayer, the LocalPlayer MUST serialise the available mandatory actions into a transport-safe payload and dispatch it to the frontend.
- **FR-004**: The LocalPlayer MUST suspend its response to the engine until the frontend posts a matching reply, then resolve with the player's chosen action.
- **FR-005**: When the engine requests a list-based choice via the LocalPlayer, the LocalPlayer MUST serialise the available choices into a transport-safe payload and dispatch it to the frontend, then await the player's selected value.
- **FR-006**: Every dispatched request MUST carry a unique correlation identifier so that responses can be matched back to their originating request unambiguously.
- **FR-007**: The transport layer MUST be represented by a defined contract (interface) that any concrete transport implementation must satisfy.
- **FR-008**: All message payloads MUST contain only serialisable values; no live object references, class instances, or functions may cross the transport boundary.
- **FR-009**: The system MUST ship at least one production-ready transport implementation for the Web Worker postMessage channel.
- **FR-010**: The concrete transport implementation MUST be injectable into the LocalPlayer at construction or configuration time so it can be replaced without modifying LocalPlayer or engine source.
- **FR-011**: The frontend MUST listen for incoming mandatory-action payloads from the transport, render the action list to the player, and post the chosen action back through the same transport.
- **FR-012**: The frontend MUST listen for incoming choice-list payloads from the transport, render the choice prompt to the player, and post the selected option back through the transport.
- **FR-013**: The system MUST handle an unresolved pending request gracefully (e.g., transport timeout) by surfacing a recoverable error to the caller rather than hanging indefinitely.

### Key Entities *(include if feature involves data)*

- **Transport**: The abstraction that sends a serialisable request payload from one execution context and delivers a serialisable response from the other context. Implementations may use postMessage, Electron IPC, WebSocket, WebRTC, or any equivalent channel.
- **Transport Request**: A serialisable message containing a unique correlation ID, a message-type discriminant (e.g., `mandatory-action` or `choice-list`), and the payload (serialised actions or choices).
- **Transport Response**: A serialisable message containing the same correlation ID as the originating request and the player's selected value.
- **Execution Context**: An isolated runtime unit (e.g., Web Worker thread, Electron main process, WebSocket server) in which engine code runs independently of the UI.
- **LocalPlayer**: The client component that lives inside the engine context, uses the injected transport to send requests and receive responses, and converts player selections into values the engine can act on.
- **Transport Adapter**: A concrete implementation of the Transport contract for a specific channel (postMessage, IPC, WebSocket, WebRTC).

## Constitution Alignment *(mandatory)*

- **State Integrity**: The engine execution context is the sole authority for game state. The frontend receives only serialised, read-only snapshots of available actions and choices; it has no path to directly read or mutate engine state. State changes occur exclusively inside the engine as a result of the LocalPlayer returning a resolved value from a transport response.
- **Determinism**: Separating engine and UI into isolated contexts prevents any UI side-effect (user interaction, DOM event, browser API) from touching engine state outside of defined LocalPlayer response paths. For identical starting states and identical player selections, the engine always produces identical outcomes regardless of which transport implementation is in use.
- **Type-Safe Boundaries**: The transport contract, request payload type, and response payload type form explicit, typed crossing points between execution contexts. No `any`-typed escapes at the transport boundary are permitted without a documented follow-up task to remove them.
- **Test-First Evidence**: Failing tests are authored first for: transport dispatch of mandatory actions, transport dispatch of choice lists, correlation ID matching, concurrent request isolation, graceful timeout handling, and full round-trip with a postMessage stub. All must fail before implementation begins.
- **Performance and Bundle Budget**: A complete turn-handoff round-trip (engine dispatches → frontend renders → player selects → engine receives) must complete within a measurable threshold under representative conditions. The transport abstraction layer itself must add no observable latency beyond the underlying channel's native cost.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A complete `takeTurn()` round-trip — engine dispatches mandatory actions, frontend renders and player selects, engine receives the choice and advances state — completes successfully in all automated tests using the Web Worker postMessage transport.
- **SC-002**: Replacing the postMessage transport with a different compliant adapter requires zero changes to LocalPlayer source code and zero changes to engine source code, verified by a test that exercises the same round-trip with two distinct transport stubs.
- **SC-003**: In concurrent round-trip tests, 100% of responses are matched to their correct originating request and 0% of responses are delivered to a mismatched pending request.
- **SC-004**: All active LocalPlayer and transport tests pass after the removal of the legacy no-transport path, and all supported construction sites provide an explicit transport dependency.
- **SC-005**: The engine execution context contains no direct reference to DOM globals or browser UI APIs; this is verifiable by a static analysis or runtime check in the test suite.
- **SC-006**: A pending transport request that receives no response within a configured timeout period surfaces a recoverable error and does not leave the LocalPlayer in a permanently suspended state.

## Assumptions

- The existing `LocalPlayer` is the implementation to be extended; breaking constructor/API changes are acceptable where they simplify the transport boundary and remove obsolete compatibility behavior.
- Web Worker (postMessage) is the primary deployment transport; Electron IPC, WebSocket, and WebRTC are explicitly expected secondary transports, but their production implementations are out of scope for this specification — only the abstraction and the postMessage adapter must be delivered.
- Message payloads convey plain serialisable values only; there is no requirement to transfer non-serialisable objects (class instances, functions, circular references) across the transport boundary.
- The frontend rendering area for mandatory actions established in feature 001 will be adapted to receive transport messages rather than direct method calls; no new top-level UI surface is required.
- A single local player per execution context (one tab, one Electron window, one WebSocket connection) is assumed; multi-player shared-frontend scenarios are out of scope.
- Transport connection lifecycle (initial setup, reconnection, teardown) is managed by the application bootstrap layer and is out of scope for this specification; the transport contract assumes an already-open channel.
- Timeout thresholds for pending requests are configurable by the consumer of the transport abstraction; sensible defaults are provided but exact values are not mandated by this specification.

