# Pre-Planning Engineering Review: Complete Summary

**Date:** 2026-06-09  
**Status:** ✅ COMPLETE

All 6 pre-planning findings have been reviewed, documented, and locked with implementation plans.

## What was accomplished

### Source Discovery & Analysis
- Audited 9 civ1 PlayerActions packages and 35 core registry definitions
- Mapped complete action taxonomy (8 player-tier + 21 unit-tier actions)
- Identified cycle hotspots, determinism risks, and singleton state leaks
- Created persistent agent context notes for future developers

### Finding Review (6 findings, all HIGH or MEDIUM severity)

1. **Finding 1 (HIGH): Object graph actions are transport-hostile** ✅ SPEC'D
   - Two-tier action model identified (PlayerAction + Unit Action)
   - DTO shapes defined and tested
   - Operational flow locked
   - Ready for WP-002 implementation

2. **Finding 2 (HIGH): Runtime identity is process-local** ✅ SPEC'D
   - Hybrid stable ID strategy chosen (semantic for tiles/players, UUID for units/cities)
   - Dual-ID transition plan documented
   - Protocol types updated to carry both ephemeral and stable IDs
   - Ready for WP-002b implementation

3. **Finding 3 (HIGH): Registry lookups are object-identity based** ✅ SPEC'D
   - Projection layer strategy designed
   - Read-only snapshot export approach documented
   - No changes to core registries required
   - Ready for WP-004 implementation

4. **Finding 4 (HIGH): Non-deterministic RNG** ✅ SPEC'D
   - SeededRNG abstraction design complete
   - SHA-256 seed derivation strategy locked
   - Spaceship already supports injectable RNG (good pattern)
   - Ready for WP-006 implementation

5. **Finding 5 (MEDIUM): Mandatory/optional class-derived** ✅ SPEC'D
   - Action manifest extractor tool design
   - Optional inclusion in SnapshotEnvelope
   - Deferred to Phase 4 (post-MVP)
   - Ready for WP-008 if needed

6. **Finding 6 (MEDIUM): Singleton registries leak state** ✅ SPEC'D
   - Phase 1: reset() method strategy for tests
   - Phase 2 (deferred): RegistryContainer for multiplayer
   - 22 registries identified and mapped
   - Ready for WP-007 implementation

### Deliverables

**Documentation (3 new files, 2 updated):**
- `docs/planning/engineering-review.md` (872 lines) — full findings with implementation plans
- `docs/planning/implementation-roadmap.md` — work sequencing, critical path, WP dependencies
- `docs/adr/renderer-engine-v1-decisions.md` — DEC-010 through DEC-014 decision records
- `README.md` — updated with new doc links

**Protocol Package:**
- `packages/protocol-state/src/types.ts` — updated with two-tier actions, stable ID types
- `packages/protocol-state/src/schemas.ts` — updated with descriptor validation
- `packages/protocol-state/src/__tests__/schemas.test.ts` — 23/23 tests passing
- Zero TypeScript errors

**Agent Context:**
- `.github/agent-notes/civ-clone-source-context.md` — pnpm discovery, action/registry paths
- `.github/STARTUP_NOTE.md` — quick checklist for future agents

### Decisions Locked (14 total)

| DEC | Topic | Status |
|---|---|---|
| DEC-001 | Protocol design principles | ✅ |
| DEC-002 | Transport discriminated union | ✅ |
| DEC-003 | Snapshot versioning | ✅ |
| DEC-004 | Delta semantics | ✅ |
| DEC-005 | Serialization format | ✅ |
| DEC-006 | ID reference model | ✅ |
| DEC-007 | Migration strategy | ✅ |
| DEC-008 | Schema strictness (permissive now, strict later) | ✅ |
| DEC-009 | Work priority order | ✅ |
| DEC-010 | Stable ID strategy (hybrid) | ✅ |
| DEC-011 | Registry projection approach | ✅ |
| DEC-012 | Seeded RNG for determinism | ✅ |
| DEC-013 | Action manifest tool (deferred) | ✅ |
| DEC-014 | Registry lifecycle + reset strategy | ✅ |

### Critical Path (MVP Timeline)

```
WP-001 ✅ DONE (Protocol foundation)
  ↓
WP-002 (Action DTO) + WP-002b (Stable IDs) [2 weeks, parallel]
  ↓
WP-003 (Action ingress) [1 week]
  ↓
WP-004 (Snapshot export) [1 week]
```

**Total:** ~2 weeks to functional, deterministic action/state protocol.

Parallel work (WP-006 determinism, WP-007 test infra) does not block critical path.

## Hand-off readiness

✅ All findings are documented and actionable
✅ No blocking unknowns remain
✅ Decisions are locked and rationale captured
✅ Work packages have clear owners and durations
✅ Protocol contract is frozen (types + schemas tested)
✅ Agent context and startup notes prepared for future contributors

**Ready for implementation phase.**

---

## Quick reference

**For implementers:** Start with `docs/planning/implementation-roadmap.md` for work breakdown and priorities.

**For architects:** Review `docs/planning/engineering-review.md` for complete technical analysis.

**For decision makers:** See `docs/adr/renderer-engine-v1-decisions.md` for all locked choices and rationale.

**For new agents:** Read `.github/STARTUP_NOTE.md` first, then `.github/agent-notes/civ-clone-source-context.md`.

