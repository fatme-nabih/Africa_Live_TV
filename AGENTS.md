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
