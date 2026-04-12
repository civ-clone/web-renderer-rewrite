# Quickstart: New Game Interface Bootstrap

## Goal

Validate that the page stays idle until explicit start, bootstraps one local and two AI participants, and shows local mandatory actions with recoverable startup errors.

## Prerequisites

- Node.js and pnpm-compatible environment.
- Dependencies installed in repository root.
- Feature branch checked out (`003-create-feature-branch`).

## TDD Flow

1. Add failing integration tests for:
   - idle-on-load behavior (no implicit session start)
   - explicit start action creating one session
   - participant bootstrap count and binding checks (`1 local + 2 AI`)
   - mandatory-action visibility only after active startup
   - startup-failure user-visible recoverable state
2. Add failing unit tests for:
   - startup state machine (`idle -> starting -> active|failed`)
   - duplicate start-request idempotence while starting/active
   - failure code mapping for module/registration/transport errors
3. Implement start control wiring, bootstrap orchestrator, and typed UI state updates.
4. Re-run tests and lint/compile gates until green.

## Local Validation Commands

```bash
cd /Users/dom111/Code/civ-clone/web-renderer-rewrite
npx pnpm install
npx pnpm test
npx pnpm run lint
npx pnpm run test:integration -- local-player
npx pnpm run test:unit -- local-player
npx pnpm run build:dev
```

## Manual Validation

1. Start the local packaged page runtime.
2. Confirm the new-game control is visible on load and no mandatory actions are shown.
3. Click the start control once and verify session starts.
4. Verify startup registers exactly three participants with one local and two AI clients.
5. Verify mandatory actions appear for the local participant once startup is active.
6. Trigger a startup failure path (for example, simulated missing module) and confirm a clear recoverable error state is shown.

## Acceptance Mapping

- FR-001 / FR-002 / FR-003 / SC-001: visible start control, no auto-start, explicit session start.
- FR-004 / FR-005 / FR-006 / SC-003: fixed participant + player/client registration model.
- FR-007 / FR-012 / SC-005: required module initialization and packaged entrypoint reliability.
- FR-008 / FR-009 / SC-002: mandatory-action visibility timing and hidden idle state.
- FR-010 / SC-004: recoverable user-visible startup failure.
- FR-011: map rendering intentionally absent in MVP startup flow.

## Task Validation Notes

- Validate no-auto-start by asserting initial `session.status` is `idle` before invoking start handlers.
- Validate single-start idempotence by invoking start twice and expecting `already_started` on the second request.
- Validate bootstrap composition by asserting exactly three registry entries each for participants, players, and clients.
- Validate recoverable failures by simulating missing initialization modules and checking user-visible failure messaging.
- Validate timing thresholds with deterministic clocks for <=5s first-action visibility and <=3s failure surfacing.

