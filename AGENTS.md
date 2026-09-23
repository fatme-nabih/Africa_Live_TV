<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Africa Live local MVP

- Keep the source project `C:/Users/GAMER PC/IPTV` unchanged.
- Use the dedicated PostgreSQL database `africa_live_dev` and localhost:3001.
- Keep the complete catalog visible. Local playback may retry historical
  failures and expired checks without marking those sources healthy.
- Browser and VLC must download media directly from the upstream source.
  Never add a media relay, server-side video conversion or media storage.
- Automatic desktop VLC launch is specific to the local workstation.
  Do not weaken production authentication or eligibility rules.
- Exclude `e2e/fixtures` (synthetic binary media) from TypeScript and ESLint.
- Do not commit or push unless the user asks.

## Continuity and current operating rules

- Read `contextellm.md` at the start of a new session. It is the dated handoff
  for the current Local/Railway/OVHcloud work and points to the detailed runbooks.
- Treat the working tree as intentionally dirty. Inspect `git status --short`
  before editing, preserve all existing changes, and never use destructive Git
  commands to clean or replace them.
- Railway project `just-compassion` is a **staging** target even though its
  dashboard environment is named `production`; `DEPLOYMENT_ENV=staging` is the
  authoritative application role. Do not promote it to production implicitly.
- Do not deploy, change Railway/OVHcloud/Clerk state, alter DNS, subscribe to an
  alert, upgrade a plan, or incur a cost unless the user's current request
  authorizes that action. Never expose secrets in commands, logs, documentation
  or chat output.
- The acquired domain is `africatv.sn`. Reserve `staging.africatv.sn` for the
  current Railway staging environment. Reserve `africatv.sn` and
  `www.africatv.sn` for the future production launch. Keep the Railway-provided
  domain as a diagnostic fallback during staging.
- Before any Railway schema-changing deployment, obtain a restorable backup.
  Use `npm run db:migrate:deploy`, not `db:push`, for future deployment
  migrations. A code rollback does not reverse a database migration.
- Railway's legacy `railway.json` config-as-code mechanism is deprecated and is
  deliberately absent. Do not recreate it. A future `.railway/railway.ts` must
  begin with an import/pull and a no-change plan of the existing project.
- Healthcheck target is public `GET /api/health`, with a planned Railway timeout
  of 120 seconds. It must be deployed and verified on the Railway domain before
  the dashboard healthcheck is enabled.
- Relevant operational sources of truth are:
  `docs/production-backlog.md`, `docs/production-progress.md`,
  `docs/environment-matrix.md`, `docs/non-regression-checklist.md`, and
  `docs/railway-preproduction-runbook.md`.
