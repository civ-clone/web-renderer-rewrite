<!--
Sync Impact Report
- Version change: 0.0.0-template -> 1.0.0
- Modified principles:
  - Template Principle 1 -> I. Engine State Integrity
  - Template Principle 2 -> II. Deterministic Turn and Render Behavior
  - Template Principle 3 -> III. Type-Safe Modular Boundaries
  - Template Principle 4 -> IV. Test-First Quality Gates
  - Template Principle 5 -> V. Performance and Bundle Discipline
- Added sections:
  - Technical Standards
  - Workflow and Review
- Removed sections:
  - None
- Templates requiring updates:
  - ✅ updated: `.specify/templates/plan-template.md`
  - ✅ updated: `.specify/templates/spec-template.md`
  - ✅ updated: `.specify/templates/tasks-template.md`
  - ✅ reviewed (no changes required): `.specify/templates/agent-file-template.md`
  - ✅ reviewed (not present): `.specify/templates/commands/*.md`
- Follow-up TODOs:
  - None
-->

# web-renderer-rewrite Constitution

## Core Principles

### I. Engine State Integrity
All gameplay state mutations MUST flow through explicit engine rules/events and MUST
preserve state validity at turn boundaries. Rendering code MUST NOT directly mutate
core game state. Any exception MUST be documented in the feature plan and approved
in code review because hidden mutation paths create desync and debugging risk.

### II. Deterministic Turn and Render Behavior
Given identical inputs, seed, and starting state, simulation outcomes MUST be
reproducible across runs. Rendering layers MAY differ in presentation details, but
MUST NOT alter simulation results. Features that introduce randomness MUST define
seeded behavior and test coverage for deterministic replay.

### III. Type-Safe Modular Boundaries
New behavior MUST be implemented as composable, typed modules with explicit imports
and contracts. `any` and unchecked type assertions MUST NOT be introduced in new or
modified code unless accompanied by a documented justification and follow-up task to
remove the escape hatch. Public module interfaces MUST remain stable or include
migration notes in the spec and plan.

### IV. Test-First Quality Gates
Every feature change MUST include tests that fail before implementation and pass
after implementation. Unit tests are required for isolated logic; integration tests
are required for cross-module behavior and engine/render interactions. No feature
work is complete until local quality gates (`ts:compile`, formatting, and relevant
tests) pass.

### V. Performance and Bundle Discipline
Changes MUST maintain responsive UI interaction and avoid avoidable turn/render
regressions. New dependencies MUST be justified in the plan with bundle/runtime
impact. Features that materially affect rendering or turn execution MUST include a
measurement approach and an explicit acceptance threshold in the spec.

## Technical Standards

- TypeScript is the source of truth for shipped application logic.
- Build output MUST remain reproducible via repository scripts.
- Lint/format rules and compiler constraints MUST be enforced before merge.
- Runtime/browser-facing behavior MUST degrade gracefully when optional assets or
  non-critical data are unavailable.

## Workflow and Review

- Work begins from a feature spec with prioritized user stories and measurable
  success criteria.
- The implementation plan MUST pass Constitution Check gates before Phase 0 and be
  re-checked after design updates.
- Tasks MUST be grouped by user story, preserve independent testability, and include
  required testing and performance verification tasks.
- Pull requests MUST reference the relevant spec/plan/tasks artifacts and document
  constitutional compliance or justified exceptions.

## Governance

This constitution overrides conflicting local process notes for this repository.
Amendments require: (1) a documented proposal, (2) explicit maintainer approval,
(3) updates to affected templates and guidance files in the same change.

Versioning policy:
- MAJOR: backward-incompatible governance change or principle removal/redefinition.
- MINOR: new principle/section or materially expanded mandatory guidance.
- PATCH: clarification, wording precision, and non-semantic refinements.

Compliance review expectations:
- Every plan MUST include a Constitution Check with pass/fail evidence.
- Every pull request review MUST validate constitutional adherence.
- Exceptions MUST include rationale, scope, and a follow-up action owner.

**Version**: 1.0.0 | **Ratified**: 2026-04-11 | **Last Amended**: 2026-04-11
