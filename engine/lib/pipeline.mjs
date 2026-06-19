// Orchestrator: picks live (Claude) or offline (deterministic stub) per step.
// Offline is the tested default; set ANTHROPIC_API_KEY to go live.
import { SEED_IDEAS } from './context.mjs';
import { makeBrief } from './brief.mjs';
import { makeBlog } from './blog.mjs';
import * as live from './providers.mjs';

export const MODE = process.env.ANTHROPIC_API_KEY ? 'live' : 'offline';

export async function ideate() {
  if (MODE === 'live') {
    try { return await live.ideate({}); } catch (e) { console.warn('[ideate] live failed, using seeds:', e.message); }
  }
  return SEED_IDEAS;
}

export async function brief(idea) {
  // authored carousels always use the fast deterministic path
  if (MODE === 'live' && !idea.carouselFile) {
    try { return await live.brief(idea); } catch (e) { console.warn('[brief] live failed, using template:', e.message); }
  }
  return makeBrief(idea);
}

export async function blog(idea, spec) {
  if (MODE === 'live') {
    try { return await live.blog(idea, spec); } catch (e) { console.warn('[blog] live failed, using template:', e.message); }
  }
  return makeBlog(idea, spec);
}
