# Phase 0 Research: New Game Interface Bootstrap

## Research Scope

- Define a deterministic startup orchestration that begins only after explicit user action.
- Confirm backend participant bootstrap approach for exactly one local and two AI participants.
- Define typed frontend-backend boundaries for start action, startup state, mandatory actions, and recoverable failures.
- Confirm test-first and performance verification approach for startup responsiveness and failure surfacing.

## Findings

### 1) Session start trigger behavior

- Decision: Introduce an explicit `startNewGame()` action path that is the sole startup trigger; page load stays idle.
- Rationale: Directly enforces FR-002 and FR-003 while keeping startup behavior obvious and testable.
- Alternatives considered:
  - Auto-start on load with optional cancel: rejected because it violates FR-002 and creates hidden initialization side effects.
  - Start on first UI interaction anywhere: rejected because trigger semantics are ambiguous and hard to test reliably.

### 2) Multiple-click and idempotence handling

- Decision: Gate startup with a one-shot initialization lock (`idle -> starting -> active|failed`) and ignore or return a recoverable status for repeated clicks while `starting` or `active`.
- Rationale: Prevents duplicate participant registration and inconsistent state when start is clicked rapidly (edge case from spec).
- Alternatives considered:
  - Disable button in UI only: rejected because backend-level idempotence still needs protection if UI regresses.
  - Allow restarts on each click: rejected because restart/resume controls are follow-up scope.

### 3) Participant and client bootstrap strategy

- Decision: Build participants in a fixed sequence: local human first, then two AI participants; create player identities and client bindings together, then register all before turn execution.
- Rationale: Satisfies FR-004, FR-005, FR-006 and keeps deterministic ordering straightforward.
- Alternatives considered:
  - Lazy AI creation after first local turn: rejected because it violates exact startup participant requirements.
  - Parallel participant creation with unordered registration: rejected due to reduced determinism and debugging clarity.

### 4) Gameplay module initialization gate

- Decision: Treat required gameplay modules as a startup profile that must initialize successfully before participant bootstrap completes and before turn progression starts.
- Rationale: Satisfies FR-007 and prevents partially initialized sessions.
- Alternatives considered:
  - Initialize modules opportunistically on-demand: rejected because startup can enter active play with missing rules.
  - Assume modules are always preloaded: rejected because feature requires consistent developer bootstrap without manual wiring.

### 5) Startup failure UX contract

- Decision: Standardize startup failures into a typed recoverable state surfaced to UI with stage (`module_init`, `participant_create`, `registry_bind`, `transport`) and message.
- Rationale: Meets FR-010 and supports deterministic test assertions for user-visible errors.
- Alternatives considered:
  - Throw uncaught errors to console only: rejected because user-visible recovery is required.
  - Single generic failure string: rejected because it obscures recovery and diagnosis.

### 6) Mandatory action visibility timing

- Decision: Keep mandatory actions hidden until startup reaches `active` and at least one local mandatory action payload is available.
- Rationale: Enforces FR-008 and FR-009 while preserving clear state transitions for tests.
- Alternatives considered:
  - Render empty action container immediately: rejected because it can imply an active session before start.
  - Show placeholder actions pre-start: rejected due to state-integrity and UX ambiguity.

### 7) Test and performance verification approach

- Decision: Use failing-first integration tests for bootstrap flow and edge cases, with timing assertions for first-action visibility (<=5s, 95% target) and failure surfacing (<=3s).
- Rationale: Satisfies constitution principle IV and spec success criteria SC-002 and SC-004.
- Alternatives considered:
  - Unit-only startup tests: rejected because cross-module behavior is core feature value.
  - Manual timing checks only: rejected because repeatable release gates require automated evidence.

## Resolved Clarifications

- Startup trigger semantics: explicit start control only, no automatic start.
- Participant composition: fixed to one local + two AI per session start.
- Startup sequencing: required modules initialize before participants are considered active.
- Error handling: all startup failures produce typed recoverable user-visible state.
- MVP UI scope: mandatory actions only; map rendering remains out of scope.

