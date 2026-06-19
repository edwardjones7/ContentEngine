# Elenos Content Engine (standalone, offline)

The full pipeline — **idea → brief → blog + carousel → review → publish / download** —
running locally with **no API keys and no npm install**. It reuses the slide system
in `../slide-prototype` and Node built-ins only.

```bash
npm start            # http://localhost:4040   (needs ../slide-prototype set up once:
                     #  cd ../slide-prototype && npm install && npx playwright install chromium)
```

## What it does

- **Ideas** (`/`) — research-grounded angles in the Elenos voice. Offline these are
  seeded; with a key they come from Claude. Hit **Generate** on one.
- **Generate** — runs the brief (→ carousel spec), the blog (→ markdown), and renders
  every slide to a **clean, post-ready PNG**. Lands in the review queue as a *draft*.
- **Review** (`/piece/:id`) — edit the blog inline, **reshuffle layouts** (re-art-directs
  for a fresh composition mix), **download slides** as a `.zip`, or **Accept & publish**
  the blog. Blogs never publish without that click.
- **Published** (`/blog/:slug`) — the live post (simulates elenos.ai/blog).

## Offline vs live

`MODE` is `offline` unless `ANTHROPIC_API_KEY` is set. Offline uses deterministic
stubs (seeded ideas, authored/templated briefs, templated blogs) so the whole flow
is demonstrable now. Set the key and the same steps call Claude (`lib/providers.mjs`),
falling back to the stub if a call fails. No code change.

```bash
ANTHROPIC_API_KEY=sk-... npm start   # flips to live; everything else identical
```

## Layout (logic ports to the monorepo; only the UI is throwaway)

- `lib/pipeline.mjs` — orchestrator: live (Claude) vs offline per step.
- `lib/providers.mjs` — live Claude calls (Opus 4.8 text / Sonnet 4.6 ideation), behind the key.
- `lib/brief.mjs` — idea → carousel spec (authored carousel, or templated from idea fields). Validates against `SPEC.md`.
- `lib/blog.mjs` — idea + spec → markdown post (the long-form derived from the same brief).
- `lib/context.mjs` — brand context + seed ideas.
- `lib/render.mjs` — renders a piece's slides via `../slide-prototype/api.mjs` (clean PNGs, cached under `data/renders/`).
- `lib/store.mjs` — JSON store (interface ports to Postgres; swap the impl).
- `lib/zip.mjs` — dependency-free ZIP for slide downloads.
- `lib/md.mjs` / `lib/html.mjs` — markdown + the server-rendered admin UI.
- `server.mjs` — routes + actions.
- `data/` — runtime store + rendered PNGs (gitignore-worthy).

## How this maps to the production plan

This is the repo-independent proof of **Phases 1–3** running together. In the
`admin.elenos.ai` monorepo: `lib/*` (minus `html.mjs`/`server.mjs`) becomes
`lib/content/*`, the UI becomes `app/(admin)/content/*` routes, the JSON store
becomes Postgres, and slide rendering moves behind the `/internal/slide` route.
The contract (`../slide-prototype/SPEC.md`) and the slide system carry over unchanged.
