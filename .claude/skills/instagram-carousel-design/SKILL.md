---
name: instagram-carousel-design
description: >-
  Design Instagram carousel posts (swipe slides) that look art-directed, not AI-generated.
  Use this skill whenever the user wants to make an Instagram carousel, swipe post, slide
  deck for social, "turn this into a post / slides," a content carousel, or any multi-slide
  Instagram graphic — even if they don't say the word "skill" or "carousel." Also use it when
  someone complains their slides "look AI," "look generic," or "look like a template," or asks
  for slides that are bold, spicy, textured, or designed. Output is a set of PNG slides at
  Instagram dimensions. Brand-agnostic: works for any account or topic.
---

# Instagram Carousel Design

Your job is to make carousels people actually stop and swipe through — posts that look like a
designer with taste made them, not a content mill. Two things make that happen: **a story worth
telling** and **art direction with conviction.** This skill is about both, in that order.

Read the whole thing before you start designing. The rules here are a *floor, not a cage* — once
you understand *why* each one exists, you're free to break it when the story is better served. That's
the whole point: be creative, but be creative *on purpose*.

---

## Step 1 — Story before style (do this first, always)

A beautiful slide that says nothing is still slop. Start from the human on the other end of the
screen, not from the layout.

Before you open any HTML, answer these in a sentence each:

1. **Who is scrolling, and what do they secretly want or fear?** Get specific. Not "small business
   owners" but "the contractor who's losing jobs because his quotes take three days to send."
2. **What's the one idea they should walk away with?** One. If you have three, that's three posts.
3. **What's the hook?** The first slide has one job: stop the thumb. Make a promise, name a tension,
   or break an assumption. Vague = scrolled past.
4. **What do you want them to do at the end?** Follow, comment, save, DM, click. The CTA is part of
   the story, not a bolted-on afterthought.

Then write the **arc** — one idea per slide, in swipe order — *as plain text*, before any design:

```
Slide 1  HOOK        — stop the scroll (a promise or a tension)
Slide 2  THE STAKES  — why this matters / the cost of ignoring it
Slide 3–N  VALUE     — the meat: steps, shifts, proof, the "aha"
Slide N   PAYOFF     — the resolution / the transformation
Slide N+1 CTA        — one clear next action
```

Aim for **5–10 slides.** One idea per slide. If a slide has two ideas, split it. If a slide has no
idea, cut it. **Write like a human talking to one person** — specifics, real numbers, real verbs.
Kill hedge words, kill "in today's fast-paced world," kill anything you'd skim past yourself.

Show the user the text arc and let them react *before* you spend effort on visuals. The story is
where posts are won or lost.

---

## Step 2 — Art direction: kill the AI-slop tells

AI slop has a *look*, and people can smell it. Here's what gives it away — and what to do instead.

| The slop tell | Do this instead |
|---|---|
| Centered text floating on a purple→blue gradient | Pick a real palette; anchor type to a grid; use asymmetry |
| Default system font (Arial/Helvetica/Inter everywhere) | Pair a **characterful display** font with a clean body font |
| Everything evenly spaced, everything medium-sized | Brutal hierarchy: one thing is huge, the rest gets out of the way |
| Emoji sprinkled as decoration; stock 3D icons | Earn attention with type, color, and texture, not garnish |
| Flat, clean, weightless — looks like a template | Add grain/noise/print texture so it feels physical (Step 4) |
| Vague copy ("unlock your potential") | Ruthless specificity — names, numbers, concrete nouns |
| Rainbow of accent colors | One loud accent, used sparingly, plus neutrals |

**The instinct underneath all of these:** make decisions. Slop is what happens when nothing is
chosen and everything is "balanced." Designers choose. Pick a dominant element per slide and let it
dominate.

---

## Step 3 — The visual system (set it once, hold it across all slides)

Decide these *before* building, and keep them consistent across every slide so the carousel reads
as one object:

- **Palette.** 2–3 neutrals + **one loud accent.** Bold color is a tool — use it where you want the
  eye to land (a hook word, a number, the CTA), not as wallpaper. High contrast beats pretty-but-mushy
  every time. When a topic earns intensity, go intense; when it earns restraint, go quiet. Match the
  energy to the message.
- **Type.** Two fonts max. A **display face with personality** for headlines (e.g. *Fraunces, Clash
  Display, Bricolage Grotesque, Archivo Black, Instrument Serif, Space Grotesk, Libre Franklin*) and
  a **calm workhorse** for body (e.g. *Inter, Söhne-like grotesks, Newsreader, IBM Plex*). These are
  starting points, not rules — choose fonts that fit the voice of the post. Load via Google Fonts
  `@import` or `@font-face`. Set a real type scale (big jumps, not 16/18/20).
- **Grid & margins.** Use a consistent margin (keep critical text ~80px from edges so Instagram's
  crop and UI don't clip it). A visible or implied grid is what separates "designed" from "floating."
- **Motif.** One recurring visual element across slides — a rule line, a numbered index (01/07), a
  corner mark, a consistent texture — so swiping feels like chapters of one thing.

---

## Step 4 — Texture: make it feel made, not generated

This is the "looks like it came out of Photoshop" part, and you can do all of it in CSS. Flat and
clean reads as template; subtle grit reads as *crafted*. Layer a few of these (don't pile on all of
them — restraint):

- **Film grain / noise overlay** — an SVG `feTurbulence` filter as a full-bleed layer at low opacity:
  ```html
  <svg class="grain"><filter id="n"><feTurbulence type="fractalNoise"
    baseFrequency="0.8" numOctaves="3"/></filter>
    <rect width="100%" height="100%" filter="url(#n)"/></svg>
  ```
  ```css
  .grain{position:absolute;inset:0;opacity:.07;mix-blend-mode:overlay;pointer-events:none}
  ```
- **Blend modes** — `mix-blend-mode: multiply / overlay / screen` to fuse color, type, and texture so
  layers feel integrated, not stacked.
- **Duotone / halftone** — push photos to a 2-color duotone (CSS filters or an SVG `feColorMatrix`),
  or a halftone dot pattern for a print/risograph feel.
- **Paper / print grit** — a faint paper or concrete texture under everything; a soft inner **vignette**
  to add depth and stop the slide from feeling like a flat rectangle.
- **Depth** — gentle layering, slight overlaps, the odd off-grid element, real (not symmetric) shadows.

The goal is *tactility*: it should look like it has a surface.

---

## Step 5 — Produce the PNGs

Output is **PNG slides at Instagram dimensions.** Default to **1080×1350 (4:5 portrait)** — it takes
up the most feed real estate. Use **1080×1080 (square)** if the user asks.

Build one self-contained HTML file where each slide is a fixed-size section, then screenshot each to PNG:

1. Each slide = a `1080×1350` element with `overflow:hidden`, the grain layer, and the shared system.
2. Embed fonts (Google Fonts `@import`) so they render in the screenshot.
3. Render each slide to its own PNG with a headless browser — e.g. Playwright:
   ```js
   // for each .slide element: await element.screenshot({ path: `slide-0X.png` })
   ```
   or `puppeteer`, or `chromium --headless --screenshot --window-size=1080,1350`.
4. Name files in swipe order: `slide-01.png`, `slide-02.png`, … so they upload in sequence.

If a headless browser isn't available, say so and offer the HTML file the user can screenshot
themselves, rather than silently degrading quality.

---

## Step 6 — Variation across a series (don't let posts blur together)

A consistent system is the goal *within* one carousel. Across many carousels — or even down a
single 5–10 slide swipe — sameness is the enemy. If every slide is "headline top-left, art
bottom-right," the brain stops seeing it. The fix is a **kit of parts + a no-repeat rule**, not a
single fixed template.

Split your design into **constants** and **variables**:

- **Constants (never change — this is what makes it recognizably *theirs*):** the base background
  family, grain/texture, the type pairing, the index/motif (e.g. `01 / LABEL`), the footer, the
  illustration *style*, and the voice.
- **Variables (change to create variety):**
  1. **Layout per slide.** Build several compositions for each slide role and rotate them: headline
     + art, *mirrored* (art + headline), centered with art as a faint watermark, full-bleed art with
     the headline overlaid on a scrim, art-on-top/headline-on-bottom, two-column. **Hard rule: no two
     adjacent slides share a layout, and don't reuse one composition five times in a deck.**
  2. **Rhythm-breaker slide types.** Punctuate the explainer slides with a different *kind* of slide:
     a giant single **stat** (one number, huge), a **pull-quote** (one oversized line, no art), a
     numbered **list** (01/02/03), a **this-vs-that comparison** (two columns). One or two per deck —
     they reset the eye.
  3. **Accent per carousel.** Keep a small curated palette and assign **one loud accent per
     carousel** (not per slide). Carousel A is violet, B is amber, C is teal — same system, distinct
     identity. Don't rainbow within a single post.
  4. **Background treatment per carousel.** Rotate among a few on-brand options (e.g. starfield,
     faint grid, soft gradient/aurora, near-solid + grain) so different posts read as different moods.

**Who decides (hybrid works best):** propose the slide's *content + a suggested layout*, then run a
small deterministic pass that enforces the guardrails — no adjacent repeats, one accent + one
background per carousel, cover first / CTA last, breakers spaced sensibly. Creative proposals,
mechanical guarantees. That combination is what keeps a feed from looking like a content mill.

---

## Pre-export checklist

Before you hand over the PNGs, run through this — it's where slop sneaks back in:

- [ ] **Story holds:** hook stops the scroll, one idea per slide, CTA is clear and earned.
- [ ] **Copy is specific:** no hedge words, no "in today's world," real nouns and numbers.
- [ ] **Hierarchy is brutal:** on every slide, one thing is obviously the star.
- [ ] **None of the slop tells** from Step 2 are present.
- [ ] **System is consistent:** same palette, fonts, margins, motif across all slides.
- [ ] **No layout repeats back-to-back:** adjacent slides use different compositions; the deck isn't five identical skeletons. At least one rhythm-breaker (stat/quote/list/compare) earns its place.
- [ ] **Series variety:** across multiple carousels, accent + background + layout mix changes so posts don't blur into one look.
- [ ] **Texture is doing work** but isn't muddy or overdone.
- [ ] **Contrast passes:** every word is legible, including over textures/photos.
- [ ] **Safe margins:** nothing critical within ~80px of any edge.

---

## One worked example (arc only — design fresh each time)

**Topic:** a freelance designer's "stop undercharging" post.

```
Slide 1  HOOK    "You're not too expensive. You're too easy to say yes to."
Slide 2  STAKES  The real cost of a cheap rate isn't money — it's the clients it attracts.
Slide 3  SHIFT   Price is positioning. A higher number changes who shows up.
Slide 4  PROOF   What changed when I doubled mine (specific, concrete).
Slide 5  HOW     The 3 things to fix before you raise it.
Slide 6  PAYOFF  Fewer clients, more respect, same income in half the hours.
Slide 7  CTA     "Save this before your next proposal. Then follow for more."
```

Note how every line is a *human thought*, not a content-template fill-in. That voice, plus
conviction in the art direction, is the entire job. Now go make something with a point of view.
