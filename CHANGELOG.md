# Changelog

## 0.1.0 — 2026-09-25

Initial standalone Peibu prototype. Local plans and immutable execution snapshots are separated. Added date/task editing, protected blocks, mode impact preview and undo, parent/child interface views, observations, templates, settings, validated backup/import, print view and explicit persistence failure states.

Added strict TypeScript build, 40 Node tests, 12 browser interaction tests, optional standalone HTML generation, private-GitHub helper, developer instructions and architecture/QA/product docs.

No remote repository or website deployment was performed in this release handoff. Browser UI tests use a mock Storage adapter; real-device/origin persistence remains to be verified.

## Import verification — 2026-09-25

Prepared the existing v0.1.0 archive for `shimiccc7/peibu-prototype` on an isolated import branch. No application behavior, test or dependency changes. Refreshed GitHub status/setup documentation and recorded the current verification environment in `docs/QA.md`.

Re-ran strict typecheck, 40 Node tests, standalone generation and 12 browser UI tests successfully using the preinstalled exact TypeScript 5.8.3. A fresh `npm ci` was blocked by registry DNS resolution; it is not claimed to have passed. Real-origin/mobile persistence and remote CI remain separate verification steps. No deployment or automatic merge.
