# Porting into admin.elenos.ai

This standalone engine is built so the **logic ports unchanged** and only the thin
HTTP/UI shell gets rewritten as Next routes. Long-term this lives under
`admin.elenos.ai/content`, gated by your existing admin auth.

## Module → destination map

| Standalone (here) | Monorepo destination | Change on port |
|---|---|---|
| `../slide-prototype/*` (themes, layouts, illustrations, art-director, template, validate, api) | `lib/content/slide-system/*` | none — copy as-is |
| `lib/brief.mjs` | `lib/content/brief.ts` | add types |
| `lib/blog.mjs` | `lib/content/blog.ts` | add types |
| `lib/providers.mjs` | `lib/content/providers.ts` | use `@ai-sdk/anthropic` instead of raw fetch (optional) |
| `lib/pipeline.mjs` | `lib/content/pipeline.ts` | same |
| `lib/context.mjs` | `lib/content/context.ts` | ideas come from Serper + Claude, not seeds |
| `lib/store.mjs` | `lib/content/db.ts` | **JSON → Postgres** (Prisma/Drizzle); same function names |
| `lib/render.mjs` | `lib/content/render.ts` | screenshot the `/internal/slide` route instead of `setContent` |
| `lib/zip.mjs` | keep, or swap for a lib | optional |
| `server.mjs` + `lib/html.mjs` + `lib/md.mjs` | `app/(admin)/content/**` | **rewritten** as Next pages/route handlers + server actions |

## Routes → Next App Router

| Standalone route | Next |
|---|---|
| `GET /` (ideas) | `app/(admin)/content/page.tsx` |
| `GET /queue` | `app/(admin)/content/queue/page.tsx` |
| `GET /piece/:id` | `app/(admin)/content/[pieceId]/page.tsx` |
| `POST /generate`, `/save`, `/regenerate`, `/publish` | server actions in those pages |
| `GET /piece/:id/download` | `app/(admin)/content/[pieceId]/download/route.ts` |
| `GET /renders/...` | Vercel Blob URLs (no route) |
| `GET /blog/:slug` | the **elenos.ai** app's blog route (publish writes a `blog_posts` row + `revalidatePath`) |
| *(new)* `/internal/slide/[pieceId]/[index]` | the slide as a real page; `render.ts` screenshots it |

## The three real swaps

1. **Auth** — wrap `app/(admin)/content/**` in the existing admin middleware. One change.
2. **Persistence** — `store.mjs`'s interface (`getPieces/savePiece/getPiece/addPublished/…`)
   maps 1:1 onto Postgres tables (`content_ideas`, `content_pieces`, `slides`, `blog_posts`).
   Swap the implementation, keep the calls.
3. **Publish target** — `addPublished()` becomes "insert `blog_posts` row (status=published)
   + `revalidatePath('/blog/[slug]')`" in the elenos.ai app. Still gated behind the
   explicit **Accept & publish** click; nothing auto-publishes.

## Already production-shaped (no rework)

- The **LLM↔renderer contract** (`../slide-prototype/SPEC.md`) + `validateCarousel` guard.
- The **slide system** (kit of parts + art-director + clean-PNG render).
- **offline ↔ live** is one env var (`ANTHROPIC_API_KEY`); the live path is written.
- Image storage: today disk under `data/renders/`; in the monorepo, **Vercel Blob**
  (the only line that changes in `render.ts` is where the PNG buffer is written).
