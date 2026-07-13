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

function liveModule() {
  const p = activeProvider();
  if (p.kind === 'paid') return claude;
  if (p.kind === 'free') return gemini;
  return null;
}

export async function ideate(opts = {}) {
  const live = liveModule();
  if (live) {
    try { return await live.ideate(opts); } catch (e) { console.warn('[ideate] live failed, using seeds:', e.message); }
  }
  return SEED_IDEAS;
}

export async function brief(idea) {
  const live = liveModule();
  // authored carousels always use the fast deterministic path
  if (live && !idea.carouselFile) {
    try { return await live.brief(idea); } catch (e) { console.warn('[brief] live failed, using template:', e.message); }
  }
  return makeBrief(idea);
}

export async function blog(idea, spec) {
  const live = liveModule();
  if (live) {
    try { return await live.blog(idea, spec); } catch (e) { console.warn('[blog] live failed, using template:', e.message); }
  }
  return makeBlog(idea, spec);
}

// Fan-out: generate the requested extra mediums (caption/xthread/linkedin/video)
// in parallel. Live output is validated; invalid or failed calls fall back to
// the template, and only a template failure marks the medium as an error —
// one bad medium never fails the build.
export async function mediums(idea, spec, kinds) {
  const out = {};
  const live = liveModule();
  await Promise.all(kinds.map(async (kind) => {
    const validate = VALIDATORS[kind];
    if (live) {
      try {
        const data = await live.medium(kind, idea, spec);
        const errors = validate(data);
        if (errors.length) throw new Error(errors.join('; '));
        out[kind] = { status: 'ready', ...data };
        return;
      } catch (e) { console.warn(`[${kind}] live failed, using template:`, e.message); }
    }
    try {
      out[kind] = { status: 'ready', ...TEMPLATES[kind](idea, spec) };
    } catch (e) {
      out[kind] = { status: 'error', error: e.message };
    }
  }));
  return out;
}
