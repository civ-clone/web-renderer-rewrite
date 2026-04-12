# Feature Specification: New Game Interface Bootstrap

**Feature Branch**: `003-create-feature-branch`  
**Created**: 2026-04-12  
**Status**: Draft  
**Input**: User description: "Interface to create a new game with an explicit start action, backend participant bootstrapping, visible mandatory actions in the frontend, and clear MVP vs follow-up scope."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start a New Game from the Page (Priority: P1)

A player opens the shipped game page, sees a clear control to create a new game, clicks it, and then sees the first mandatory actions appear in the interface.

**Why this priority**: This is the core user value for this feature. If this flow does not work, the feature does not deliver a usable game-start experience.

**Independent Test**: Open the generated game page, confirm no game is running initially, click the start control once, and verify the first mandatory action list appears.

**Acceptance Scenarios**:

1. **Given** the game page is loaded and no game session is active, **When** the player has not clicked the start control, **Then** no turn processing begins and no mandatory action list is shown.
2. **Given** the game page is loaded and ready, **When** the player clicks the start control, **Then** a new game session starts and the first mandatory actions are displayed.
3. **Given** a new session has started, **When** mandatory actions are available for the local player, **Then** the frontend displays those actions in a selectable list.

---

### User Story 2 - Bootstrap Required Participants at Game Start (Priority: P2)

When a new game starts, the backend creates exactly three participants for the first playable setup: one human-controlled local participant and two AI-controlled participants, each with its own player identity and bound client.

**Why this priority**: The game cannot progress to meaningful turn flow without a complete participant set at startup.

**Independent Test**: Trigger game start once and verify that exactly three participants are registered with one local client and two AI clients before the first turn resolves.

**Acceptance Scenarios**:

1. **Given** the player triggers game start, **When** participant bootstrapping runs, **Then** exactly one local participant and two AI participants are created.
2. **Given** participants are created, **When** registration completes, **Then** each participant has both a player identity and a corresponding client binding in the active registries.
3. **Given** registration is complete, **When** the engine enters active play, **Then** turn progression can request mandatory actions for the local participant without missing participant or client bindings.

---

### User Story 3 - Reliable Session Initialization for Developers (Priority: P3)

A developer can start the packaged page and rely on the game session to initialize consistently, including required gameplay modules, without manually wiring additional startup steps.

**Why this priority**: Reliable initialization reduces integration risk and prevents incomplete game sessions caused by missing rule/plugin startup wiring.

**Independent Test**: Run the packaged page in the documented local runtime, start a new game, and verify initialization completes without missing-module errors.

**Acceptance Scenarios**:

1. **Given** the application is built and served, **When** the page loads, **Then** required scripts and styles are present and the new-game UI is visible.
2. **Given** the player starts a game, **When** initialization executes, **Then** all required gameplay modules are initialized before turn processing begins.
3. **Given** required gameplay modules are initialized, **When** the first turn starts, **Then** mandatory actions can be produced and shown without manual developer intervention.

---

### Edge Cases

- What happens when the player clicks the start control multiple times rapidly before initialization finishes?
- How does the system respond if participant registration fails for one participant during startup?
- What happens when required gameplay modules are not initialized successfully before engine start?
- How does the UI communicate startup failure when no mandatory actions can be produced?
- What happens when the page is loaded successfully but runtime messaging between frontend and backend is unavailable?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a visible new-game control on the main game page.
- **FR-002**: The system MUST NOT start a game session automatically on page load.
- **FR-003**: The system MUST start a new game session only after an explicit player start action.
- **FR-004**: On session start, the system MUST create exactly three participants: one local human participant and two AI participants.
- **FR-005**: The system MUST create one player identity per participant and one client binding per player identity.
- **FR-006**: The system MUST register all created players and clients into the active runtime registries before turn execution proceeds.
- **FR-007**: The system MUST initialize required gameplay modules before the first turn is processed.
- **FR-008**: The frontend MUST display mandatory actions provided for the local participant once available.
- **FR-009**: The frontend MUST keep mandatory actions hidden until a game session is started and actions exist.
- **FR-010**: If startup fails at any stage, the system MUST present a clear recoverable error state to the user.
- **FR-011**: The initial delivered experience MUST exclude map rendering while still allowing turn/action interaction.
- **FR-012**: The packaged local entrypoint MUST load successfully with its required page assets and expose the new-game experience.

### Key Entities *(include if feature involves data)*

- **Game Session**: A runtime instance that transitions from idle to active only after explicit player start and owns participant setup for that run.
- **Participant**: A gameplay actor slot in the new session, classified as local human or AI.
- **Player Identity**: The canonical gameplay identity associated with a participant and used in turn/action ownership.
- **Client Binding**: The controlling behavior attached to a player identity, either local human input handling or AI decision-making.
- **Mandatory Action List**: The set of required player decisions currently awaiting local player input.
- **Initialization Profile**: The required set of gameplay modules that must be initialized before active play.

## Scope Breakdown

### MVP Scope

- New-game page control exists and starts the game only when clicked.
- Startup creates and registers one local participant plus two AI participants.
- Mandatory action list is visible for local-player turns.
- Page assets load through the packaged local entrypoint.
- Map rendering is intentionally absent.

### Follow-up Scope

- Map rendering and in-world interaction surfaces.
- Advanced game setup options (participant count, factions, map settings).
- Session restart/resume management beyond a single fresh start flow.
- Enhanced startup diagnostics and telemetry beyond user-visible errors.

## Constitution Alignment *(mandatory)*

- **State Integrity**: Game state changes occur only through formal turn/action processing after explicit session start; page-load and render-only flows do not mutate gameplay state.
- **Determinism**: With identical initial setup and player choices, startup and first-turn outcomes remain consistent across runs.
- **Type-Safe Boundaries**: Participant setup, registration, and mandatory-action exchange use explicit contracts so actor/client mismatches are detected at boundaries.
- **Test-First Evidence**: Coverage is defined first for idle-before-click behavior, participant/client registration counts, mandatory-action visibility, and startup-failure handling.
- **Performance and Bundle Budget**: New-game page load and first-action visibility remain within defined user-facing responsiveness targets and do not introduce visible startup regressions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In local validation runs, 100% of page loads show the new-game control while no game session starts before user interaction.
- **SC-002**: In at least 95% of local start attempts, first mandatory actions become visible within 5 seconds after the player clicks start.
- **SC-003**: In startup validation runs, 100% of successful sessions register exactly three participants with one local and two AI-controlled participants.
- **SC-004**: 100% of startup failures surface a user-visible recoverable error state within 3 seconds of failure detection.
- **SC-005**: MVP walkthrough completion (load page -> click start -> see mandatory actions) succeeds without map rendering in 100% of release-gate test runs.

## Assumptions

- The initial audience is local developers validating the game bootstrap flow rather than end-user production deployment.
- A single start action creates one fresh session; in-session restart controls are out of scope for this feature.
- The required gameplay modules for turn/action generation are known by the application and can be initialized as a fixed startup set.
- AI participants are non-interactive from the frontend perspective and do not require additional UI controls in this feature.
- Mandatory actions for the local participant are sufficient to validate playable startup without map rendering.
