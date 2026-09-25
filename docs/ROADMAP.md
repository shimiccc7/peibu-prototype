# Roadmap with explicit gates

## 0.1 delivered

Editable local schedule, two interface views, three adjustable modes, stable execution snapshots, bounded backup/import, templates, conflict warnings, strict types and tests.

## 0.2 usability validation

- Replace immediate demo seeding with an explicit demo / empty-start choice.
- Add per-subject templates while keeping the generic domain.
- Add amount-progress events with clear units and no double counting.
- Improve mobile font/touch-target audit, keyboard and screen-reader review.
- Real HTTP-origin and file-origin roundtrips on Android Chrome and iOS Safari.
- Controlled migration and recovery UI; storage limits indicator.
- Let families save their preferred page/view and customize an empty week.

Gate: unfamiliar adult testers can create, adjust and reuse a week without editing source or asking for technical help.

## 0.3 shared service design — not automatic scope

Decide backend/hosting after validated need. Add adult authentication, server-enforced household membership, invitation expiry, minimum child profile data, database transactions, audit log, migrations with rollback, conflict strategy, deletion/export and privacy review. Keep child-only interface capabilities limited by actual server permissions, not hidden buttons.

Gate: tenant-isolation tests, authorization review, recovery drill and explicit consent/data policy before other families store real data.

## 0.4 assistance and integrations

Teacher goal-sharing and optional calendar READ integration first. AI parses to a draft; deterministic rules validate; a user previews and approves. Calendar WRITE, notifications and external model uploads each require separate permissions and an audit trail.

Gate: input effort actually falls and families can explain/undo proposed changes. Do not add voice scoring, payment, social ranking or a broad school ERP merely to increase feature count.

## Commercial validation

Measure time to first useful week, weekly maintenance effort, repeated use, concrete saved coordination work and real willingness to pay. Do not replace these measures with total checked boxes, streaks or children’s practice duration. Avoid imposing test-price or revenue assumptions as validated demand.
