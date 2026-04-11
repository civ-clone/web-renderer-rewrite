# Implementation Plan: Local Player Client Relay

**Branch**: `002-create-feature-branch` | **Date**: 2026-04-11 | **Spec**: `/Users/dom111/Code/civ-clone/web-renderer-rewrite/specs/001-add-local-player-client/spec.md`
**Input**: Feature specification from `/Users/dom111/Code/civ-clone/web-renderer-rewrite/specs/001-add-local-player-client/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Introduce a typed `LocalPlayer` client implementation (extending `Client` from `@civ-clone/core-client` and implementing `IClient`) that translates frontend action intents into backend command submissions, returns full mandatory action lists for UI rendering, and safely handles stale/invalid/duplicate submissions with refreshed outcomes.

## Technical Context

**Language/Version**: TypeScript 4.x (`typescript` from `package.json`)  
**Primary Dependencies**: `@civ-clone/core-client`, `@dom111/typed-event-emitter`, existing `@civ-clone/*` gameplay packages  
**Storage**: N/A (client relay feature; no new persistence)  
**Testing**: `ts:compile`, plus feature tests to be added for unit and integration paths  
**Target Platform**: Browser-based web renderer (local development and production browser runtime)
**Project Type**: TypeScript web application package  
**Performance Goals**: Mandatory action refresh and command outcome feedback at <=2s for >=95% of local-dev submissions (from spec SC-002/SC-003)  
**Constraints**: Preserve deterministic engine behavior, avoid direct state mutation from renderer paths, no duplicate command processing per interaction window  
**Scale/Scope**: Single local player session validation path with mandatory-action visibility and relay flow

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

**Pre-Phase 0 Gate Review**

- [x] **State Integrity**: `LocalPlayer` acts as frontend/backend relay only; engine state updates remain backend rule/event driven.
- [x] **Determinism**: Relay flow is pure mapping + submission; replay verification strategy is fixed-seed integration tests comparing action list transitions.
- [x] **Type-Safe Boundaries**: Contract defines typed `FrontendCommandIntent`, `MandatoryActionView`, and `CommandOutcome`; no `any` planned.
- [x] **Test-First Gates**: Failing-first tests planned for mandatory action listing, relay success, stale/invalid rejection, and duplicate-submission guard.
- [x] **Performance/Bundle**: No new runtime dependency required; measure submit-to-outcome latency and action refresh time with <=2s p95 acceptance.

**Post-Phase 1 Re-Check**

- [x] Research, data model, contracts, and quickstart preserve all five constitution principles with no justified exceptions.

## Project Structure

### Documentation (this feature)

```text
specs/001-add-local-player-client/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
```text
.specify/
├── memory/
├── scripts/
└── templates/

specs/
└── 001-add-local-player-client/
    ├── spec.md
    ├── plan.md
    ├── research.md
    ├── data-model.md
    ├── quickstart.md
    └── contracts/

# Implementation source directories are not yet present in this repository snapshot.
# Feature implementation will introduce concrete runtime and test paths in /speckit.tasks.
```

**Structure Decision**: Use the existing single-package repository layout and create feature artifacts under `specs/001-add-local-player-client/`; implementation tasking will define exact runtime/test directories once code scaffolding is introduced.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
