# Architecture · 0.1.0

## Boundaries

`UI → application actions → pure domain functions → LocalRepository`

The TypeScript domain does not import the DOM, storage implementation, or UI. The current event-delegated DOM layer may later be replaced by React without changing the core contracts.

## Data model

- **Task**: stable UUID, local date and HH:MM, baseline duration, compact duration, flexible flag, user goal, optional quantity/unit. Cancellation is an archive flag for ONE occurrence.
- **Mode map**: normal / compact / rest keyed by local date. It derives a future effective plan; it does not mutate task identity.
- **ExecutionRecord**: unique ID, task ID, ISO recorded-at, a copy of task data and effective scheduled duration, done/help/rest, nullable measured time/quantity, observation and nullable correction timestamp.
- **PlanChange**: before/after mode, changes preview, recorded-at, undo timestamp.
- **WeekTemplate**: name, day offsets and task definitions, seven modes. Application creates new IDs and refuses occupied weeks.
- **AppState**: schemaVersion 1, monotonically increasing revision, profile, tasks, modes, facts, change log, templates.

The schedule considers a latest non-voided done/rest record terminal. A help record is not terminal. Historical titles/dates/durations come from the snapshot rather than current task properties. Changing a mode never rewrites a record. Correcting a record marks it voided but retains original content.

## Mode preview and undo

`previewMode` is pure and records a base revision. `applyMode` rejects stale revisions and recomputes its changes, so it does not trust arbitrary UI-supplied change arrays. `undoMode` changes only the applicable day’s mode and its log. It never restores the whole application to an earlier state, which would lose new execution facts.

Normal = baseline duration. Compact = chosen smaller duration for flexible tasks. Rest = zero planned duration for still-pending flexible tasks. Protected tasks and already completed/rested tasks retain their values. No automatic start-time changes or deadline solver in v0.1.

## Validation and persistence

The storage adapter parses and validates its own writes as well as imports. Backup input is limited to 1 MB, version 1, known enum/numeric/date fields, unique IDs and valid record-task references. It constructs known objects rather than merging untrusted arbitrary keys.

The adapter remembers the last raw serialized value. Before a write it compares the current origin value to this baseline. A different value indicates another tab and blocks overwrite. This is a best-effort single-origin prototype guard, NOT a cross-process atomic transaction or a cloud synchronization protocol.

A quota error keeps in-memory changes visible with a warning. Corrupt or inaccessible stored data is not overwritten. An original-raw export is available when the old bytes could be read. There is no automatic corruption repair or reset button.

## UI and exposure

No runtime network calls, analytics, backend, external fonts, images, microphone permissions or email/calendar integrations. All dynamically rendered strings are escaped. Inline SVG icons are project-created UI symbols, not external assets.

Parent/child views share the same browser data and controls can be switched without a password. This is intentionally NOT security. Role enforcement, authentication and household isolation must be implemented server-side before any shared service.

## Build and portable preview

TypeScript 5.8.3 compiles strict source to browser ES modules. `dist/` can be served by static hosting. The optional standalone script rewrites this project’s acyclic relative imports into data URLs; source maps are removed from that preview. This exports a single self-contained HTML for evaluation, not a PWA.

No bundler/runtime framework is required in this first prototype. The HTML preview and a deployed origin are separate storage scopes. A later product build should adopt a maintained bundler, explicit migration policy and real device tests before broad distribution.
