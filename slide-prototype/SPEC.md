# Carousel spec contract

This is the **contract between the LLM and the renderer**. In the production engine,
Claude turns a brief into a carousel JSON in exactly this shape; the art-director
fills the gaps and the renderer screenshots it to clean PNGs. `validate.mjs`
enforces this contract (run it on any LLM output before rendering).

Design rule: the LLM is responsible for **story + copy** (and *may* suggest a
layout/illustration). The art-director owns **theme, background, and the
no-two-adjacent-layouts guarantee**. Keep those concerns separate.

---

## Carousel

```jsonc
{
  "slug":  "speed-to-lead",        // optional; derived from filename if absent
  "title": "…",                    // optional, human label
  "theme": "blue",                 // optional — one of: violet magenta blue amber emerald
  "bg":    "aurora",               // optional — one of: starfield grid aurora solid-grain
  "slides": [ /* 4–7 slides; cover first, cta last */ ]
}
```

If `theme`/`bg` are omitted the art-director assigns them deterministically from the
slug. Set them when a topic wants a specific mood (e.g. amber for a "systems" post).

## Text runs (`em` = emphasis)

Every headline/body field is an **array of runs**: `[{ "t": "plain " }, { "t": "load-bearing phrase", "em": true }]`.
`em:true` marks the one phrase that should pop (rendered as themed italic/gradient).
Use it **sparingly** — one emphasis per headline, one per block. Voice = Elenos:
short fragments, em-dashes, real numbers, no exclamation points, no hype words.

## Illustration slot

`illustration` is one of:
- a **kind** string — `magnifier · phone · bubble · card · clock · bolt · nodes · hex`
- `{ "img": "<path-or-url>" }` — a raster (e.g. a composited OpenAI illustration)
- `{ "ai": "<prompt>" }` — *engine only*: generate via OpenAI, then composite (see Illustrations note)
- omitted / `null` — no illustration (valid for any text-forward layout)

`illustrationOverlay` (string) optionally labels the `phone` art (e.g. `"Missed call"`).

---

## Slide archetypes (the `type` field)

Common to all: `type` (required), `index` (1-based int, required), `label` (the
`NN / LABEL` index text, required), `total` (optional), `layout`/`bg` (optional overrides).

| `type` | Required copy fields | Notes |
|---|---|---|
| `cover` | `headline` (runs) | The hook. `illustration` recommended. First slide. |
| `body` | `headline` (runs), `blocks` (`[{ body: runs }]`, 1–3) | The explainer workhorse. `illustration` optional; `illustrationOverlay` optional. |
| `cta` | `headline` (runs) | `sub` (str), `ctaBody` (runs), `footer` (str), `arrow` (bool) optional. Last slide. |
| `stat` | `stat` (str, e.g. `"100×"`), `caption` (runs) | Rhythm-breaker: one giant number. No illustration. |
| `quote` | `quote` (runs) | Rhythm-breaker: one oversized pull-line. `cite` (str) optional. |
| `list` | `items` (`[{ text: runs }]` or `[string]`, 3–6) | Rhythm-breaker: numbered `01/02/03`. `headline` optional. |
| `compare` | `left` & `right` (`{ tag?: str, body: runs }`) | Rhythm-breaker: this-vs-that. `headline` optional. |

## Layout tokens (optional `layout`; art-director enforces)

The LLM may suggest one; the art-director overrides if it would repeat the previous
slide's layout. Valid per archetype:

- `cover`  → `headline-art` · `art-headline` · `centered` · `fullbleed` · `bottom-heavy`
- `body`   → `left-text-right-art` · `right-text-left-art` · `art-watermark` · `stacked`
- `cta`    → `cta-centered` · `cta-left`
- `stat` `stat-center` · `quote` `quote-center` · `list` `list-rows` · `compare` `compare-cols`

---

## What a good carousel looks like

- **5–7 slides**, one idea each, in swipe order: hook → stakes/value → 1–2 rhythm-breakers → CTA.
- **Cover first, CTA last.** Put a `stat`/`quote`/`list`/`compare` in the middle to reset the eye.
- **One emphasis per field.** Specific nouns and numbers, Elenos voice.
- Don't set `theme`/`bg` per slide unless you mean it — coherence is the point.

See `carousels/*.json` for five worked examples (one per theme/background).

---

## Illustrations: vector default, AI optional (recommendation)

The built-in **vector** wireframes are the default: they recolor to the carousel
theme, are deterministic, free, instant, and carry **zero** AI metadata. For most
slides they're the better choice and keep the brand tight.

`{ "ai": "<prompt>" }` is reserved for slides that genuinely want a richer, scene-like
visual the vectors can't do. In the engine, the AI path generates the raster, then the
slide is **re-rendered by Chromium** (compositing destroys any C2PA/provenance) and the
clean-output gate still runs. So AI art stays post-ready — it's just slower and costs
per image. Treat it as an upgrade for hero slides, not the default.
