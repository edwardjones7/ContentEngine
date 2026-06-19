# Elenos Admin — Content (production Next.js app)

The content engine as the real thing it ships as: **Next.js (App Router) + TypeScript
+ React Server Components + server actions**, the shape that drops into
`admin.elenos.ai`. Same pipeline as `../engine`, now production-framed.

```bash
npm install          # once
npm run seed         # populate: 1 published post + 2 drafts (renders slides)
npm run dev          # http://localhost:4050
```

(Slide rendering reuses the Playwright browser already installed for
`../slide-prototype`.)

## What's here

- **`/content`** — idea queue → **Generate** runs a server action: brief → blog →
  renders slides to clean PNGs → redirects to the review page.
- **`/content/[pieceId]`** — review: edit the blog (server action), **Reshuffle
  layouts** (re-art-directs), **Download .zip** (route handler), **Accept & publish**.
- **`/content/queue`** — all pieces with draft/published state.
- **`/blog`, `/blog/[slug]`** — the published post (your `elenos.ai/blog` side; publish
  = write record + `revalidatePath`).
- **`/internal/slide/[pieceId]/[index]`** — a single slide as a live page (design
  iteration; the route a screenshot-based renderer would target).
- **`proxy.ts`** — the auth gate over `/content/*` (stub; delegates to real admin auth
  in the monorepo — set `ADMIN_GATE=1` to simulate).

## Architecture (what ports vs what's local)

| Concern | Here (local) | In admin.elenos.ai |
|---|---|---|
| UI / routes / actions | `app/**` | same — these ARE the App Router files |
| Slide system | `lib/slides/*` | copy as-is |
| Pipeline (brief/blog/providers/context) | `lib/content/*` | copy as-is |
| Persistence | `lib/db.mjs` (JSON file) | swap impl → Postgres (Prisma/Drizzle); same fn names |
| Image storage | `public/renders/` | Vercel Blob (one line in `lib/render.mjs`) |
| Auth | `proxy.ts` stub | existing admin session/proxy |
| AI | offline stubs unless `ANTHROPIC_API_KEY` | set the key — live path is written |

## Offline vs live

Offline by default (deterministic stubs → fully demoable now). Set
`ANTHROPIC_API_KEY` and the same steps call Claude (`lib/content/providers.mjs`),
falling back to the stub on failure. Nothing else changes.

`e2e.mjs` drives the whole flow through the browser (generate → reshuffle → publish)
and is how the actions were verified.
