// Populate the store so the portal opens lived-in: a published post + drafts.
//   node lib/seed.mjs
import { rmSync, existsSync } from 'node:fs';
import { DATA_DIR, RENDER_DIR, setIdeas } from './db.mjs';
import { SEED_IDEAS } from './content/context.mjs';
import { generatePiece, publishPiece } from './service.mjs';
import { closeBrowser } from './slides/api.mjs';

if (existsSync(DATA_DIR)) rmSync(DATA_DIR, { recursive: true });
if (existsSync(RENDER_DIR)) rmSync(RENDER_DIR, { recursive: true });
setIdeas(SEED_IDEAS);

const PLAN = [['idea-contractor-site', true], ['idea-speed-to-lead', false], ['idea-followup', false]];
for (const [ideaId, pub] of PLAN) {
  const p = await generatePiece(ideaId);
  if (pub) publishPiece(p.id);
  console.log(`  seeded ${ideaId} -> ${p.id} [${pub ? 'published' : 'draft'}] (${p.render.slides.length} slides)`);
}
await closeBrowser();
console.log('seed complete');
