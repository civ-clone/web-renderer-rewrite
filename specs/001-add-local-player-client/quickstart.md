# Quickstart: Local Player Client Relay

## Goal

Validate that the LocalPlayer client exposes all mandatory actions, relays selected commands, and reports recoverable errors with refreshed actions.

## Prerequisites

- Node.js and package manager used by repository (`pnpm-lock.yaml` present).
- Dependencies installed.
- Feature branch checked out (`002-create-feature-branch`).

## TDD Flow

1. Add failing unit tests for:
   - intent-to-command translation
   - duplicate submission guard behavior
   - interpretation error normalization
2. Add failing integration tests for:
   - mandatory action list completeness
   - successful relay and post-command refresh
   - stale/invalid backend rejection and refresh
3. Implement `LocalPlayer` client and contract types.
4. Re-run tests and compile until green.

## Local Validation Commands

```bash
cd /Users/dom111/Code/civ-clone/web-renderer-rewrite
npm install
npm run ts:compile
npm run test:contract -- local-player-client.contract.test.ts
npm run test:integration -- get-mandatory-actions
npm run test:integration -- submit-intent-success
npm run test:integration -- submit-intent-rejection
npm run test:integration -- submit-intent-errors
npm run test:unit -- intent-to-command.test.ts
npm run test:unit -- submission-lock.test.ts
npm run lint
bash scripts/validate-local-player-client.sh
```

## Manual Feature Validation Script

1. Start app in dev mode (project uses esbuild watch path).
2. Load a game state with known mandatory actions.
3. Confirm UI lists all mandatory actions returned by `getMandatoryActions()`.
4. Submit one action and confirm:
   - backend receives mapped command
   - UI refreshes mandatory action list from `CommandOutcome.updatedMandatoryActions`
5. Re-submit the same action rapidly and confirm duplicate protection prevents double processing.
6. Submit a stale/invalid action and confirm a recoverable user-visible error plus refreshed actions.

## Acceptance Mapping

- FR-004 / SC-001: full mandatory action visibility.
- FR-003 / SC-002: relay path completes within target latency.
- FR-007 / SC-003: invalid/rejected actions return clear recoverable outcomes.
- FR-008: duplicate submissions are not processed twice.

