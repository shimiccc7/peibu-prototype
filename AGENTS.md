# Peibu development rules

## Scope and safety
- This repository is independent. Never read/write unrelated application repositories or production databases.
- Use only fictional fixtures. Do not commit children’s real names, school schedules, messages, recordings, credentials, exported family backups, or screenshots of private accounts.
- Never hard-delete execution history to fix a UI bug. Do not run destructive migrations.
- Parent/child is a VIEW switch only. Do not describe it as authentication/RBAC.
- Do not add telemetry, microphone access, push, calendar writes, or remote AI calls without explicit scope approval.
- Do not deploy or change repository visibility merely because code was requested.

## Domain invariants
1. Task ID does not depend on date, duration, mode, or display text.
2. Execution facts carry an immutable task snapshot and scheduled duration. Planned minutes never become actual minutes automatically.
3. Applying/undoing a mode changes future flexible plans only, not facts created before OR after a change.
4. Fixed lessons and life/rest blocks cannot become flexible via UI or imported data.
5. Unknown amount/time is null, not zero; completion is not a measurement.
6. Template reuse generates NEW IDs and never copies records or overwrites an occupied target week.
7. Import validates structure, version, size, unique IDs and references before mutation.
8. Storage errors/corruption/conflicts must not report success or silently overwrite stored data.
9. Display imported strings as text; escape every interpolation used in HTML attributes/content.
10. A schedule conflict is visible. Never claim an impossible schedule is resolved.

## Delivery gate
- Run `npm ci`, `npm run check`, `npm run standalone`.
- If browser tooling exists, run `python tests/browser_smoke.py` and inspect 390px and desktop screenshots.
- Distinguish mock-storage UI tests from actual browser-origin persistence tests.
- Update docs/QA.md and CHANGELOG.md with actual results, not assumptions.
- Preserve local date semantics; do not replace them with `toISOString().slice(0,10)` for daily plans.
- Keep the domain framework-independent. If adopting React, retain and rerun invariants/tests.
- Commits should be focused; never force-push. Read remote/branch state before writes.

## Next phase
Follow docs/ROADMAP.md. First add real-origin/device QA and user-managed empty onboarding. Cloud, AI, subscriptions and multi-child are separate decisions, not starter dependencies.
