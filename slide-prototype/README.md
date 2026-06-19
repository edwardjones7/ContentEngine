# Elenos Slide Prototype — Phase 0

Repo-independent proof for the content-automation plan: we can **template** the
Elenos carousel look and render **clean, post-ready PNGs** — no AI metadata, so
the PicsArt re-export step disappears.

## What this proves
1. **Brand fidelity from a template.** The three slide archetypes (cover / body /
   cta) reproduce the archived carousels from pure data + HTML/CSS, rendered by
   headless Chromium. The LLM only ever has to write the *copy*; the look is ours.
2. **Metadata-free output.** Rendered PNGs contain only `IHDR/IDAT/IEND` — no
   C2PA, EXIF, XMP, or AI provenance markers. `verify-metadata.mjs` parses the
   PNG chunk structure and fails loudly if anything else appears.

## Run it
```bash
npm install
npx playwright install chromium   # one-time, downloads the headless browser
node validate.mjs                  # check every carousel conforms to SPEC.md
node render.mjs                    # renders every carousel @ 1080x1350 -> out/<slug>/
node render.mjs speed-to-lead      # render a single carousel by slug
node verify-metadata.mjs           # proves every PNG is clean
```

Output is a **single 1080×1350 set** per carousel — reuse the same PNGs for
Instagram and TikTok (no separate exports).

## How the variety works (constants vs variables)

Carousels stop looking the same because the design is a **kit of parts**, not one
template. **Constants** hold the Elenos identity on every slide: near-black base,
film grain + vignette, serif headlines, the `NN / LABEL` mono index, footer,
wireframe line-art. **Variables** make each carousel distinct:

- **Layout variants** per archetype (statement: `headline-art` · `art-headline` ·
  `centered` · `fullbleed` · `bottom-heavy`; body: `left-text-right-art` ·
  `right-text-left-art` · `art-watermark` · `stacked`; plus `cta-centered`/`cta-left`).
- **Rhythm-breaker archetypes** — `stat` (giant number), `quote` (pull-sentence),
  `list` (01/02/03), `compare` (this-vs-that).
- **Accent themes** — `violet · magenta · blue · amber · emerald` (one per carousel).
- **Background treatments** — `starfield · grid · aurora · solid-grain`.

The **art-director** (`art-director.mjs`) assigns one theme + background per
carousel and rotates layouts so **no two adjacent slides share a composition** —
deterministically, so renders are reproducible.

## Files
- `carousels/*.json` — one carousel per file (`{ slug, title, theme?, bg?, slides[] }`).
  **This is the shape the LLM will emit** in the real pipeline; `{t, em}` runs
  mark italic emphasis. Five examples, each a different theme/background, authored
  to the `instagram-carousel-design` skill (story arcs, specific copy, rhythm-breakers).
- `themes.mjs` — accent themes (CSS-var bags) + background-treatment catalog/CSS.
- `illustrations.mjs` — wireframe line-art, drawn with the theme accent (recolors per carousel).
- `layouts.mjs` — `renderLayout(slide)` + `LAYOUTS_FOR` (the per-archetype layout catalog) + `LAYOUT_CSS`.
- `art-director.mjs` — `artDirect(carousel)` — assigns theme/bg, enforces no-adjacent-repeat.
- `template.mjs` — `renderSlideHTML(slide, {width,height})` assembles base + theme + bg +
  grain + label + layout. Becomes the `/internal/slide/[piece]/[index]` route in the monorepo.
- `util.mjs` — esc / runs / seeded PRNG / hashing.
- `SPEC.md` — the **LLM↔renderer contract**: the exact carousel/slide JSON shape Claude must emit. The keystone for the engine's brief→slides step.
- `validate.mjs` — enforces `SPEC.md` (exports `validateCarousel`); the guard against malformed LLM output. Run before rendering.
- `render.mjs` — runs each carousel through `artDirect`, then screenshots each slide to PNG.
- `verify-metadata.mjs` — the clean-output gate.
- `out/<slug>/NN-label.png` — generated PNGs.

## Where the AI illustration goes
The purple wireframe art (magnifier, phone, hex, bubble, card) is inline SVG here
so the prototype is self-contained. In production, `illustration` accepts
`{ img: "<blob-url>" }` and the OpenAI `gpt-image-1` raster drops into the same
slot — and because the final frame is *re-rendered* by Chromium, any provenance
on that source image is destroyed in compositing. The metadata stays clean for
free; `verify-metadata.mjs` remains the gate.

## Known prototype gaps (intentional — handled in the repo phase)
- Fonts load from Google Fonts CDN at render time. Production should self-host /
  bundle them for determinism and offline rendering.
- Illustrations are placeholder vectors, not the real per-slide AI art.
- Two-ratio layout is functional, not yet pixel-tuned for 9:16 safe areas.
