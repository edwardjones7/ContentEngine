// High-level content operations (server-only). Server actions call these.
import { ideate, brief, blog, mediums as mediumsGen } from './content/pipeline.mjs';
import { SEED_IDEAS } from './content/context.mjs';
import { ALL_MEDIUMS, EXTRA_MEDIUMS } from './content/mediums.mjs';
import { renderPieceSlides } from './render.mjs';
import { id, getIdeas, setIdeas, addIdea, getPiece, savePiece, addPublished } from './db.mjs';

export { ALL_MEDIUMS };

// An empty Research column stays empty — ideas come from Orbit threads or an
// explicit "Refresh research" click, never auto-seeded on page load.
export async function ensureIdeas() {
  return getIdeas();
}

export async function refreshIdeas() {
  const ideas = await ideate();
  // batch refresh replaces generated ideas but must not wipe thread-spawned
  // ideas or Orbit's own pitches
  const merged = [...getIdeas().filter((i) => i.threadId || i.suggested), ...ideas];
  setIdeas(merged);
  return merged;
}

function slugifyIdeaId(title) {
  const base = 'idea-' + String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
  let iid = base, n = 2;
  while (getIdeas().some((i) => i.id === iid)) iid = `${base}-${n++}`;
  return iid;
}

// Orbit pitches a few starter ideas unprompted. Live providers are told which
// ideas already exist so pitches stay fresh; offline falls back to unused
// seed ideas. Pitches land in db.ideas tagged `suggested` so they render on
// the Orbit page and survive a board-level research refresh.
export async function suggestIdeas(count = 3) {
  const existing = getIdeas();
  const avoid = existing.map((i) => i.title);
  const generated = await ideate({ count, avoid });
  const fresh = generated
    .filter((g) => !existing.some((i) => i.title === g.title))
    .slice(0, count)
    .map((g) => ({
      ...g,
      id: slugifyIdeaId(g.title),
      source: g.source || 'orbit',
      suggested: true,
      suggestedAt: new Date().toISOString(),
    }));
  for (const idea of fresh) addIdea(idea);
  return fresh;
}

export function dismissIdea(ideaId) {
  setIdeas(getIdeas().filter((i) => i.id !== ideaId));
}

// Stage 1 → 2: accept an idea into a 'building' piece. Snapshots the idea as an
// editable concept; runs nothing expensive (no brief/blog/render yet).
export function acceptIdea(ideaId) {
  const idea = getIdeas().find((i) => i.id === ideaId) || SEED_IDEAS.find((i) => i.id === ideaId);
  if (!idea) throw new Error('idea not found');
  const piece = {
    id: id('pc'),
    ideaId,
    status: 'building',
    seed: 0,
    concept: { title: idea.title, angle: idea.angle, hook: idea.hook, source: idea.source, carouselFile: idea.carouselFile || null },
    title: idea.title,
    createdAt: new Date().toISOString(),
  };
  savePiece(piece);
  return piece;
}

// The concept snapshots only the editable fields; templated ideas carry extra
// slide-template fields (blocks/breaker/fix/cta/theme…) that brief() needs, so
// rebuild the full idea by layering the concept over the original.
function pieceIdea(p) {
  const original = getIdeas().find((i) => i.id === p.ideaId) || SEED_IDEAS.find((i) => i.id === p.ideaId) || {};
  return { ...original, ...p.concept, id: p.ideaId };
}

// Refine the concept before building. Only valid while still 'building'.
export function updateConcept(pid, { title, angle, hook }) {
  const p = getPiece(pid);
  if (!p || p.status !== 'building') return null;
  if (title != null) p.concept.title = title;
  if (angle != null) p.concept.angle = angle;
  if (hook != null) p.concept.hook = hook;
  p.title = p.concept.title; // keep the display mirror in sync
  savePiece(p);
  return p;
}

// The heavy step: brief + selected mediums. 'building' → 'review'.
// The brief always runs (it's the shared skeleton every medium distills);
// slides render and the blog is written only if selected. Extra mediums
// (caption/xthread/linkedin/video) fail independently without failing the
// build. Throws on brief/render failure, leaving the piece in 'building'.
export async function buildPiece(pid, { mediums = ALL_MEDIUMS } = {}) {
  const p = getPiece(pid);
  if (!p) throw new Error('piece not found');
  const idea = pieceIdea(p);
  const spec = await brief(idea);
  p.spec = spec;
  if (mediums.includes('blog')) {
    p.blog = await blog(idea, spec);
    p.slug = p.blog.slug;
  } else {
    p.blog = null;
    p.slug = p.slug || (p.ideaId || '').replace(/^idea-/, '') || p.id;
  }
  p.render = mediums.includes('carousel') ? await renderPieceSlides(p, { seed: p.seed || 0 }) : null;
  p.mediums = await mediumsGen(idea, spec, mediums.filter((m) => EXTRA_MEDIUMS.includes(m)));
  p.mediumsRequested = mediums;
  p.status = 'review';
  p.builtAt = new Date().toISOString();
  savePiece(p);
  return p;
}

// Re-run a single medium's generator (or re-render/rewrite for carousel/blog).
export async function regenerateMedium(pid, medium) {
  const p = getPiece(pid);
  if (!p || !p.spec) return null;
  const idea = pieceIdea(p);
  if (medium === 'carousel') {
    p.seed = Math.floor(Math.random() * 1e6);
    p.render = await renderPieceSlides(p, { seed: p.seed });
  } else if (medium === 'blog') {
    p.blog = await blog(idea, p.spec);
    p.slug = p.blog.slug;
  } else if (EXTRA_MEDIUMS.includes(medium)) {
    const out = await mediumsGen(idea, p.spec, [medium]);
    p.mediums = { ...(p.mediums || {}), ...out };
  }
  savePiece(p);
  return p;
}

// Manual edits to a medium from the review page.
export function saveMedium(pid, medium, data) {
  const p = getPiece(pid);
  if (!p || !EXTRA_MEDIUMS.includes(medium)) return null;
  p.mediums = { ...(p.mediums || {}), [medium]: { status: 'ready', ...data } };
  savePiece(p);
  return p;
}

export async function regeneratePiece(pid) {
  const p = getPiece(pid);
  if (!p) return null;
  p.seed = Math.floor(Math.random() * 1e6);
  p.render = await renderPieceSlides(p, { seed: p.seed });
  savePiece(p);
  return p;
}

export function saveBlog(pid, { title, markdown }) {
  const p = getPiece(pid);
  if (!p) return null;
  if (title) p.blog.title = title;
  if (markdown != null) p.blog.markdown = markdown;
  if (p.status === 'published') addPublished({ title: p.blog.title, slug: p.slug, dek: p.blog.dek, markdown: p.blog.markdown, meta: p.blog.meta });
  savePiece(p);
  return p;
}

export function publishPiece(pid) {
  const p = getPiece(pid);
  if (!p) return null;
  if (!p.blog) return null; // publish is the blog step; blog-less pieces have nothing to publish
  p.status = 'published';
  p.publishedAt = new Date().toISOString();
  // In the monorepo this becomes: insert blog_posts row + revalidatePath('/blog/[slug]').
  addPublished({ title: p.blog.title, slug: p.slug, dek: p.blog.dek, markdown: p.blog.markdown, meta: p.blog.meta });
  savePiece(p);
  return p;
}
