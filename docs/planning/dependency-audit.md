# Dependency Audit — Non-@civ-clone Packages

Status: Draft  
Last updated: 2026-06-09

## Summary

| Package | Current | Latest | Action | CVE? |
|---------|---------|--------|--------|------|
| esbuild | 0.14.x | 0.28.x | Upgrade — breaking watch API | GHSA-67mh-4wv8-2f99 (MEDIUM) |
| glob | 11.0.x | 11.1.x | Upgrade — CVE fix | CVE-2025-64756 (HIGH, CLI only) |
| typescript | 4.x | 5.8.x | Upgrade — 2 major jumps | — |
| prettier | 2.x | 3.x | Upgrade — minor breaking | — |
| esbuild-sass-plugin | 2.x | 3.x | Upgrade | — |
| marked | 4.x | 18.x | Upgrade; drop @types/marked | — |
| i18next | 22.x | 26.x | Upgrade (deferred) | — |
| i18next-browser-languagedetector | 7.x | 8.x | Upgrade (deferred) | — |
| idb | 7.x | 8.x | Upgrade | — |
| sass | 1.59 | 1.100 | Upgrade | — |
| feather-icons | 4.28 | 4.29 | Upgrade; assess lucide migration | — |
| @dom111/element | 0.2.0 | 0.2.1 | Upgrade | — |
| @dom111/typed-event-emitter | 0.1.2 | — | Review for protocol event bus | — |
| @types/node | 14.x | 22.x (LTS) | Upgrade | — |
| @types/feather-icons | 4.29.1 | 4.29.4 | Upgrade | — |
| @types/marked | 4.x | — | Remove (marked ships own types from v5+) | — |
| **zod** | — | 3.x | **Add** — boundary validation | — |

---

## Active CVEs

### GHSA-67mh-4wv8-2f99 — esbuild (MEDIUM, dev-only)

esbuild dev server sets `Access-Control-Allow-Origin: *` on all responses, allowing any
website to read bundled source from the dev server via fetch.
Production builds are not affected. Fix: upgrade to >= 0.25.0.

### CVE-2025-64756 — glob (HIGH, CLI-only)

The glob CLI option `-c/--cmd` executes matches with `shell: true`, allowing command injection
via crafted filenames. The glob JS library API is not affected.
Fix: upgrade to >= 11.1.0.

---

## Package Notes

### esbuild

The `watch` option on `buildOptions` was removed in 0.17. New API requires `context()`:

	// 0.14.x (old)
	buildOptions.watch = { onRebuild: () => {} };
	build(buildOptions);

	// 0.17+ (new)
	const ctx = await context(buildOptions);
	await ctx.watch();

esbuild.js must be updated before upgrading.

### typescript

TypeScript 5.8.x is the well-established latest minor. TS 6.0 is published but very new;
defer to 6.x until the linting/testing toolchain confirms compatibility.
Notable changes from 4.x: stricter narrowing, moduleResolution bundler preferred for
browser targets, several legacy emit flags removed.

### marked

marked ships its own TypeScript types from v5 onward; remove @types/marked.
v4 to v18 is a large API jump (async renderer, rewritten extension API).
Deferred until the UI rendering layer is under active development.

### i18next / i18next-browser-languagedetector

v22 to v26 includes breaking changes to the plugin and backend loader API.
Deferred until the UI translation layer is started.

### @dom111/typed-event-emitter

The current event bus. Suitable for renderer-side UI events. For the protocol layer
(ActionCommand dispatch, delta/snapshot bus), assess whether the web-standard EventTarget
or a micro-library like mitt (200b) better fits the decoupled transport model.
Decision deferred to WP-007 (Transport Adapter Layer).

### feather-icons

Lucide is the actively maintained community fork with additional icons and ESM-first
packaging. Migration is low-priority; assess when UI work begins.

### zod (new addition)

Used for schema validation at protocol trust boundaries (WP-008 scope).
Add as a peer dependency of the protocol-state package.
Provides excellent TypeScript inference with minimal runtime overhead.

---

## Recommended Action Plan

Phase 1 — immediate (unblock secure builds):
- Upgrade esbuild to >= 0.25.0, update esbuild.js for new watch API.
- Upgrade glob to >= 11.1.0.
- Upgrade sass, prettier, idb, feather-icons, @dom111/element, @types/node, @types/feather-icons.
- Remove @types/marked (types now bundled in marked itself).
- Pin typescript to ^5.8.0.
- Add zod ^3.0.0.

Phase 2 — when SCSS build is exercised:
- Upgrade esbuild-sass-plugin to ^3.x and verify SCSS output.

Phase 3 — when UI layer starts:
- Upgrade marked to latest; update renderer usage.
- Upgrade i18next + i18next-browser-languagedetector; update plugin config.
- Assess feather-icons -> lucide migration.

Phase 4 — when toolchain is validated:
- Evaluate TypeScript 6.x upgrade.
