# Static demo deployment · prepared 2026-09-25

## Status

Deployment configuration is ready; this is **not a live-site confirmation**. At preparation time the Vercel connection was not installed/authorized, and no Vercel project, deployment, URL, domain or paid service was created. GitHub Pages was not enabled. The repository remains Private, PR #1 remains unmerged, and other repositories are untouched.

## Target and settings

- Repository: `shimiccc7/peibu-prototype`.
- First preview ref: `bootstrap/prototype-v0.1.0` (contains the app; do not import the README-only `main`).
- Vercel Framework Preset: Other (`framework: null`).
- Root: repository root; Node.js 22.x is the tested series.
- Install: `npm ci --ignore-scripts`.
- Build: `npm run check && node scripts/build-hosted.mjs`.
- Output: **`site`**, never repository root, `src`, or the developer `dist` output.
- No environment variables, database, runtime API tokens, microphone, telemetry or payment integration are required by the app.

After connecting Vercel, inspect accessible projects first. Use a new isolated Peibu project or an already matching project, never another app. Authorize the Vercel GitHub integration for this repository if requested; ChatGPT's GitHub grant does not automatically grant Vercel access. Create a preview from the exact app branch/commit; leave the source repository private and do not merge PR #1 just to obtain a preview. Do not purchase a plan or domain. Check the selected account's plan terms before creating a paid or commercial service.

## Hosted output and privacy

`build-hosted.mjs` creates a clean, generated `site/` directory with browser JavaScript/CSS/HTML, robots instructions, and a small `deployment.json` version/commit marker. It compiles without source maps, checks its file allowlist and local module references, and rejects unexpected output entries. It never uploads files itself.

`vercel.json` serves only `site/`, keeps deployment source/log visibility disabled, disables framing and camera/microphone/geolocation, avoids stale caching of unhashed assets, and requests that search engines not index the demo. These settings do **not** provide authentication or a security audit. A public browser app necessarily exposes its delivered JavaScript, even when its GitHub repository is private. `noindex` and `public: false` do not make the web page private.

The app seeds only fictional data. User-entered state remains local to the browser; hosting providers can still process ordinary request metadata such as IP addresses and paths. There is no cloud backup or real parent/child access control. Do not upload real family exports, tickets, recordings, private profiles, or Git credentials into public build assets.

A downloaded HTML file and a hosted domain are different storage origins. Use the v1 JSON export/import to transfer existing prototype data; changing a preview hostname also changes the browser's storage location. A stable address should be chosen before regular use.

## Verification performed in the preparation environment

- Application source, build config and existing tests checked against the original GitHub tree; no application behavior, dependency or schema changes.
- Clean local `npm ci` failed with registry DNS error `EAI_AGAIN`; it is not claimed to have passed.
- The exact locked TypeScript 5.8.3 was already installed globally. An uncommitted local symlink was used for build checks, without changing the lockfile.
- `npm run check`: strict typecheck and **40/40** Node tests passed.
- `npm run standalone`: passed.
- `node scripts/build-hosted.mjs`: passed; **12** static output files, no source maps, local module references verified.
- Existing browser smoke test output marked all 12 test methods `ok`, but the overall process timed out during teardown. This is not claimed as a clean successful suite exit for this local rerun.
- Native HTTP-origin browser verification was blocked with `ERR_BLOCKED_BY_ADMINISTRATOR`. No bypass was attempted. Real-origin persistence, hosted headers and physical Android/iOS behavior remain unverified.
- GitHub CI now also runs the hosted-output build. Its actual result must be checked on the new commit, independently from earlier CI runs.

## Release acceptance after a real deployment

1. Verify provider status is ready and record the returned URL and deployed commit. Never invent a URL from a project name.
2. Fetch `/`, `/assets/app.js`, `/assets/styles.css` and `/deployment.json`; confirm HTTP status, MIME types and exact deployed commit.
3. Confirm unknown assets return 404; do not add an unconditional SPA rewrite to conceal missing files.
4. Confirm headers and inspect 390px mobile and desktop views at the hosted origin.
5. Record one fictional task, reload, change mode and reload again. Verify native local storage and immutable completion details.
6. Test a new browser profile to check whether the page is public or protected; report the observed access requirement without silently weakening existing deployment protection.
7. Verify source maps and repository-only paths are not served. Do not count deployment preparation or CI success as site publication.

## Official setup references

- https://vercel.com/docs/project-configuration/vercel-json
- https://vercel.com/docs/builds/configure-a-build
- https://vercel.com/docs/git
