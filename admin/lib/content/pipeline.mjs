// Orchestrator: routes each generation step through the active provider —
// 'free' (Gemini, gemini.mjs), 'paid' (Claude, providers.mjs), or offline
// deterministic templates. Any live failure falls back to the template so a
// bad key or rate limit never breaks the pipeline.
import { activeProvider } from '../settings.mjs';
import { SEED_IDEAS } from './context.mjs';
import { makeBrief } from './brief.mjs';
import { makeBlog } from './blog.mjs';
import { TEMPLATES, VALIDATORS } from './mediums.mjs';
import * as claude from './providers.mjs';
import * as gemini from './gemini.mjs';
import * as local from './ollama.mjs';

function liveModule() {
  const p = activeProvider();
  if (p.kind === 'paid') return claude;
  if (p.kind === 'free') return gemini;
  if (p.kind === 'local') return local;
  return null;
}

// Ordered attempts for one step: the chosen provider first, then the local
// model as a free unrated backup when a cloud tier errors or rate-limits.
// Callers still fall through to a deterministic template if every tier fails.
async function attempt(step, fn, fallbackLabel) {
  const p = activeProvider();
  const chain = [];
  const primary = liveModule();
  if (primary) chain.push(['live', primary]);
  if (p.kind !== 'local' && p.useLocalBackup !== false && await local.isAvailable()) {
    chain.push(['local backup', local]);
  }
  for (const [label, mod] of chain) {
    try { return await fn(mod); }
    catch (e) { console.warn(`[${step}] ${label} failed${chain.at(-1)[1] === mod ? `, using ${fallbackLabel}` : ', trying local backup'}:`, e.message); }
  }
  return undefined; // caller substitutes its template
}

export async function ideate(opts = {}) {
  const out = await attempt('ideate', (m) => m.ideate(opts), 'seeds');
  return out ?? SEED_IDEAS;
}

export async function brief(idea) {
  // authored carousels always use the fast deterministic path
  if (idea.carouselFile) return makeBrief(idea);
  const out = await attempt('brief', (m) => m.brief(idea), 'template');
  return out ?? makeBrief(idea);
}

export async function blog(idea, spec) {
  const out = await attempt('blog', (m) => m.blog(idea, spec), 'template');
  return out ?? makeBlog(idea, spec);
}

// Vision QA: score rendered slide PNGs against a design rubric. Returns null
// offline or on any live failure — callers treat null as "no QA available"
// and keep the render as-is (QA must never break a build).
export async function critique(pngs, slidesMeta) {
  const live = liveModule();
  if (!live) return null;
  try { return await live.critique(pngs, slidesMeta); } catch (e) {
    console.warn('[critique] live failed, skipping QA:', e.message);
    return null;
  }
}

// Bespoke wireframe SVG illustrations, generated per slide topic and run
// through the strict sanitizer. Returns a Map(index -> sanitized svg); empty
// offline or on failure, so callers fall back to the stock kit.
export async function illustrate(spec, slots) {
  const out = new Map();
  if (!slots.length) return out;
  const illos = await attempt('illustrate', (m) => m.illustrate(spec, slots), 'stock kit');
  if (!illos) return out;
  const { sanitizeSVG } = await import('../slides/sanitize-svg.mjs');
  for (const illo of illos) {
    const clean = sanitizeSVG(illo.svg);
    if (clean) out.set(Number(illo.index), clean);
  }
  return out;
}

// Targeted revision of one slide. Returns the revised slide object, or null
// offline / on failure (caller keeps the original slide).
export async function editSlide(slide, instruction) {
  const out = await attempt('editSlide', (m) => m.editSlide(slide, instruction), 'the original slide');
  return out ?? null;
}

// Fan-out: generate the requested extra mediums (caption/xthread/linkedin/video)
// in parallel. Live output is validated; invalid or failed calls fall back to
// the template, and only a template failure marks the medium as an error —
// one bad medium never fails the build.
export async function mediums(idea, spec, kinds) {
  const out = {};
  // Cloud free tiers meter by requests-per-minute, and firing every medium at
  // once is what used to trip them mid-build; run those in series. A local
  // model has no such limit, so it keeps the parallel fan-out.
  const serial = activeProvider().kind !== 'local';
  const run = async (kind) => {
    const validate = VALIDATORS[kind];
    const data = await attempt(kind, async (m) => {
      const d = await m.medium(kind, idea, spec);
      const errors = validate(d);
      if (errors.length) throw new Error(errors.join('; '));
      return d;
    }, 'template');
    if (data) { out[kind] = { status: 'ready', ...data }; return; }
    try {
      out[kind] = { status: 'ready', ...TEMPLATES[kind](idea, spec) };
    } catch (e) {
      out[kind] = { status: 'error', error: e.message };
    }
  };
  if (serial) { for (const kind of kinds) await run(kind); }
  else await Promise.all(kinds.map(run));
  return out;
}
