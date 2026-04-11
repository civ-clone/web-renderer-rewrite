# Tasks: Local Player Client Relay

**Input**: Design documents from `/Users/dom111/Code/civ-clone/web-renderer-rewrite/specs/001-add-local-player-client/`
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/local-player-client-contract.md`, `quickstart.md`

**Tests**: Test-first is required by spec/constitution. For each story, write failing tests first, then implement to green.

**Organization**: Tasks are grouped by user story for independent implementation and validation.

## Format: `[ID] [P?] [Story?] Description with file path`

- `[P]`: Task can run in parallel (different files, no incomplete dependencies)
- `[Story]`: Present only for user-story tasks (`[US1]`, `[US2]`, `[US3]`)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create runnable source/test scaffolding and command entrypoints.

- [X] T001 Create initial feature directories and placeholders in `src/client/local-player/.gitkeep`, `src/ui/mandatory-actions/.gitkeep`, `tests/unit/local-player/.gitkeep`, `tests/integration/local-player/.gitkeep`, `tests/contract/.gitkeep`, and `tests/helpers/.gitkeep`
- [X] T002 Configure project test command wiring in `package.json` (add `test`, `test:unit`, `test:integration`, and `test:contract` scripts)
- [X] T003 [P] Add TypeScript test compilation config in `tsconfig.test.json`
- [X] T004 [P] Add test runner configuration in `vitest.config.ts`

**Validation commands (Phase 1)**

```bash
cd /Users/dom111/Code/civ-clone/web-renderer-rewrite
npm run ts:compile
npm test
```

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared typed boundaries and relay primitives required by all user stories.

**CRITICAL**: Complete this phase before user story work.

- [X] T005 Implement feature contract types from spec/contracts in `src/client/local-player/types.ts`
- [X] T006 [P] Define backend relay port and response interfaces in `src/client/local-player/backendRelay.ts`
- [X] T007 [P] Implement intent schema/type validation helpers in `src/client/local-player/intentValidation.ts`
- [X] T008 Implement submission lock utility (`dedupeKey`, acquire/release) in `src/client/local-player/submissionLock.ts`
- [X] T009 Create deterministic fixtures and backend stubs in `tests/helpers/localPlayerFixtures.ts`
- [X] T010 Clarify project validation command set for this feature in `specs/001-add-local-player-client/quickstart.md`

**Validation commands (Phase 2)**

```bash
cd /Users/dom111/Code/civ-clone/web-renderer-rewrite
npm run ts:compile
npm run test:unit
npm run test:contract
```

**Checkpoint**: Foundation complete; user stories can proceed.

---

## Phase 3: User Story 1 - View Mandatory Actions (Priority: P1) 🎯 MVP

**Goal**: Expose and render the full mandatory action set for the active local player.

**Independent Test**: Load a state with one or more mandatory actions and verify all are returned by `LocalPlayer.getMandatoryActions()` and rendered in the frontend action list.

### Tests for User Story 1 (write first, expect fail)

- [X] T011 [P] [US1] Add contract test for `getMandatoryActions()` completeness in `tests/contract/local-player-client.contract.test.ts`
- [X] T012 [P] [US1] Add integration test for mandatory action list rendering in `tests/integration/local-player/get-mandatory-actions.integration.test.ts`
- [X] T013 [P] [US1] Add deterministic replay test for stable action-list output in `tests/integration/local-player/get-mandatory-actions.determinism.test.ts`

### Implementation for User Story 1

- [X] T014 [P] [US1] Implement backend-action to `MandatoryActionView` mapping in `src/client/local-player/mandatoryActionMapper.ts`
- [X] T015 [US1] Implement `LocalPlayer` class baseline and `getMandatoryActions()` in `src/client/local-player/LocalPlayer.ts`
- [X] T016 [US1] Implement mandatory-action list presenter for UI consumption in `src/ui/mandatory-actions/renderMandatoryActions.ts`
- [X] T017 [US1] Export public entrypoints in `src/client/local-player/index.ts`
- [X] T018 [US1] Update fixtures to include multi-action mandatory sets in `tests/helpers/localPlayerFixtures.ts`

**Validation commands (US1)**

```bash
cd /Users/dom111/Code/civ-clone/web-renderer-rewrite
npm run test:contract -- local-player-client.contract.test.ts
npm run test:integration -- get-mandatory-actions
npm run ts:compile
```

**Checkpoint**: US1 is independently functional and demo-ready (MVP).

---

## Phase 4: User Story 2 - Relay Frontend Commands (Priority: P2)

**Goal**: Translate frontend intents into backend requests, relay them, and return refreshed actions on success.

**Independent Test**: Submit a displayed mandatory action and confirm backend relay receives a deterministic command request and returns refreshed actions.

### Tests for User Story 2 (write first, expect fail)

- [X] T019 [P] [US2] Add unit test for deterministic intent-to-command translation in `tests/unit/local-player/intent-to-command.test.ts`
- [X] T020 [P] [US2] Add integration test for successful relay and refresh in `tests/integration/local-player/submit-intent-success.integration.test.ts`
- [X] T021 [P] [US2] Extend contract test for `submitIntent()` success outcome shape in `tests/contract/local-player-client.contract.test.ts`

### Implementation for User Story 2

- [X] T022 [P] [US2] Implement deterministic intent translator in `src/client/local-player/intentToCommand.ts`
- [X] T023 [US2] Implement `submitIntent()` success relay flow in `src/client/local-player/LocalPlayer.ts`
- [X] T024 [US2] Implement concrete relay adapter to backend client APIs in `src/client/local-player/backendRelayClient.ts`
- [X] T025 [US2] Wire frontend action-submit handler to `LocalPlayer.submitIntent()` in `src/ui/mandatory-actions/submitMandatoryAction.ts`
- [X] T026 [US2] Add submit-to-outcome latency measurement helper for SC-002 in `src/client/local-player/telemetry.ts`

**Validation commands (US2)**

```bash
cd /Users/dom111/Code/civ-clone/web-renderer-rewrite
npm run test:unit -- intent-to-command.test.ts
npm run test:integration -- submit-intent-success
npm run ts:compile
```

**Checkpoint**: US2 works independently and preserves refreshed action list behavior.

---

## Phase 5: User Story 3 - Handle Command and Action Errors Safely (Priority: P3)

**Goal**: Normalize interpretation/rejection/transport failures with recoverable messaging, refresh actions, and prevent duplicate processing.

**Independent Test**: Submit stale/invalid and duplicate actions; confirm clear recoverable outcomes, no unintended state changes, and refreshed mandatory actions.

### Tests for User Story 3 (write first, expect fail)

- [X] T027 [P] [US3] Add unit test for duplicate in-flight submission rejection in `tests/unit/local-player/submission-lock.test.ts`
- [X] T028 [P] [US3] Add integration test for backend stale/invalid rejection and refresh in `tests/integration/local-player/submit-intent-rejection.integration.test.ts`
- [X] T029 [P] [US3] Add integration test for interpretation/transport error normalization in `tests/integration/local-player/submit-intent-errors.integration.test.ts`

### Implementation for User Story 3

- [X] T030 [P] [US3] Implement `CommandOutcome` normalization utilities in `src/client/local-player/normalizeCommandOutcome.ts`
- [X] T031 [US3] Integrate duplicate-submission guard into `submitIntent()` in `src/client/local-player/LocalPlayer.ts`
- [X] T032 [US3] Add stale `turnToken` and active-player rejection checks in `src/client/local-player/intentValidation.ts`
- [X] T033 [US3] Implement user-visible recoverable error presenter in `src/ui/mandatory-actions/showCommandOutcomeError.ts`
- [X] T034 [US3] Ensure refreshed action retrieval on failure paths in `src/client/local-player/backendRelayClient.ts`

**Validation commands (US3)**

```bash
cd /Users/dom111/Code/civ-clone/web-renderer-rewrite
npm run test:unit -- submission-lock.test.ts
npm run test:integration -- submit-intent-rejection
npm run test:integration -- submit-intent-errors
npm run ts:compile
```

**Checkpoint**: All user stories are independently functional with recoverable error behavior.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening, docs, and end-to-end validation.

- [X] T035 [P] Update feature usage and architecture notes in `README.md` and `specs/001-add-local-player-client/quickstart.md`
- [X] T036 [P] Add end-to-end local validation script in `scripts/validate-local-player-client.sh`
- [X] T037 Run full validation and record evidence against FR/SC in `specs/001-add-local-player-client/checklists/requirements.md`

**Validation commands (Polish)**

```bash
cd /Users/dom111/Code/civ-clone/web-renderer-rewrite
npm run ts:compile
npm test
npm run prettier:check
bash scripts/validate-local-player-client.sh
```

---

## Dependencies & Execution Order

### Phase dependencies

- Setup (Phase 1) -> Foundational (Phase 2) -> User Stories (Phases 3-5) -> Polish (Phase 6)
- User story execution order by priority: US1 (P1) -> US2 (P2) -> US3 (P3)

### User story dependencies

- **US1**: Depends only on Phase 2; no dependency on US2/US3
- **US2**: Depends on Phase 2; can start without US1 completion but is prioritized after US1 for MVP sequencing
- **US3**: Depends on Phase 2 and benefits from US2 relay flow being in place for full-path error handling

### Within-story ordering rules

- Tests first (fail) -> implementation -> story-specific validation commands
- Mapper/types utilities before `LocalPlayer` orchestration changes
- UI wiring after core client contract behavior is passing

---

## Parallel Opportunities

- **Phase 1**: T003 and T004 can run in parallel after T002
- **Phase 2**: T006 and T007 can run in parallel after T005; T009 can run in parallel once interfaces are stable
- **US1**: T011/T012/T013 can run together; T014 can run in parallel with T016
- **US2**: T019/T020/T021 can run together; T022 and T024 can run in parallel
- **US3**: T027/T028/T029 can run together; T030 and T033 can run in parallel
- **Polish**: T035 and T036 can run in parallel before T037

---

## Parallel Example: User Story 1

```bash
# Parallel test authoring (US1)
# T011, T012, T013

# Parallel implementation (US1)
# T014 and T016
```

## Parallel Example: User Story 2

```bash
# Parallel test authoring (US2)
# T019, T020, T021

# Parallel implementation (US2)
# T022 and T024
```

## Parallel Example: User Story 3

```bash
# Parallel test authoring (US3)
# T027, T028, T029

# Parallel implementation (US3)
# T030 and T033
```

---

## Implementation Strategy

### MVP first (US1 only)

1. Complete Phase 1 and Phase 2
2. Complete Phase 3 (US1)
3. Validate with US1 commands and manual quickstart flow
4. Pause for demo/approval before US2/US3

### Incremental delivery

1. Foundation complete -> unlock all stories
2. Deliver US1 -> validate -> merge
3. Deliver US2 -> validate relay latency/refresh -> merge
4. Deliver US3 -> validate recoverable errors/dedupe -> merge
5. Run Phase 6 polish and full validation before release

