# Implementation Plan: Swappable Transport Layer

**Branch**: `002-swappable-transport-layer` | **Date**: 2026-04-11 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/002-swappable-transport-layer/spec.md`

**Note**: This file is the output of the `/speckit.plan` command.

> Update (2026-04-11): later implementation decisions explicitly accepted
> breaking changes to simplify the architecture. Preserve transport injection
> and clean boundaries over legacy compatibility.

## Summary

Introduce a typed `ITransport` contract and a concrete `PostMessageTransportAdapter` implementation that decouples the `LocalPlayer` client (running in the engine execution context) from the frontend UI. `LocalPlayer` is refactored to inject the transport at construction time; it serialises mandatory-action and choice-list requests into structured-clone-safe payloads, attaches a unique correlation ID, sends them through the transport, and awaits matching responses with configurable timeout. The frontend listens for incoming requests via the transport's receiver interface, renders the appropriate UI, and posts the player's selection back. Because the transport is an injected interface, any compliant adapter — Web Worker `postMessage`, Electron IPC, WebSocket, WebRTC — can replace the default without touching `LocalPlayer` or engine source.

## Technical Context

**Language/Version**: TypeScript 4.x (`typescript` from `package.json`)  
**Primary Dependencies**: `@civ-clone/core-client`, `@civ-clone/core-civ-client`, `@dom111/typed-event-emitter`, existing `@civ-clone/*` gameplay packages  
**Storage**: N/A (no new persistence; correlation-ID map is in-process memory only)  
**Testing**: `vitest` (already present), `ts:compile` pre-merge gate  
**Target Platform**: Browser — primary deployment is engine in Web Worker, frontend in main thread; Electron IPC, WebSocket, and WebRTC are explicitly expected secondary targets (adapters out of scope for this spec increment)  
**Project Type**: TypeScript web application package  
**Performance Goals**: Full `takeTurn()` round-trip (dispatch → render → select → resolve) must complete in measurable time; transport abstraction itself adds no observable overhead beyond native channel cost; timeout default ≤ 30 s, configurable  
**Constraints**: All payloads must be structured-clone-compatible (no class instances, functions, or circular refs at transport boundary); no `any` at transport boundary without a documented follow-up task; engine context must contain no DOM globals (verifiable by lint or runtime check); `LocalPlayer` and engine code must require zero modifications to swap transport adapters  
**Scale/Scope**: Single local player per execution context; one open transport channel per session; concurrent sequential requests from one player must not cross-contaminate

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate Review

- [x] **State Integrity**: Engine execution context is the sole authority for game state. The transport carries only serialised read-only snapshots of available actions/choices to the frontend; no path from frontend → engine state exists outside the defined `LocalPlayer.takeTurn()` / `chooseFromList()` response paths. **PASS**.
- [x] **Determinism**: For identical starting state and identical player selections, engine outcome is identical regardless of which transport implementation is in use. UI side-effects (DOM events, browser APIs) are fully isolated behind the transport boundary; they cannot reach engine state. Deterministic replay is verifiable by replaying a sequence of correlation-ID–ordered response values against a fixed-seed engine. **PASS**.
- [x] **Type-Safe Boundaries**: `ITransport`, `TransportRequest`, and `TransportResponse` form explicit, typed crossing points. All payload fields are `Record<string, unknown>` or narrowed serialisable unions; no `any`-typed escape is planned at the boundary. Any discovered necessity for `any` requires a documented follow-up task. **PASS**.
- [x] **Test-First Gates**: Failing tests must be authored first for: transport dispatch of mandatory actions, transport dispatch of choice lists, correlation ID matching, concurrent request isolation, orphan-response discard, graceful timeout handling, and full `takeTurn()` round-trip with a postMessage stub. Breaking changes are acceptable, so the gate is consistency of all active tests and updated call sites rather than preserving legacy constructor behavior. **PASS**.
- [x] **Performance/Bundle**: Transport abstraction adds one extra function-call indirection and a `structuredClone`-compatible serialisation hop — no new runtime dependency for the core transport logic. The `PostMessageTransportAdapter` is thin (< 1 KB minified). Round-trip timing is captured in the integration harness. Acceptance threshold: complete `takeTurn()` round-trip resolves within the configured timeout (default 30 s); under deterministic test conditions with an in-process stub, it resolves in < 5 ms. **PASS**.

### Post-Phase 1 Re-Check

- [x] Research, data model, contracts, and quickstart preserve all five constitution principles with no justified exceptions. No `any` introduced at transport boundary. Timeout handling is fully recoverable (no hung promises). The updated test plan explicitly accepts the breaking change to require transport injection.

## Project Structure

### Documentation (this feature)

```text
specs/002-swappable-transport-layer/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── transport-contract.md
└── tasks.md             # Phase 2 output (/speckit.tasks command — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── client/
│   └── local-player/
│       ├── index.ts               # re-exports (existing, updated)
│       ├── LocalPlayer.ts         # extended: transport injection (existing, refactored)
│       └── types.ts               # existing types (kept, extended)
├── transport/
│   ├── index.ts                   # re-exports
│   ├── ITransport.ts              # Transport sender interface (engine side)
│   ├── ITransportListener.ts      # Transport receiver interface (frontend side)
│   ├── TransportMessage.ts        # TransportRequest + TransportResponse types
│   └── adapters/
│       └── PostMessageTransportAdapter.ts   # postMessage implementation

tests/
├── contract/
│   └── transport/
│       └── transport-adapter.contract.test.ts
├── integration/
│   └── local-player/
│       ├── take-turn-round-trip.test.ts
│       └── choose-from-list-round-trip.test.ts
└── unit/
    └── transport/
        ├── correlation-id.test.ts
        ├── pending-request-timeout.test.ts
        ├── concurrent-requests.test.ts
        └── orphan-response.test.ts
```

**Structure Decision**: Use existing single-package layout. New `src/transport/` module houses the contract types and all adapters; `LocalPlayer` is refactored in place to accept an `ITransport` injection; frontend integration lives in `src/ui/` adaptations. Test directories follow existing `tests/unit`, `tests/integration`, `tests/contract` conventions.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| None      | N/A        | N/A                                  |
