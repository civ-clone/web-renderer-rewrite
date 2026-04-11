# Phase 0 Research: Local Player Client Relay

## Research Scope

- Resolve technical behavior for a new `LocalPlayer` client that relays frontend intents to backend command handling.
- Confirm best-practice boundaries for determinism, duplicate-submission protection, and typed contracts.
- Confirm performance verification approach against feature success criteria.

## Findings

### 1) Client implementation shape

- Decision: Implement `LocalPlayer` as a concrete class that extends `Client` from `@civ-clone/core-client` and conforms to `IClient` via explicit typed method signatures.
- Rationale: This preserves existing client lifecycle semantics and keeps feature logic composable without introducing parallel client abstractions.
- Alternatives considered:
  - Wrapper around existing client instance: rejected because ownership/lifecycle and event surface become ambiguous.
  - Standalone utility module with no `Client` inheritance: rejected because it bypasses expected polymorphic client integration points.

### 2) Frontend-to-backend command contract

- Decision: Use a typed intent-to-command translation layer (`FrontendCommandIntent -> BackendCommandRequest`) with deterministic mapping and explicit validation failures.
- Rationale: A dedicated mapper isolates UI shape churn from backend command format and provides a single place to enforce stale/invalid guardrails.
- Alternatives considered:
  - Pass frontend payload directly to backend: rejected due to weak boundary typing and higher risk of invalid command shape leakage.
  - Encode mapping in UI components: rejected because it duplicates logic and harms testability.

### 3) Mandatory action retrieval and refresh

- Decision: Always return the full current mandatory action set from the active local player context; refresh action list after every command outcome (success or failure).
- Rationale: Directly satisfies FR-004 and FR-006, and keeps UI recovery simple after stale or rejected actions.
- Alternatives considered:
  - Incremental/diff updates only: rejected for initial increment due to complexity and stale-state risk.
  - Refresh only on success: rejected because it violates recovery requirements for rejected actions.

### 4) Duplicate submission prevention

- Decision: Add interaction-window dedupe keyed by action identifier + turn/state token + in-flight marker; reject or ignore repeats until outcome is resolved.
- Rationale: Meets FR-008 and protects backend from repeated clicks generating duplicate command processing.
- Alternatives considered:
  - UI-only button disabling: rejected because backend-facing protection must remain reliable even if UI protection regresses.
  - Time-based debounce only: rejected because it may still allow duplicate semantic submissions.

### 5) Error outcome behavior

- Decision: Standardize command outcomes into `success | rejected | transport_error | interpretation_error` with user-visible message and refreshed action list where available.
- Rationale: Produces recoverable and testable behavior for FR-007 across backend and local interpretation failures.
- Alternatives considered:
  - Throw exceptions to UI directly: rejected due to inconsistent UX and weaker contract clarity.
  - Single generic error string: rejected because it impairs recovery and observability.

### 6) Testing and performance verification

- Decision: Adopt test-first coverage for unit (intent mapping and dedupe guard) and integration (relay + refreshed mandatory actions); capture submit-to-outcome timing in integration harness with <=2s p95 target under local dev conditions.
- Rationale: Satisfies constitution test-first gate and spec success criteria SC-002/SC-003 while avoiding speculative optimization.
- Alternatives considered:
  - Integration-only tests: rejected because mapper/dedupe edge cases need isolated unit assertions.
  - Defer performance checks until after implementation: rejected due to constitutional requirement for explicit measurement approach in plan stage.

## Resolved Clarifications

- Runtime language/tooling: TypeScript 4.x project.
- External interface type: internal typed module contract (not HTTP/OpenAPI).
- Persistence impact: none for this feature increment.
- Determinism strategy: fixed-seed replay-oriented integration checks around action-list transitions.

