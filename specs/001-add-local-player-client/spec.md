# Feature Specification: Local Player Client Relay

**Feature Branch**: `002-create-feature-branch`  
**Created**: 2026-04-11  
**Status**: Draft  
**Input**: User description: "Create a new `LocalPlayer` `Client` that extends the `Client` class from `@civ-clone/core-client` (and implements the `IClient` interface) that will interpret commands from the frontend and relay them to the backend. To validate this is working, the frontend will display all available mandatory actions."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Mandatory Actions (Priority: P1)

As a player using the frontend, I can see all currently available mandatory actions so I know what I must do next.

**Why this priority**: This is the requested validation path and the core proof that the new client can interpret backend state and expose required decisions to the UI.

**Independent Test**: Can be fully tested by loading a game state with at least one mandatory decision and verifying that every mandatory action is shown in the frontend list.

**Acceptance Scenarios**:

1. **Given** a game state where one mandatory action is available, **When** the frontend requests available actions through the LocalPlayer client, **Then** the mandatory action appears in the frontend action list.
2. **Given** a game state where multiple mandatory actions are available, **When** the frontend requests available actions, **Then** all mandatory actions are returned and displayed without omission.

---

### User Story 2 - Relay Frontend Commands (Priority: P2)

As a player, when I select an action in the frontend, my command is interpreted by the LocalPlayer client and relayed to the backend so the game can progress.

**Why this priority**: Command relay is the primary behavior of the new client and enables gameplay interactions beyond read-only display.

**Independent Test**: Can be tested by selecting a displayed mandatory action and confirming the backend receives and applies the intended command, followed by updated available actions.

**Acceptance Scenarios**:

1. **Given** a mandatory action is displayed, **When** the player selects and submits that action, **Then** the LocalPlayer client relays the corresponding command to the backend.
2. **Given** the backend accepts and applies the relayed command, **When** turn state changes, **Then** the frontend receives an updated mandatory action list reflecting the new state.

---

### User Story 3 - Handle Command and Action Errors Safely (Priority: P3)

As a player, I receive clear feedback when an action cannot be interpreted or accepted so I can recover without losing progress.

**Why this priority**: Reliable error handling prevents dead ends and protects user trust during turn progression.

**Independent Test**: Can be tested by submitting an invalid or stale action and confirming that the frontend displays a clear failure message while leaving the game in a consistent state.

**Acceptance Scenarios**:

1. **Given** the player submits an action that is no longer valid for the current state, **When** the backend rejects it, **Then** the player sees a clear error and the mandatory action list is refreshed.
2. **Given** command interpretation fails before relay, **When** the failure occurs, **Then** no unintended state change occurs and the player can retry from the current action list.

---

### Edge Cases

- Mandatory action set changes between display and submission (stale UI selection).
- No mandatory actions are available for the local player at the current moment.
- Duplicate command submissions from repeated user clicks.
- Backend temporarily unavailable during command relay.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a LocalPlayer client type that behaves as a client implementation for local frontend-driven play.
- **FR-002**: The LocalPlayer client MUST interpret supported frontend command intents into backend-understandable command requests.
- **FR-003**: The LocalPlayer client MUST relay interpreted command requests to the backend for execution.
- **FR-004**: The system MUST return all currently available mandatory actions for the active local player to the frontend.
- **FR-005**: The frontend MUST be able to display the full returned mandatory action set to the player.
- **FR-006**: After any relayed command outcome (success or failure), the system MUST provide a refreshed mandatory action set that reflects current game state.
- **FR-007**: If a command is invalid, stale, or rejected, the system MUST provide a user-visible error outcome without applying unintended game state changes.
- **FR-008**: The system MUST prevent duplicate processing of the same user submission caused by repeated input in the same interaction window.

### Key Entities *(include if feature involves data)*

- **Local Player Client**: A client-side gameplay participant that accepts frontend intents, maps them to command requests, and coordinates backend communication.
- **Frontend Command Intent**: A user-originated instruction from the frontend representing a chosen gameplay action.
- **Mandatory Action**: A required gameplay decision currently available to the local player and required for turn progression.
- **Command Outcome**: The result of backend command processing, including success/failure status, message content, and updated available actions.

## Constitution Alignment *(mandatory)*

- **State Integrity**: The LocalPlayer client acts as a relay/interpretation boundary and does not directly mutate game state outside explicit backend rule/event processing.
- **Determinism**: For identical starting state and player selections, relayed command sequences and resulting mandatory action availability remain reproducible.
- **Type-Safe Boundaries**: New and updated client contracts preserve explicit typed boundaries between frontend intents, relay payloads, and backend outcomes.
- **Test-First Evidence**: Failing tests are authored first for mandatory action exposure, command relay, stale action handling, and duplicate submission handling.
- **Performance and Bundle Budget**: Action retrieval and post-command refresh remain responsive for player interaction and do not introduce noticeable action-list update delay in standard play sessions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In validation scenarios, 100% of mandatory actions available to the local player are shown in the frontend.
- **SC-002**: At least 95% of valid player action submissions complete end-to-end (submit to confirmed outcome) within 2 seconds under normal local development conditions.
- **SC-003**: At least 95% of rejected or invalid action submissions show a clear recoverable message to the user within 2 seconds.
- **SC-004**: In usability validation, at least 90% of participants can complete a mandatory-action turn without facilitator assistance on first attempt.

## Assumptions

- The backend already exposes the information needed to determine mandatory actions and process corresponding commands.
- The frontend already has an action list area where mandatory actions can be rendered without adding a separate screen.
- Authorization and identity for a single local player session already exist and are out of scope for this feature.
- Non-mandatory action discovery and advanced automation are out of scope for this first increment.

