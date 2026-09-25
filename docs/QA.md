# QA report · 2026-09-25 · v0.1.0

## GitHub import recheck — 2026-09-25

- Source: the supplied `peibu-prototype-v0.1.0.zip`; application code, tests, lockfile and CI configuration are imported unchanged. Only handoff/status documentation is refreshed.
- `npm ci --ignore-scripts --no-audit --no-fund` could not finish because this execution container cannot resolve `registry.npmjs.org`. The stalled install was stopped; this is **not** recorded as a successful clean install.
- The container already provides the exact locked TypeScript **5.8.3**. A local, uncommitted `node_modules/typescript` symlink to that installation was used for rechecks; no dependency or lockfile was changed.
- `npm run check`: strict typecheck PASS; **40/40** Node tests PASS.
- `npm run standalone`: PASS, generated portable HTML size **277,653 bytes**.
- `python tests/browser_smoke.py`: **12/12** PASS. Same in-memory Storage test-double approach as described below; no Android/iOS or real-origin persistence claim.
- Visual recheck: inspected 1440px desktop and 390px mobile screenshots using the same fictional-data, in-memory Storage fixture; no horizontal overflow in either viewport. This is not a real-device or accessibility-conformance test.
- Recheck runtime: Node **22.16.0**, TypeScript **5.8.3**, Python **3.13.5**, Playwright **1.57.0**, Chromium **144.0.7559.96**.
- Remote publication and Actions are verified separately on the import PR. Do not infer a remote CI pass from these local results. No website deployment is part of this import.

## Original package handoff results (historical)

| Check | Result | Scope |
|---|---|---|
| TypeScript strict typecheck | PASS | All source files |
| `npm run build` | PASS | ES module output and static assets |
| Node unit/storage suite | 40/40 PASS | Domain invariants, imports, storage failures |
| Chromium UI smoke suite | 12/12 PASS | HTML rendered in memory; explicit Storage test double |
| Portable single HTML export | PASS | Self-contained data-URL modules, inline CSS |
| Desktop visual inspection | PASS | 1440px viewport |
| Mobile visual inspection | PASS | 390px viewport; next step visible in first screen |
| Horizontal overflow checks | PASS | 390px and 320px; plus 120% settings test |
| Native HTTP static response | Checked locally | Does not establish browser-origin persistence |
| Remote GitHub push / Actions / website | NOT PERFORMED | New private repository must first be created/authorized |

Test environment: Node v22.16.0, TypeScript 5.8.3, Python Playwright 1.57.0, system Chromium 144.0.7559.96. The app does not depend on Playwright at runtime.

## Browser test interpretation

The environment blocked browser navigation to the local HTTP origin. No browser security policies were changed. UI tests instead loaded the project's generated portable HTML with `page.set_content`, and provided an explicitly scoped in-memory implementation of the Storage interface for normal-state tests. A separate test used the actual inaccessible Storage condition and verified the warning/fallback path.

These tests verify the rendered app’s interactions and serialized storage adapter roundtrip, NOT real browser `localStorage` durability, file-origin behavior, installability, iOS/Android hardware, background scheduling or multi-device synchronization. Preview screenshots show fictional data and the normal-storage UI branch using that same test fixture.

## Covered regressions

1. Read-only mode preview; changing/undoing modes preserves stable task IDs and execution snapshots.
2. A completed compact block is not later reclassified as a longer completed block.
3. Completed records created AFTER a mode change also survive undo.
4. Fixed lessons, required homework and life/rest blocks are protected.
5. Help is non-terminal; duplicate completions are rejected; corrections retain original content.
6. Pending task edits retain IDs; cancellation affects one occurrence only.
7. Conflicts are displayed; no silent automatic schedule rearrangement.
8. Templates generate fresh IDs, do not copy completion facts, and refuse occupied weeks.
9. Invalid dates/durations/units/import versions/numbers/orphan references/duplicate IDs are rejected.
10. Unknown time/quantity remains null; imported HTML-like strings display as text.
11. Corrupt data, read denial, quota errors and cross-tab baseline changes do not silently overwrite.
12. Child interface, keyboard Escape, mobile navigation, size settings and import confirmation work in the fixture.

## Before a real pilot

- Run via HTTP in Android Chrome and iOS Safari; create a record, reload, close the browser, reopen, and verify exact retained data.
- Test file:// separately and document its limitations; do not infer it from the HTTP test.
- Test two real tabs editing the same origin, storage quota and privacy/incognito restrictions.
- Export and re-import an actual downloaded file, including on Android Downloads/iOS Files. Ensure automatic pre-import backup download is not blocked.
- Verify layout at 200% browser zoom, long Traditional Chinese titles, hardware keyboards and a screen reader. This is not a WCAG conformance claim.
- Review backup recovery, data limits and confirmed teacher instructions with adults using non-sensitive data.
- Check Actions on the real repository after push. A local pass is not a remote CI result.
- Before any hosted household data service: implement authentication, server-side isolation, retention/deletion policy, reviewed migrations and monitoring. The current view switch is not access control.

## Known limits

Single profile, under-1-MB backup schema, no generic solver/deadlines/transit model, no synchronization, no PWA service worker, no timers/audio scoring, no original holiday-backup migration, no payment or real deployment. `LocalRepository` compare-before-write is best-effort, not a cross-tab atomic database transaction.
