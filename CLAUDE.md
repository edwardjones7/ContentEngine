# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Elenos' content engine: **idea → brief → carousel spec → rendered slide PNGs + blog + other
mediums → review → publish**. Carousels are rendered by headless Chromium from HTML/CSS
templates, so the LLM only ever writes *copy* — the look is code, and the output PNGs carry no
AI/C2PA/EXIF provenance.

Three directories are three generations of the same system. **`admin/` is the live one** — work
there unless told otherwise:

| Dir | Status |
|---|---|
| `admin/` | **Current.** Next.js 16 App Router + RSC + server actions. Everything below, plus Orbit research chat, the kanban board, calendar, multi-provider AI, Postgres/Blob backends. |
| `engine/` | Superseded prototype. Zero-dependency Node HTTP server (`server.mjs`) proving the same pipeline offline. Imports `../slide-prototype/api.mjs`. |
| `slide-prototype/` | Phase-0 proof of the slide renderer + the `SPEC.md` contract. |

`admin/lib/slides/*` is a **forward-evolved copy** of `slide-prototype/*.mjs`, not a symlink.
`layouts/template/util/validate` have diverged (admin adds `text()`/`dewidow()`, `{svg}`
illustrations, headline auto-scaling). Fixes to the slide system belong in `admin/lib/slides/`;
back-porting to `slide-prototype/` is optional. `content/` is a folder of exported JPGs, not code.

## Commands

```bash
# admin/ — the app
cd admin
npm install
npm run seed          # WIPES data/ and public/renders/, rebuilds a lived-in store (renders slides)
npm run dev           # http://localhost:4050
npm run build         # next build
node e2e.mjs          # Playwright end-to-end over the real UI; needs `npm run seed` + dev server running

# slide-prototype/ — installs the Chromium that admin/ and engine/ reuse
cd slide-prototype
npm install && npx playwright install chromium   # one-time
node validate.mjs                 # enforce SPEC.md over every carousels/*.json
node render.mjs [slug]            # render all carousels, or one, to out/<slug>/
node verify-metadata.mjs          # assert the PNGs contain only IHDR/IDAT/IEND

# engine/ — no npm install needed (Node built-ins only)
cd engine && npm start            # http://localhost:4040
```

There is no test runner and no linter. `e2e.mjs` and `verify-metadata.mjs` are the verification
gates. `next.config.mjs` sets `typescript.ignoreBuildErrors` — a clean `next build` does **not**
mean types check.

## Architecture (admin/)

**Layering is strict and load-bearing:**

```
app/**/page.tsx (RSC)  →  app/**/actions.ts ('use server')  →  lib/service.mjs  →  lib/content/pipeline.mjs  →  provider module
                                                             →  lib/render.mjs   →  lib/slides/api.mjs (Chromium)
                                                             →  lib/db.mjs
```

- **`lib/service.mjs`** is the only thing server actions call. All business operations live here
  (`acceptIdea`, `buildPiece`, `regenerateMedium`, `editPieceSlide`, `publishPiece`, …).
- **`lib/content/pipeline.mjs`** is the provider router. Every generation step tries
  chosen provider → local Ollama backup → **deterministic template**. A failing key, rate limit,
  or malformed response must never break a build — that invariant is why every step has a
  template twin in `lib/content/mediums.mjs` / `brief.mjs` / `blog.mjs`.
- **Provider modules are transports only.** `providers.mjs` (Claude), `gemini.mjs`, `ollama.mjs`
  all expose the same surface (`ideate/brief/blog/medium/critique/illustrate/editSlide`) and all
  get their prompts and post-processors from **`lib/content/prompts.mjs`**, so every engine emits
  identical shapes. Add a prompt change in `prompts.mjs`, not in a provider.
- **`lib/settings.mjs`** — `activeProvider()` is the single source of truth for which engine is
  live (`paid`=Claude, `free`=Gemini, `local`=Ollama, `offline`). Keys are stored in
  `admin/settings.local.json` (gitignored, deliberately outside `data/` so `npm run seed` can't
  delete them), falling back to `ANTHROPIC_API_KEY` / `GEMINI_API_KEY`.
- **`lib/db.mjs`** — one JSONB document behind an async interface, two backends: Neon Postgres
  when `POSTGRES_URL`/`DATABASE_URL` is set, else `data/db.json`. Writes go through `mutate()`,
  which compare-and-sets on a version column and retries. Never read/write `data/db.json` directly.
- **`lib/blob.mjs`** — renders go to `public/renders/` locally, Vercel Blob when
  `BLOB_READ_WRITE_TOKEN` is set. Pieces store whatever URL `putRenders` returned.

### Data model

`idea` → (accept) → `piece` in one of four stages: `production` → `review` → `ready` → `posted`
(plus the `idea` column on the board). Vocabulary lives in **`lib/content/stages.mjs`**, which has
zero imports so client components and `db.mjs` can both use it; it also normalizes legacy statuses
(`building/draft/published`).

- A piece's `concept` is the editable snapshot the brief re-runs from; `pieceIdea()` in
  `service.mjs` layers it back over the original idea to recover template-only fields.
- Stage moves (`setPieceStage`) are **pure** — they never touch spec/render/blog, so dragging
  backwards is lossless.
- **Publishing the blog is orthogonal to stage**: `publishPiece` copies into `db.published` and
  stamps `publishedAt`; the board stage stays put. Nothing auto-publishes.
- Cards carry three tag dimensions — `goal`, `brand`, `funnel` (see `TAG_FIELDS`).

### The slide system

`SPEC.md` in `slide-prototype/` is the **LLM↔renderer contract** and `SPEC_SUMMARY` in
`prompts.mjs` is its prompt-side mirror — change one, change the other. Key rules:

- Rich-text fields are run arrays (`[{t:"…"},{t:"…",em:true}]`); `label`/`sub`/`footer`/`cite`/
  `stat`/`tag` are plain strings.
- The LLM owns **story + copy**; the **art-director** (`art-director.mjs`) owns theme, background,
  and the no-two-adjacent-layouts guarantee — deterministically from a seed, so renders reproduce.
- **`validateCarousel` gates every LLM-authored spec** before it's adopted. `editPieceSlide` and
  the QA auto-fix both validate a trial spec and discard the revision on any error.

`renderPieceSlides` (`lib/render.mjs`) does more than screenshot when a live provider is set:
best-of-N seeds scored by a vision critique, then a bounded converging fix loop (layout override,
or one targeted copy rewrite) capped by `MAX_FIX_ROUNDS`/`MAX_COPY_FIXES`. It **mutates
`piece.seed` and `piece.spec`** — every caller must save the piece right after. Any QA failure
degrades silently to the plain render.

### Orbit (research chat)

`lib/orbit/chat.mjs` is an agent loop (`web_search` + a `propose_idea` client tool) streamed as
NDJSON events by `app/api/orbit/[threadId]/route.ts`. Messages are persisted as **verbatim
Anthropic content blocks** so history replays to the API untransformed; `sanitizeForAnthropic`
strips Gemini-shaped blocks on replay. A proposed idea is *not* saved — `fileThreadIdea` runs only
when the user clicks "File idea", deduped by `toolUseId`.

## Deployment constraints (these shape the code)

- **`canRenderSlides()` is false on Vercel** — Playwright is a devDependency and Chromium isn't
  there. Any action that screenshots must be gated with `requireRenderer()`.
- Playwright is imported lazily in `lib/slides/api.mjs` and listed in `serverExternalPackages`, so
  merely loading `service.mjs` never pulls in the browser bundle.
- The serverless filesystem is read-only: `db.mjs` and `settings.mjs` both fall back to in-memory
  rather than throwing.
- `proxy.ts` is an HTTP Basic gate keyed on `ADMIN_PASSWORD` (unset → open, for local dev).

## Conventions

- Logic modules are **`.mjs` JavaScript** with `@/lib/...` imports from TypeScript pages. Don't
  convert them to TS; the split is intentional (they were written to port into a monorepo).
- Server-only modules (`db`, `service`, `render`, `settings`, everything in `lib/content`) must not
  cross the client boundary. Pages build explicit DTOs (see `toPieceCard` in `app/content/page.tsx`)
  — heavy fields like `spec`, blog markdown, and QA output stay on the server.
- Comments in this codebase explain *why* (invariants, fallbacks, deployment constraints), not
  *what*. Match that.
- Brand voice for all generated copy: short fragments, em-dashes, real numbers, no exclamation
  points, no hype. The canonical guide is `.claude/skills/instagram-carousel-design/SKILL.md`;
  brand facts are in `admin/lib/brand/elenos-context.json`.
