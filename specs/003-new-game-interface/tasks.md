# Tasks: New Game Interface Bootstrap

**Input**: Design documents from `/Users/dom111/Code/civ-clone/web-renderer-rewrite/specs/003-new-game-interface/`
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/new-game-bootstrap-contract.md`, `quickstart.md`

**Tests**: Required by constitution + quickstart TDD flow. Write failing tests first for every story, then implement to green.

**Organization**: Tasks are grouped by user story to preserve independent implementation and testing.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish new-game feature folders and shared test scaffolding.

- [X] T001 Create new-game source module barrels in `src/js/new-game/index.ts` and `src/ui/new-game/index.ts`
- [X] T002 [P] Create new-game test folders with placeholders in `tests/unit/new-game/.gitkeep`, `tests/integration/new-game/.gitkeep`, and `tests/contract/new-game/.gitkeep`
- [X] T003 [P] Add new-game task validation notes section to `specs/003-new-game-interface/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core typed startup contracts and orchestration skeleton required by all stories.

**⚠️ CRITICAL**: Complete this phase before user-story implementation.

- [X] T004 Define shared bootstrap contract types from spec contract in `src/js/new-game/contracts.ts`
- [X] T005 [P] Extend transport message discriminants for startup intents/results in `src/transport/TransportMessage.ts`
- [X] T006 [P] Add startup session state machine primitives (`idle|starting|active|failed`) in `src/js/new-game/sessionState.ts`
- [X] T007 Create backend start orchestration shell (`startNewGame`, dependency injection seams) in `src/js/new-game/startNewGame.ts`
- [X] T008 [P] Add frontend startup view-state model (`canStart`, failure, mandatory-action visibility gate) in `src/js/new-game/frontendState.ts`
- [X] T009 Wire frontend/backend entrypoints to new-game orchestration stubs in `src/js/frontend.ts` and `src/js/backend.ts`

**Checkpoint**: Shared startup architecture is in place; user stories can proceed.

---

## Phase 3: User Story 1 - Start a New Game from the Page (Priority: P1) 🎯 MVP

**Goal**: Player sees explicit start control, no auto-start occurs, and mandatory actions appear only after explicit successful start.

**Independent Test**: Load page runtime, confirm idle state with no mandatory actions, click start once, confirm first mandatory actions are rendered.

### Tests for User Story 1 (REQUIRED)

- [X] T010 [P] [US1] Add contract test for `StartGameRequest`/`StartGameResult` explicit-start semantics in `tests/contract/new-game/new-game-start.contract.test.ts`
- [X] T011 [P] [US1] Add integration test for idle-on-load and single explicit start flow in `tests/integration/new-game/start-control.integration.test.ts`
- [X] T012 [P] [US1] Add unit test for startup state transitions (`idle -> starting -> active|failed`) in `tests/unit/new-game/session-state-machine.test.ts`

### Implementation for User Story 1

- [X] T013 [P] [US1] Implement visible new-game control renderer and click binding in `src/ui/new-game/renderStartControl.ts`
- [X] T014 [US1] Implement frontend start action dispatch + no-auto-start boot behavior in `src/js/frontend.ts`
- [X] T015 [US1] Implement backend handling for first accepted start request in `src/js/new-game/startNewGame.ts`
- [X] T016 [US1] Enforce mandatory-action visibility gate (hidden pre-start, shown when active and actions exist) in `src/ui/mandatory-actions/renderMandatoryActions.ts`
- [X] T017 [US1] Integrate local-player mandatory-action view with new startup session state in `src/client/local-player/types.ts`

**Checkpoint**: US1 is independently functional and testable.

---

## Phase 4: User Story 2 - Bootstrap Required Participants at Game Start (Priority: P2)

**Goal**: Startup creates exactly three participants (1 local + 2 AI), each with player identity and bound client, before turn execution.

**Independent Test**: Trigger start once and verify three registrations with exact role/client composition and complete registry bindings before first turn work.

### Tests for User Story 2 (REQUIRED)

- [X] T018 [P] [US2] Add contract test for `ParticipantSummary` invariants (`3 total`, `1 local`, `2 AI`) in `tests/contract/new-game/participant-summary.contract.test.ts`
- [X] T019 [P] [US2] Add integration test for participant/player/client registration counts before first turn in `tests/integration/new-game/participant-bootstrap.integration.test.ts`
- [X] T020 [P] [US2] Add unit test for duplicate start idempotence while `starting`/`active` in `tests/unit/new-game/start-idempotence.test.ts`

### Implementation for User Story 2

- [X] T021 [P] [US2] Implement deterministic participant creation sequence (local first, then AI x2) in `src/js/new-game/bootstrapParticipants.ts`
- [X] T022 [P] [US2] Implement player identity + client binding factory for local/AI clients in `src/js/new-game/createClientBindings.ts`
- [X] T023 [US2] Register participants/players/clients into runtime registries before turn progression in `src/js/new-game/startNewGame.ts`
- [X] T024 [US2] Return typed participant summary and already-started response semantics in `src/js/new-game/contracts.ts`

**Checkpoint**: US1 and US2 are independently testable; participant bootstrap guarantees hold.

---

## Phase 5: User Story 3 - Reliable Session Initialization for Developers (Priority: P3)

**Goal**: Required gameplay modules initialize before active play, packaged startup remains reliable, and startup failures are surfaced as recoverable UI states.

**Independent Test**: Run packaged page/start flow; verify module initialization precedes turn processing and startup failures appear quickly with recoverable messaging.

### Tests for User Story 3 (REQUIRED)

- [X] T025 [P] [US3] Add integration test for required module initialization gate before first turn in `tests/integration/new-game/module-initialization.integration.test.ts`
- [X] T026 [P] [US3] Add integration test for user-visible recoverable startup failure state in `tests/integration/new-game/startup-failure.integration.test.ts`
- [X] T027 [P] [US3] Add unit test for startup failure code mapping (`module_init`, `participant_create`, `registry_bind`, `transport`, `unknown`) in `tests/unit/new-game/startup-failure-mapping.test.ts`
- [X] T028 [P] [US3] Add integration timing assertions for SC-002 and SC-004 thresholds in `tests/integration/new-game/startup-timing.integration.test.ts`

### Implementation for User Story 3

- [X] T029 [P] [US3] Implement required initialization profile bootstrap gate in `src/js/new-game/initializationProfile.ts`
- [X] T030 [US3] Integrate module-initialization gate with participant bootstrap flow in `src/js/new-game/startNewGame.ts`
- [X] T031 [P] [US3] Implement startup failure classifier and typed recoverable error mapping in `src/js/new-game/classifyStartupFailure.ts`
- [X] T032 [US3] Render recoverable startup failure state in the page UI in `src/ui/new-game/showStartupFailure.ts` and `src/js/frontend.ts`

**Checkpoint**: All user stories are independently functional with reliability/error behavior covered.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cross-story hardening, regression proof, and documentation alignment.

- [X] T033 [P] Add reusable startup timing/assertion helpers in `tests/helpers/startupTiming.ts`
- [X] T034 Add end-to-end MVP walkthrough regression test (`load -> click start -> actions visible`, no map rendering) in `tests/integration/new-game/mvp-walkthrough.integration.test.ts`
- [X] T035 [P] Document startup flow, failure recovery, and MVP/follow-up boundaries in `README.md`
- [X] T036 Update acceptance evidence checklist with test commands/results in `specs/003-new-game-interface/checklists/requirements.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies.
- **Phase 2 (Foundational)**: Depends on Phase 1 and blocks all user stories.
- **Phase 3 (US1)**: Depends on Phase 2; defines MVP explicit-start behavior.
- **Phase 4 (US2)**: Depends on Phase 3 startup trigger path + Phase 2 contracts.
- **Phase 5 (US3)**: Depends on Phase 3-4 startup pipeline to validate reliability/failure handling.
- **Phase 6 (Polish)**: Depends on all story phases.

### User Story Dependency Graph

- **US1 (P1)** -> enables explicit start + action visibility baseline.
- **US2 (P2)** -> extends US1 start flow with participant/client bootstrap invariants.
- **US3 (P3)** -> hardens US1+US2 with module initialization gating and recoverable failures.

---

## Parallel Execution Examples

### User Story 1

- Run in parallel: `T010`, `T011`, `T012` (different test files)
- Run in parallel after tests exist: `T013` and `T016` (UI files in different modules)

### User Story 2

- Run in parallel: `T018`, `T019`, `T020` (contract/integration/unit split)
- Run in parallel after failing tests: `T021` and `T022` (participant vs binding factories)

### User Story 3

- Run in parallel: `T025`, `T026`, `T027`, `T028` (separate test targets)
- Run in parallel after failing tests: `T029` and `T031` (initialization vs failure mapping)

---

## Implementation Strategy

### MVP First (US1 only)

1. Complete Phase 1 + Phase 2.
2. Deliver Phase 3 (US1) with failing-first tests to green.
3. Validate independent US1 walkthrough before expanding scope.

### Incremental Delivery

1. Add US2 bootstrap invariants and idempotence.
2. Add US3 reliability/failure/timing guarantees.
3. Finish with Phase 6 regression + docs + acceptance evidence.

### Test-First Enforcement

- For each story, execute test tasks first and confirm failures before implementation tasks.
- Keep story-level tests green before advancing to the next story phase.

