// High-level content operations (server-only). Server actions call these.
import { ideate, brief, blog } from './content/pipeline.mjs';
import { SEED_IDEAS } from './content/context.mjs';
import { renderPieceSlides } from './render.mjs';
import { id, getIdeas, setIdeas, getPiece, savePiece, addPublished } from './db.mjs';

export async function ensureIdeas() {
  let ideas = getIdeas();
  if (!ideas.length) { ideas = await ideate(); setIdeas(ideas); }
  return ideas;
}

export async function refreshIdeas() {
  const ideas = await ideate();
  setIdeas(ideas);
  return ideas;
}

export async function generatePiece(ideaId) {
  const idea = getIdeas().find((i) => i.id === ideaId) || SEED_IDEAS.find((i) => i.id === ideaId);
  if (!idea) throw new Error('idea not found');
  const spec = await brief(idea);
  const blogDoc = await blog(idea, spec);
  const piece = { id: id('pc'), ideaId, title: idea.title, slug: blogDoc.slug, status: 'draft', seed: 0, spec, blog: blogDoc, createdAt: new Date().toISOString() };
  piece.render = await renderPieceSlides(piece, { seed: 0 });
  savePiece(piece);
  return piece;
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
  p.status = 'published';
  p.publishedAt = new Date().toISOString();
  // In the monorepo this becomes: insert blog_posts row + revalidatePath('/blog/[slug]').
  addPublished({ title: p.blog.title, slug: p.slug, dek: p.blog.dek, markdown: p.blog.markdown, meta: p.blog.meta });
  savePiece(p);
  return p;
}
