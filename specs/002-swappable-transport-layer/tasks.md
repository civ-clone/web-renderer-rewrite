# Tasks: Swappable Transport Layer

**Input**: Design documents from `/Users/dom111/Code/civ-clone/web-renderer-rewrite/specs/002-swappable-transport-layer/`
**Prerequisites**: `plan.md` (required), `spec.md` (required)

**Tests**: Test-first is required by spec/constitution (see SC-001–SC-006). For each story, write failing tests first, then implement to green.

**Organization**: Tasks are grouped by user story for independent implementation and validation.

## Format: `[ID] [P?] [Story?] Description with file path`

- `[P]`: Task can run in parallel (different files, no incomplete dependencies)
- `[Story]`: Present only for user-story tasks (`[US1]`, `[US2]`, `[US3]`, `[US4]`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create new source and test directory scaffolding for the transport module.

- [X] T001 Create transport module and test directory structure: `src/transport/`, `src/transport/adapters/`, `tests/unit/transport/`, and `tests/contract/transport/` (touch `.gitkeep` in each)

**Validation commands (Phase 1)**

```zsh
cd /Users/dom111/Code/civ-clone/web-renderer-rewrite
npx pnpm run ts:compile
npx pnpm test
```

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define the typed transport contract and shared test infrastructure that all user stories depend on.

**CRITICAL**: Complete this phase before user story work. All five files must compile cleanly and be importable before any story phase begins.

- [X] T002 Define `TransportRequest` and `TransportResponse` structured-clone-safe types with `correlationId` string field and `type` discriminant union (`'mandatory-action' | 'choice-list'`) in `src/transport/TransportMessage.ts`
- [X] T003 [P] Define `ITransport` sender interface with a `send(request: TransportRequest): void` method signature (engine-side contract) in `src/transport/ITransport.ts`
- [X] T004 [P] Define `ITransportListener` receiver interface with an `onMessage(handler: (response: TransportResponse) => void): void` method signature (frontend-side contract) in `src/transport/ITransportListener.ts`
- [X] T005 Export `ITransport`, `ITransportListener`, `TransportRequest`, and `TransportResponse` as named re-exports from `src/transport/index.ts`
- [X] T006 [P] Create in-process synchronous transport stub (implements both `ITransport` and `ITransportListener`) and shared transport test fixtures in `tests/helpers/transportFixtures.ts`

**Validation commands (Phase 2)**

```zsh
cd /Users/dom111/Code/civ-clone/web-renderer-rewrite
npx pnpm run ts:compile
npx pnpm run test:unit
```

**Checkpoint**: Transport contracts compile and are importable; stub is usable by all story test phases.

---

## Phase 3: User Story 1 — Player Takes Turn via Isolated Engine Process (Priority: P1) 🎯 MVP

**Goal**: Serialise mandatory actions through the injected transport, await a matched response, and return the player's chosen action to the engine. Prove the full `takeTurn()` round-trip works end-to-end with the Web Worker postMessage adapter.

**Independent Test**: Start an in-process game with the transport stub, trigger a single mandatory-action request, resolve it from the stub's listener side, and confirm the engine receives the correct action.

### Tests for User Story 1 (write first, expect fail)

- [X] T007 [P] [US1] Write failing unit test asserting each transport request carries a unique `correlationId` string not reused within a session in `tests/unit/transport/correlation-id.test.ts`
- [X] T008 [P] [US1] Write failing unit test asserting that a pending request not resolved within the configured timeout rejects with a recoverable `TransportTimeoutError` and clears its pending entry in `tests/unit/transport/pending-request-timeout.test.ts`
- [X] T009 [P] [US1] Write failing integration test for a full `takeTurn()` round-trip: engine dispatches mandatory actions via the stub transport, stub listener resolves with a selection, engine receives the correct action and advances state in `tests/integration/local-player/take-turn-round-trip.test.ts`

### Implementation for User Story 1

- [X] T010 [US1] Implement `PostMessageTransportAdapter` using `globalThis.postMessage` (send) and `globalThis.addEventListener('message', ...)` (listen); implement both `ITransport` and `ITransportListener` in `src/transport/adapters/PostMessageTransportAdapter.ts`
- [X] T011 [US1] Refactor `LocalPlayer` constructor to require an `ITransport` injection parameter; implement `takeTurn()` to serialise mandatory actions into a `TransportRequest`, stamp a unique `correlationId`, dispatch via `ITransport.send()`, register a pending resolver, and await a matching `TransportResponse` with configurable timeout (default 30 s) in `src/client/local-player/LocalPlayer.ts`
- [X] T012 [US1] Update `src/client/local-player/index.ts` to re-export the refactored `LocalPlayer` and update any re-exports that callers of the index depend on

**Validation commands (US1)**

```zsh
cd /Users/dom111/Code/civ-clone/web-renderer-rewrite
npx pnpm run test:unit -- tests/unit/transport/correlation-id.test.ts
npx pnpm run test:unit -- tests/unit/transport/pending-request-timeout.test.ts
npx pnpm run test:integration -- tests/integration/local-player/take-turn-round-trip.test.ts
npx pnpm run ts:compile
```

**Checkpoint**: US1 is independently functional and demo-ready (MVP). SC-001 is satisfied.

---

## Phase 4: User Story 2 — Player Responds to a Choice Prompt (Priority: P2)

**Goal**: Serialise a choice list through the transport, match the player's selected value back to the originating request via correlation ID, and return it to the engine. Prove concurrent sequential requests are never cross-contaminated.

**Independent Test**: Trigger a `chooseFromList()` call via the transport stub, provide a synthetic selection, and verify the correct value is returned to the engine without contaminating any other pending request.

### Tests for User Story 2 (write first, expect fail)

- [X] T013 [P] [US2] Write failing unit test asserting that two concurrent in-flight requests each resolve with their own response and neither response is delivered to the wrong pending entry in `tests/unit/transport/concurrent-requests.test.ts`
- [X] T014 [P] [US2] Write failing unit test asserting that a `TransportResponse` with a `correlationId` matching no open pending request is silently discarded without error or side-effect in `tests/unit/transport/orphan-response.test.ts`
- [X] T015 [P] [US2] Write failing integration test for a full `chooseFromList()` round-trip: engine dispatches choices via the stub transport, stub listener resolves with a specific selection, engine receives exactly that value in `tests/integration/local-player/choose-from-list-round-trip.test.ts`

### Implementation for User Story 2

- [X] T016 [US2] Extend `LocalPlayer.chooseFromList()` to serialise the choices array into a `TransportRequest` with type `'choice-list'`, stamp a unique `correlationId`, dispatch via the injected `ITransport`, await a matched `TransportResponse`, and return the selected value to the engine in `src/client/local-player/LocalPlayer.ts`

**Validation commands (US2)**

```zsh
cd /Users/dom111/Code/civ-clone/web-renderer-rewrite
npx pnpm run test:unit -- tests/unit/transport/concurrent-requests.test.ts
npx pnpm run test:unit -- tests/unit/transport/orphan-response.test.ts
npx pnpm run test:integration -- tests/integration/local-player/choose-from-list-round-trip.test.ts
npx pnpm run ts:compile
```

**Checkpoint**: US2 works independently. SC-003 (0% cross-contamination) is satisfied.

---

## Phase 5: User Story 3 — Developer Swaps Transport to Electron IPC (Priority: P3)

**Goal**: Prove that replacing the postMessage adapter with a mock Electron IPC adapter requires zero changes to `LocalPlayer` or engine source. The contract test is the evidence artefact.

**Independent Test**: Instantiate `LocalPlayer` with the mock IPC transport stub, run a full `takeTurn()` round-trip, and confirm identical results with no `LocalPlayer` source modifications.

### Tests for User Story 3 (write first, expect fail)

- [X] T017 [P] [US3] Write failing contract test that runs the same `takeTurn()` round-trip scenario against both the `PostMessageTransportAdapter` and a mock Electron IPC adapter; assert identical outcomes in both cases in `tests/contract/transport/transport-adapter.contract.test.ts`

### Implementation for User Story 3

- [X] T018 [US3] Add a `MockElectronIpcTransport` stub (implements `ITransport` + `ITransportListener` using in-process callbacks simulating IPC channels) to `tests/helpers/transportFixtures.ts`
- [X] T019 [US3] Confirm `LocalPlayer` constructor TypeScript signature accepts any `ITransport`-compliant value with no type cast required; update constructor type if a narrower type was used in T011 in `src/client/local-player/LocalPlayer.ts`

**Validation commands (US3)**

```zsh
cd /Users/dom111/Code/civ-clone/web-renderer-rewrite
npx pnpm run test:contract -- tests/contract/transport/transport-adapter.contract.test.ts
npx pnpm run ts:compile
```

**Checkpoint**: SC-002 satisfied — transport swap verified at type level and runtime with zero `LocalPlayer` changes.

---

## Phase 6: User Story 4 — Developer Swaps Transport to WebSocket for Multiplayer (Priority: P4)

**Goal**: Prove the transport contract handles out-of-process async delivery by adding a WebSocket stub with simulated network latency to the adapter suite. The `LocalPlayer` awaits the delayed response without hanging.

**Independent Test**: Configure `LocalPlayer` with the WebSocket stub, simulate a latency-delayed response, confirm the round-trip resolves correctly and within the configured timeout.

### Tests for User Story 4 (write first, expect fail)

- [X] T020 [P] [US4] Extend the transport adapter contract test to add a `MockWebSocketTransport` scenario with artificial async latency (e.g., `setTimeout` delay); assert the `takeTurn()` round-trip resolves correctly and a delayed-but-within-timeout response is not prematurely rejected in `tests/contract/transport/transport-adapter.contract.test.ts`

### Implementation for User Story 4

- [X] T021 [US4] Add `MockWebSocketTransport` stub (implements `ITransport` + `ITransportListener` with configurable `setTimeout` latency) to `tests/helpers/transportFixtures.ts`

**Validation commands (US4)**

```zsh
cd /Users/dom111/Code/civ-clone/web-renderer-rewrite
npx pnpm run test:contract -- tests/contract/transport/transport-adapter.contract.test.ts
npx pnpm run ts:compile
```

**Checkpoint**: SC-002 extended to async remote scenario; timeout path verified.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Non-regression gating, DOM-globals isolation check, and full FR/SC evidence recording.

- [X] T022 [P] Run `npx pnpm test` to verify SC-004: all active LocalPlayer and transport tests pass after removing the no-transport fallback path and updating constructor call sites; record pass/fail evidence in `specs/002-swappable-transport-layer/checklists/requirements.md`
- [X] T023 [P] Add SC-005 DOM-globals isolation verification: add a `vitest` test or TypeScript `lib` config guard asserting that `src/transport/` and `src/client/local-player/` contain no `document`, `window`, or other DOM-global references; document the check in `specs/002-swappable-transport-layer/checklists/requirements.md`
- [X] T024 Run full validation suite (`npx pnpm test && npx pnpm run lint`) and record pass evidence for each FR (FR-001–FR-013) and SC (SC-001–SC-006) in `specs/002-swappable-transport-layer/checklists/requirements.md`

**Validation commands (Polish)**

```zsh
cd /Users/dom111/Code/civ-clone/web-renderer-rewrite
npx pnpm run ts:compile
npx pnpm test
npx pnpm run lint
```

---

## Dependencies & Execution Order

### Phase dependencies

```
Setup (Phase 1) → Foundational (Phase 2) → User Stories (Phases 3–6) → Polish (Phase 7)
```

User story execution order by priority: US1 (P1) → US2 (P2) → US3 (P3) → US4 (P4)

### User story dependencies

- **US1**: Depends only on Phase 2; no dependency on US2/US3/US4. MVP-complete on its own.
- **US2**: Depends on Phase 2. Can start immediately after Phase 2 but is sequenced after US1 because the pending-request map and correlation-ID mechanism introduced in T011 are shared infrastructure.
- **US3**: Depends on US1 (T011 must exist to test zero-change swap). No dependency on US2.
- **US4**: Depends on US3 (T017 contract test file must exist to extend in T020). No dependency on US2.

### Within-story ordering rules

- Tests first (must fail) → implementation → story-specific validation commands
- Transport types (Phase 2) before all story implementations
- `ITransport` / `ITransportListener` interfaces stable before `PostMessageTransportAdapter` (T010) or `LocalPlayer` refactor (T011)
- Stub fixtures (T006, T018, T021) before any test that imports them

---

## Parallel Opportunities

- **Phase 2**: T003 and T004 can run in parallel after T002; T006 can run in parallel once T002–T004 are stable
- **US1 tests**: T007, T008, T009 can all be authored in parallel
- **US1 impl**: T010 (adapter) and T011 (LocalPlayer refactor) can run in parallel; T012 is a single-line update after both
- **US2 tests**: T013, T014, T015 can all be authored in parallel
- **US3/US4**: T017 and T020 share the same file (T017 creates, T020 extends); T018 and T021 are independent stub files and can run in parallel
- **Polish**: T022 and T023 can run in parallel; T024 depends on both

---

## Parallel Example: User Story 1

```bash
# Parallel test authoring (US1)
# T007, T008, T009 — different files, all independent

# Parallel implementation (US1)
# T010 (PostMessageTransportAdapter) and T011 (LocalPlayer refactor) — different files
```

## Parallel Example: User Story 2

```bash
# Parallel test authoring (US2)
# T013, T014, T015 — different files, all independent

# Implementation (US2)
# T016 only — extends LocalPlayer already established in T011
```

## Parallel Example: User Story 3 + 4

```bash
# T018 (MockElectronIpc stub) and T021 (MockWebSocket stub) — different files, parallel
# T017 (contract test creation) must precede T020 (contract test extension)
```

---

## New Source Files Summary

| File | Phase | Purpose |
|------|-------|---------|
| `src/transport/TransportMessage.ts` | 2 | `TransportRequest` + `TransportResponse` types with correlation ID and discriminant |
| `src/transport/ITransport.ts` | 2 | Engine-side sender interface |
| `src/transport/ITransportListener.ts` | 2 | Frontend-side receiver interface |
| `src/transport/index.ts` | 2 | Named re-exports for all transport contracts |
| `src/transport/adapters/PostMessageTransportAdapter.ts` | 3 (T010) | Production Web Worker postMessage adapter |
| `src/client/local-player/LocalPlayer.ts` | 3 (T011) | Refactored: ITransport injection, takeTurn + chooseFromList over transport |
| `src/client/local-player/index.ts` | 3 (T012) | Updated re-exports |
| `tests/helpers/transportFixtures.ts` | 2 (T006) | In-process stub + MockElectronIpc + MockWebSocket |
| `tests/unit/transport/correlation-id.test.ts` | 3 (T007) | Unique ID per request |
| `tests/unit/transport/pending-request-timeout.test.ts` | 3 (T008) | Timeout → recoverable error |
| `tests/unit/transport/concurrent-requests.test.ts` | 4 (T013) | Correlation isolation |
| `tests/unit/transport/orphan-response.test.ts` | 4 (T014) | Unknown ID → silent discard |
| `tests/integration/local-player/take-turn-round-trip.test.ts` | 3 (T009) | Full takeTurn() round-trip |
| `tests/integration/local-player/choose-from-list-round-trip.test.ts` | 4 (T015) | Full chooseFromList() round-trip |
| `tests/contract/transport/transport-adapter.contract.test.ts` | 5 (T017) | Adapter-swappability contract |

---

## Implementation Strategy

### MVP first (US1 only)

1. Complete Phase 1 and Phase 2 (T001–T006)
2. Complete Phase 3 (US1: T007–T012)
3. Validate with US1 commands — SC-001 satisfied, full `takeTurn()` round-trip green
4. Pause for review before US2–US4

### Incremental delivery

1. Foundation complete (Phase 2) → unlock all stories
2. Deliver US1 → validate takeTurn round-trip → merge
3. Deliver US2 → validate chooseFromList + concurrent isolation → merge
4. Deliver US3 → validate contract test with two adapters → merge
5. Deliver US4 → validate async/latency scenario → merge
6. Run Phase 7 polish, full lint + test, record SC evidence before release

