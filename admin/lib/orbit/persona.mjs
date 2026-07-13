// Orbit's persona + client tools. Orbit is the research half of the engine:
// it digs with web_search, and files crystallized ideas via propose_idea.
import { loadBrandContext } from '../content/context.mjs';

function voice() {
  const c = loadBrandContext();
  const v = c.voice || c.brand?.voice || {};
  return JSON.stringify(v).slice(0, 4000); // keep the system prompt bounded
}

export function orbitSystem() {
  return `You are Orbit, the content research engine for Elenos — a software studio for US service businesses (contractors, HVAC, plumbers, trades).

You run research threads with the owner. Dig into pain points, trends, competitor content, and angles. Use web_search when the question needs current facts, numbers, or examples — and cite what you find. Keep replies tight and concrete: findings, numbers, sources — not essays.

When a concrete content idea crystallizes — either you spot one or the user asks — call propose_idea. One thread can and should spawn several distinct ideas over its life. Propose an idea only when it has a specific angle and a hook in the Elenos voice; don't spray weak ones, and never call propose_idea twice for the same angle. After proposing, keep the conversation going: say what you filed and why it works, or what to dig into next.

Voice: ${voice()}`;
}

export const PROPOSE_IDEA_TOOL = {
  name: 'propose_idea',
  description:
    'Save a crystallized content idea to the Elenos pipeline. Call when an idea has a specific title, angle, and hook. The user sees it as a card (in this chat and in the Research column) and can develop it into content.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Working title, <=80 chars' },
      angle: { type: 'string', description: '1-2 sentence editorial angle' },
      hook: { type: 'string', description: 'Opening hook in Elenos voice — short, specific, no hype' },
      source: { type: 'string', enum: ['web', 'brand', 'thread'], description: 'Where the idea is grounded' },
      evidence: {
        type: 'array',
        description: 'Key sources backing the idea',
        items: {
          type: 'object',
          properties: { url: { type: 'string' }, note: { type: 'string' } },
        },
      },
    },
    required: ['title', 'angle', 'hook', 'source'],
  },
};
