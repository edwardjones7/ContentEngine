// High-level content operations (server-only). Server actions call these.
import { ideate, brief, blog, mediums as mediumsGen, illustrate, editSlide as editSlideGen } from './content/pipeline.mjs';
import { validateCarousel } from './slides/api.mjs';
import { SEED_IDEAS } from './content/context.mjs';
import { ALL_MEDIUMS, EXTRA_MEDIUMS } from './content/mediums.mjs';
import { renderPieceSlides } from './render.mjs';
import { id, getIdeas, setIdeas, addIdea, getPiece, savePiece, addPublished } from './db.mjs';
import { PIECE_STAGES, TAG_FIELDS, normalizeGoal, normalizeBrand, normalizeFunnel } from './content/stages.mjs';

export { ALL_MEDIUMS };

// An empty Research column stays empty — ideas come from Orbit threads or an
// explicit "Refresh research" click, never auto-seeded on page load.
export async function ensureIdeas() {
  return getIdeas();
}

export async function refreshIdeas() {
  const ideas = await ideate();
  // batch refresh replaces generated ideas but must not wipe thread-spawned
  // ideas, Orbit's own pitches, or manually filed ones
  // batch research is Elenos-grounded, so those ideas default to the elenos.ai brand
  const merged = [...getIdeas().filter((i) => i.threadId || i.suggested || i.manual), ...ideas.map((i) => ({ ...i, brand: normalizeBrand(i.brand) || 'elenos' }))];
  setIdeas(merged);
  return merged;
}

// Manually filed idea from the board — no AI involved. `script` is optional
// draft copy/notes that ride along into the build brief.
export function createIdea({ title, angle, hook, goal, brand, funnel, script }) {
  if (!title || !title.trim()) return null;
  const idea = {
    id: slugifyIdeaId(title.trim()),
    title: title.trim(),
    angle: (angle || '').trim(),
    hook: (hook || '').trim(),
    script: (script || '').trim() || null,
    goal: normalizeGoal(goal),
    brand: normalizeBrand(brand),
    funnel: normalizeFunnel(funnel),
    source: 'manual',
    manual: true,
    createdAt: new Date().toISOString(),
  };
  addIdea(idea);
  return idea;
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
      brand: normalizeBrand(g.brand) || 'elenos',
      suggested: true,
      suggestedAt: new Date().toISOString(),
    }));
  for (const idea of fresh) addIdea(idea);
  return fresh;
}

export function dismissIdea(ideaId) {
  setIdeas(getIdeas().filter((i) => i.id !== ideaId));
}

// Stage 1 → 2: accept an idea into a 'production' piece. Snapshots the idea as
// an editable concept; runs nothing expensive (no brief/blog/render yet).
export function acceptIdea(ideaId) {
  const idea = getIdeas().find((i) => i.id === ideaId) || SEED_IDEAS.find((i) => i.id === ideaId);
  if (!idea) throw new Error('idea not found');
  const piece = {
    id: id('pc'),
    ideaId,
    status: 'production',
    goal: normalizeGoal(idea.goal),
    brand: normalizeBrand(idea.brand),
    funnel: normalizeFunnel(idea.funnel),
    seed: 0,
    concept: { title: idea.title, angle: idea.angle, hook: idea.hook, script: idea.script || null, source: idea.source, carouselFile: idea.carouselFile || null },
    title: idea.title,
    createdAt: new Date().toISOString(),
  };
  savePiece(piece);
  return piece;
}

// Pure board move — never touches spec/render/blog/mediums, so backward drags
// are lossless. An unbuilt piece can only sit in Production.
export function setPieceStage(pid, stage) {
  const p = getPiece(pid);
  if (!p) return { ok: false, error: 'piece not found' };
  if (!PIECE_STAGES.includes(stage)) return { ok: false, error: 'invalid stage' };
  if (stage !== 'production' && !p.builtAt) return { ok: false, error: 'Build the piece first' };
  if (stage === 'posted' && !p.postedAt) p.postedAt = new Date().toISOString();
  if (stage !== 'posted' && p.status === 'posted') p.postedAt = null; // re-posting re-stamps
  p.status = stage;
  savePiece(p);
  return { ok: true };
}

// Set one of the card tag dimensions (goal / brand / funnel) on an idea or piece.
export function setTag(kind, targetId, field, value) {
  const dim = TAG_FIELDS[field];
  if (!dim) return null;
  const v = dim.normalize(value);
  if (kind === 'idea') {
    const idea = getIdeas().find((i) => i.id === targetId);
    if (!idea) return null;
    return addIdea({ ...idea, [field]: v });
  }
  const p = getPiece(targetId);
  if (!p) return null;
  p[field] = v;
  savePiece(p);
  return p;
}

// Target post date for the Ready to Post column. '' clears it.
export function setPostDate(pid, postAt) {
  const p = getPiece(pid);
  if (!p) return null;
  p.postAt = postAt || null;
  savePiece(p);
  return p;
}

// The concept snapshots only the editable fields; templated ideas carry extra
// slide-template fields (blocks/breaker/fix/cta/theme…) that brief() needs, so
// rebuild the full idea by layering the concept over the original.
function pieceIdea(p) {
  const original = getIdeas().find((i) => i.id === p.ideaId) || SEED_IDEAS.find((i) => i.id === p.ideaId) || {};
  return { ...original, ...p.concept, id: p.ideaId };
}

// Refine the concept before building. Only valid while in 'production'.
export function updateConcept(pid, { title, angle, hook, script }) {
  const p = getPiece(pid);
  if (!p || p.status !== 'production') return null;
  if (title != null) p.concept.title = title;
  if (angle != null) p.concept.angle = angle;
  if (hook != null) p.concept.hook = hook;
  if (script != null) p.concept.script = script.trim() || null;
  p.title = p.concept.title; // keep the display mirror in sync
  savePiece(p);
  return p;
}

// The heavy step: brief + selected mediums. 'production' → 'review'.
// The brief always runs (it's the shared skeleton every medium distills);
// slides render and the blog is written only if selected. Extra mediums
// (caption/xthread/linkedin/video) fail independently without failing the
// build. Throws on brief/render failure, leaving the piece in 'production'.
export async function buildPiece(pid, { mediums = ALL_MEDIUMS } = {}) {
  const p = getPiece(pid);
  if (!p) throw new Error('piece not found');
  const idea = pieceIdea(p);
  const spec = await brief(idea);
  p.spec = mediums.includes('carousel') ? await enrichIllustrations(spec) : spec;
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

// Swap the stock wireframe icons for bespoke AI-drawn ones matched to each
// slide's message. Offline (or on any failure) the spec comes back unchanged,
// so the stock kit remains the floor. Slides that already carry a raster
// (`{img}`) are left alone.
const runText = (runs) => (runs || []).map((r) => r.t).join('');
async function enrichIllustrations(spec) {
  const slots = (spec.slides || [])
    .filter((s) => ['cover', 'body'].includes(s.type) && !(typeof s.illustration === 'object' && s.illustration?.img))
    .map((s) => ({ index: s.index, hint: `${s.label} — ${runText(s.headline)}` }));
  const illos = await illustrate(spec, slots);
  if (!illos.size) return spec;
  return {
    ...spec,
    slides: spec.slides.map((s) => (illos.has(s.index) ? { ...s, illustration: { svg: illos.get(s.index) } } : s)),
  };
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

// Conversational edit of one slide from the review page ("make the hook
// punchier", "swap the icon"). The LLM revises the slide's spec; the result is
// contract-validated before adoption, then just that composition re-renders
// (same seed, no best-of-N pass — the user is iterating, not re-rolling).
export async function editPieceSlide(pid, index, instruction) {
  const p = getPiece(pid);
  if (!p || !p.spec || !instruction.trim()) return null;
  const idx = p.spec.slides.findIndex((s) => (s.index ?? 0) === Number(index));
  if (idx < 0) return null;
  const revised = await editSlideGen(p.spec.slides[idx], instruction);
  if (revised) {
    const trial = { ...p.spec, slides: p.spec.slides.map((s, i) => (i === idx ? revised : s)) };
    const errors = [];
    validateCarousel(p.spec.slug || 'edit', trial, errors, []);
    if (errors.length) console.warn('[editPieceSlide] revision failed validation:', errors.join('; '));
    else p.spec = trial;
  }
  const prevQa = p.render?.qa || null;
  p.render = await renderPieceSlides(p, { seed: p.seed || 0, qa: false });
  p.render.qa = prevQa;
  savePiece(p);
  return p;
}

// Full carousel refresh: re-run the brief (new copy from the same concept),
// redraw the illustrations, and re-render with the full QA pass. Contrast with
// regeneratePiece, which keeps the copy and only reshuffles the composition.
export async function rebuildCarousel(pid) {
  const p = getPiece(pid);
  if (!p) return null;
  const idea = pieceIdea(p);
  p.spec = await enrichIllustrations(await brief(idea));
  p.seed = Math.floor(Math.random() * 1e6);
  p.render = await renderPieceSlides(p, { seed: p.seed });
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
  if (p.publishedAt) addPublished({ title: p.blog.title, slug: p.slug, dek: p.blog.dek, markdown: p.blog.markdown, meta: p.blog.meta });
  savePiece(p);
  return p;
}

// Publishing the blog is orthogonal to board stage: it copies the blog into
// db.published (visible at /blog) and stamps publishedAt. Stage stays put.
export function publishPiece(pid) {
  const p = getPiece(pid);
  if (!p) return null;
  if (!p.blog) return null; // publish is the blog step; blog-less pieces have nothing to publish
  p.publishedAt = new Date().toISOString();
  // In the monorepo this becomes: insert blog_posts row + revalidatePath('/blog/[slug]').
  addPublished({ title: p.blog.title, slug: p.slug, dek: p.blog.dek, markdown: p.blog.markdown, meta: p.blog.meta });
  savePiece(p);
  return p;
}
