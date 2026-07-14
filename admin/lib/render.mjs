// Render a piece's slides to PNGs under public/renders/<pieceId> (server-only).
// Uses the slide-system in ./slides; metadata-clean by construction (the PNGs
// are Chromium screenshots — nothing here changes that).
//
// With a live provider, rendering runs an AI quality pass on top of the
// deterministic pipeline:
//   1. best-of-N: render a few candidate seeds, have a vision model score
//      each carousel, keep the winner (re-rolls are free — no text-LLM calls)
//   2. auto-fix: for the winner's flagged slides, apply bounded fixes —
//      layout problems get a deterministic layout override, copy problems get
//      one targeted LLM rewrite — then re-render once
// Every AI step degrades silently to the plain deterministic render; QA must
// never break a build. Offline behaves exactly as before.
//
// NOTE: this function may mutate `piece.seed` (winning candidate) and
// `piece.spec` (layout overrides / copy fixes). All callers save the piece
// right after rendering, so the improvements persist and stay reproducible.
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderCarousel, validateCarousel } from './slides/api.mjs';
import { LAYOUTS_FOR } from './slides/layouts.mjs';
import { critique, editSlide } from './content/pipeline.mjs';
import { activeProvider } from './settings.mjs';
import { RENDER_DIR } from './db.mjs';

const MAX_COPY_FIXES = 2; // per render — bounds LLM spend on the fix pass
const PASS_SCORE = 8; // slides at/above this need no fixing

const fileName = (s) =>
  `${String(s.index).padStart(2, '0')}-${(s.label || s.type).toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;

const slideMeta = (slides) => slides.map((s) => ({ index: s.index, label: s.label, type: s.type, layout: s.layout }));

export async function renderPieceSlides(piece, { seed = 0, qa: runQa = true } = {}) {
  let rendered = await renderCarousel(piece.spec, { seed });
  let qa = null;

  if (runQa && activeProvider().kind !== 'offline') {
    try {
      const improved = await improveRender(piece, seed, rendered);
      if (improved) ({ rendered, qa } = improved);
    } catch (e) {
      console.warn('[render qa] failed, keeping plain render:', e.message);
    }
  }

  const dir = resolve(RENDER_DIR, piece.id);
  if (existsSync(dir)) rmSync(dir, { recursive: true });
  mkdirSync(dir, { recursive: true });
  const out = rendered.slides.map((s) => {
    const name = fileName(s);
    writeFileSync(resolve(dir, name), s.png);
    return { index: s.index, label: s.label, type: s.type, layout: s.layout, file: name, url: `/renders/${piece.id}/${name}` };
  });
  return { theme: rendered.carousel.theme, bg: rendered.carousel.bg, slides: out, qa };
}

// ---- AI quality pass ------------------------------------------------------

async function improveRender(piece, seed, firstRender) {
  // 1. best-of-N seeds (paid providers get an extra candidate; free tier is
  //    rate-limited to ~10 req/min so keep the vision fan-out small)
  const extra = activeProvider().kind === 'paid' ? 2 : 1;
  const candidates = [{ seed, rendered: firstRender }];
  for (let i = 1; i <= extra; i++) {
    const s = (seed + i * 1000003) % 1000000;
    candidates.push({ seed: s, rendered: await renderCarousel(piece.spec, { seed: s }) });
  }

  const reviews = await Promise.all(
    candidates.map((c) => critique(c.rendered.slides.map((s) => s.png), slideMeta(c.rendered.slides)))
  );
  if (reviews.every((r) => !r)) return null; // vision judge unavailable — keep plain render

  let best = 0;
  for (let i = 1; i < candidates.length; i++) {
    if ((reviews[i]?.overall ?? -1) > (reviews[best]?.overall ?? -1)) best = i;
  }
  const winner = candidates[best];
  const review = reviews[best];
  piece.seed = winner.seed;

  const qa = {
    overall: review?.overall ?? null,
    candidates: candidates.map((c, i) => ({ seed: c.seed, score: reviews[i]?.overall ?? null })),
    issues: [],
    fixes: [],
  };
  if (!review) return { rendered: winner.rendered, qa };

  // 2. bounded auto-fix pass on the winner
  const fixed = await applyFixes(piece, review, qa);
  const rendered = fixed ? await renderCarousel(piece.spec, { seed: winner.seed }) : winner.rendered;
  return { rendered, qa };
}

async function applyFixes(piece, review, qa) {
  let changed = false;
  let copyFixes = 0;

  for (const sr of review.slides) {
    if (sr.score >= PASS_SCORE && !sr.issues.length) continue;
    const idx = piece.spec.slides.findIndex((s) => (s.index ?? 0) === sr.index);
    if (idx < 0) continue;
    const slide = piece.spec.slides[idx];

    for (const issue of sr.issues) {
      qa.issues.push({ index: sr.index, kind: issue.kind, note: issue.note });

      if (issue.fix === 'change-layout') {
        const layout = pickAltLayout(piece.spec.slides, idx);
        if (layout) {
          piece.spec.slides[idx] = { ...piece.spec.slides[idx], layout };
          qa.fixes.push({ index: sr.index, fix: 'change-layout', to: layout });
          changed = true;
        }
      } else if (issue.fix === 'shorten-copy' && copyFixes < MAX_COPY_FIXES) {
        copyFixes++;
        const revised = await editSlide(slide, `A design review of the rendered slide found: "${issue.note}". Revise the copy so it fits comfortably — tighter phrasing, same meaning, same voice. Do not change the layout or illustration fields.`);
        if (revised && specAcceptsSlide(piece.spec, idx, revised)) {
          piece.spec.slides[idx] = revised;
          qa.fixes.push({ index: sr.index, fix: 'shorten-copy' });
          changed = true;
        }
      }
    }
  }
  return changed;
}

// A different valid layout for this archetype that doesn't collide with either
// neighbour (the art-director's no-adjacent-repeats rule must keep holding).
function pickAltLayout(slides, idx) {
  const slide = slides[idx];
  const avoid = new Set([slide.layout, slides[idx - 1]?.layout, slides[idx + 1]?.layout].filter(Boolean));
  const options = (LAYOUTS_FOR[slide.type] || []).filter((l) => !avoid.has(l));
  return options[0] || null;
}

// Validate an LLM-revised slide in place before adopting it — malformed output
// falls back to the original slide, mirroring the brief() contract guard.
function specAcceptsSlide(spec, idx, revised) {
  const trial = { ...spec, slides: spec.slides.map((s, i) => (i === idx ? revised : s)) };
  const errors = [];
  validateCarousel(spec.slug || 'edit', trial, errors, []);
  if (errors.length) console.warn('[render qa] rejected slide fix:', errors.join('; '));
  return !errors.length;
}
