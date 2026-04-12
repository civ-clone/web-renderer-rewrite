# Implementation Plan: New Game Interface Bootstrap

**Branch**: `003-create-feature-branch` | **Date**: 2026-04-12 | **Spec**: `/Users/dom111/Code/civ-clone/web-renderer-rewrite/specs/003-new-game-interface/spec.md`
**Input**: Feature specification from `/Users/dom111/Code/civ-clone/web-renderer-rewrite/specs/003-new-game-interface/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add an explicit new-game bootstrap flow to the shipped page: no session starts on load, a visible start control triggers one deterministic session initialization, backend bootstraps exactly three participants (1 local + 2 AI), required gameplay modules initialize before turn processing, and frontend mandatory actions become visible once available, with clear recoverable failure states when startup cannot complete.

## Technical Context

**Language/Version**: TypeScript 4.x (`typescript` from `package.json`)  
**Primary Dependencies**: `@civ-clone/core-engine`, `@civ-clone/core-player`, `@civ-clone/core-civ-client`, `@civ-clone/core-ai-client`, existing `@civ-clone/*` gameplay modules, current transport contract in `src/transport/`  
**Storage**: N/A (in-memory runtime bootstrap only; no persistence introduced)  
**Testing**: `vitest` suites (`tests/unit`, `tests/integration`, `tests/contract`) + `ts:compile` + lint gate (`npx pnpm test && npx pnpm run lint`)  
**Target Platform**: Browser runtime with packaged page assets from existing esbuild pipeline  
**Project Type**: TypeScript web application package (single repository project)  
**Performance Goals**: First mandatory actions visible within 5s in >=95% local start attempts (SC-002); startup failure surfaced within 3s of detection (SC-004)  
**Constraints**: No auto-start on page load; single active startup flow per session trigger; required module initialization must complete before turn execution; map rendering stays out of MVP scope; transport unavailability must produce recoverable user-visible error state  
**Scale/Scope**: One developer-facing local session bootstrap flow, fixed participant count (3), one local interactive client and two AI clients

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **State Integrity**: Design keeps gameplay state mutation in explicit engine
      rules/events; rendering paths do not mutate core state.
- [x] **Determinism**: Plan documents deterministic behavior for identical input +
      seed and defines replay/verifiability approach.
- [x] **Type-Safe Boundaries**: New modules expose typed contracts; any `any` or
      unchecked assertions are justified with removal follow-up.
- [x] **Test-First Gates**: Required failing-first tests are identified (unit and
      integration where cross-module behavior exists).
- [x] **Performance/Bundle**: Plan includes impact expectations, measurement method,
      and acceptance thresholds for render/turn performance and bundle footprint.

### Pre-Phase 0 Gate Review

- [x] **State Integrity**: Start control triggers orchestrator commands only; participant and turn state are created by backend bootstrap and engine modules.
- [x] **Determinism**: Startup order is fixed (initialize modules -> create participants -> register clients -> start turn loop); replay checks use fixed-seed setup and deterministic input.
- [x] **Type-Safe Boundaries**: Frontend start action, backend bootstrap result, mandatory-action visibility, and startup failures use explicit typed contracts.
- [x] **Test-First Gates**: Failing-first tests planned for no-auto-start, single-start idempotence, participant/client registration counts, mandatory-action visibility, startup-failure surfacing, and transport-unavailable recovery.
- [x] **Performance/Bundle**: No new heavy runtime dependency planned; first-action and error-surface timings measured in integration flow against SC-002 and SC-004 thresholds.

### Post-Phase 1 Re-Check

- [x] Research, data model, contracts, and quickstart preserve all five constitution principles with no justified exceptions.

## Project Structure

### Documentation (this feature)

```text
specs/003-new-game-interface/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── new-game-bootstrap-contract.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── js/
│   ├── frontend.ts                      # page-level UI bootstrapping entry
│   └── backend.ts                       # engine/bootstrap orchestration entry
├── client/
│   └── local-player/
│       ├── LocalPlayer.ts               # local player command relay
│       └── types.ts                     # mandatory action and outcome views
├── transport/
│   ├── ITransport.ts
│   ├── ITransportListener.ts
│   ├── TransportMessage.ts
│   └── adapters/PostMessageTransportAdapter.ts
└── ui/
    └── mandatory-actions/
        ├── renderMandatoryActions.ts
        ├── submitMandatoryAction.ts
        └── showCommandOutcomeError.ts

tests/
├── contract/
│   └── transport/
├── integration/
│   └── local-player/
└── unit/
    ├── local-player/
    └── transport/
```

**Structure Decision**: Keep the current single-project layout. Implement new-game bootstrap orchestration in `src/js/` with typed boundary updates in existing client/transport/ui modules, and extend current test folders with startup-focused coverage.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| None      | N/A        | N/A                                  |
