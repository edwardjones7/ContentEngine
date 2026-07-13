// Populate the store so the portal opens lived-in: a published post + drafts,
// plus an Orbit research thread that has already spawned an idea.
//   node lib/seed.mjs
import { rmSync, existsSync } from 'node:fs';
import { DATA_DIR, RENDER_DIR, setIdeas, saveThread, addMessage, addIdea, id } from './db.mjs';
import { SEED_IDEAS } from './content/context.mjs';
import { acceptIdea, buildPiece, publishPiece } from './service.mjs';
import { closeBrowser } from './slides/api.mjs';

if (existsSync(DATA_DIR)) rmSync(DATA_DIR, { recursive: true });
if (existsSync(RENDER_DIR)) rmSync(RENDER_DIR, { recursive: true });
setIdeas(SEED_IDEAS);

const PLAN = [['idea-contractor-site', true], ['idea-speed-to-lead', false], ['idea-followup', false]];
for (const [ideaId, pub] of PLAN) {
  const accepted = acceptIdea(ideaId);
  const p = await buildPiece(accepted.id);
  if (pub) publishPiece(p.id);
  console.log(`  seeded ${ideaId} -> ${p.id} [${pub ? 'published' : 'review'}] (${p.render.slides.length} slides)`);
}

// Demo Orbit thread: a short research exchange that filed one idea to the board.
const now = new Date().toISOString();
const thread = saveThread({ id: id('th'), title: 'Why contractors lose review requests', createdAt: now, updatedAt: now });
addMessage({ id: id('msg'), threadId: thread.id, role: 'user', createdAt: now, content: [
  { type: 'text', text: 'Dig into why contractors have such bad Google review counts even when their work is good.' },
] });
const toolUseId = 'toolu_seed_reviews';
addMessage({ id: id('msg'), threadId: thread.id, role: 'assistant', createdAt: now, content: [
  { type: 'text', text: 'The pattern is consistent: the work earns the review, but nobody asks for it at the right moment. The ask happens days later (if at all), by which point response rates collapse. The fix is timing, not begging — an ask within an hour of job completion converts several times better.\n\nThat gap is a strong content idea — filing it.' },
  { type: 'tool_use', id: toolUseId, name: 'propose_idea', input: {
    title: 'The review you earned but never asked for',
    angle: 'Contractors lose five-star reviews to timing, not quality — the ask comes days late or never.',
    hook: 'The customer was thrilled. Nobody asked. That review is gone.',
    source: 'thread',
  } },
] });
const seedIdea = addIdea({
  id: 'idea-review-timing',
  title: 'The review you earned but never asked for',
  angle: 'Contractors lose five-star reviews to timing, not quality — the ask comes days late or never.',
  hook: 'The customer was thrilled. Nobody asked. That review is gone.',
  source: 'thread',
  threadId: thread.id,
  messageId: null,
  toolUseId,
  citations: [],
});
addMessage({ id: id('msg'), threadId: thread.id, role: 'user', createdAt: now, content: [
  { type: 'tool_result', tool_use_id: toolUseId, content: `Saved as ${seedIdea.id}. It now appears in the Research column and as a card in this thread.` },
] });
console.log(`  seeded thread ${thread.id} -> ${seedIdea.id}`);

await closeBrowser();
console.log('seed complete');
