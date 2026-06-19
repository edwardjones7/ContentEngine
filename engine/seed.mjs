// Populate the store so the portal opens to a real, lived-in state:
// a couple of draft pieces in the queue + one published post.
//   node seed.mjs
import { rmSync, existsSync } from 'node:fs';
import { SEED_IDEAS } from './lib/context.mjs';
import { brief, blog } from './lib/pipeline.mjs';
import { renderPieceSlides } from './lib/render.mjs';
import { closeBrowser } from '../slide-prototype/api.mjs';
import { DATA_DIR, id, savePiece, addPublished, setIdeas } from './lib/store.mjs';

if (existsSync(DATA_DIR)) rmSync(DATA_DIR, { recursive: true });
setIdeas(SEED_IDEAS);

// publish the first, leave the rest as drafts in the queue
const PLAN = [
  { id: 'idea-contractor-site', publish: true },
  { id: 'idea-speed-to-lead', publish: false },
  { id: 'idea-followup', publish: false },
];

for (const { id: ideaId, publish } of PLAN) {
  const idea = SEED_IDEAS.find((i) => i.id === ideaId);
  const spec = await brief(idea);
  const blogDoc = await blog(idea, spec);
  const piece = { id: id('pc'), ideaId, title: idea.title, slug: blogDoc.slug, status: 'draft', seed: 0, spec, blog: blogDoc, createdAt: new Date().toISOString() };
  piece.render = await renderPieceSlides(piece, { seed: 0 });
  if (publish) {
    piece.status = 'published';
    piece.publishedAt = new Date().toISOString();
    addPublished({ title: piece.blog.title, slug: piece.slug, dek: piece.blog.dek, markdown: piece.blog.markdown, meta: piece.blog.meta });
  }
  savePiece(piece);
  console.log(`  seeded ${ideaId} -> ${piece.id} [${piece.status}] (${piece.render.slides.length} slides)`);
}

await closeBrowser();
console.log('seed complete');
