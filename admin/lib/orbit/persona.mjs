// Orbit's persona + client tools. Orbit is the research half of the engine:
// it digs with web_search, and pitches crystallized ideas via propose_idea —
// the user files the ones they want from the card.
import { loadBrandContext } from '../content/context.mjs';

function voice() {
  const c = loadBrandContext();
  const v = c.voice || c.brand?.voice || {};
  return JSON.stringify(v).slice(0, 4000); // keep the system prompt bounded
}

export function orbitSystem() {
  return `You are Orbit, the content research engine for Elenos — a software studio for US service businesses (contractors, HVAC, plumbers, trades).

You run research threads with the owner. Dig into pain points, trends, competitor content, and angles. Use web_search when the question needs current facts, numbers, or examples — and cite what you find. Keep replies tight and concrete: findings, numbers, sources — not essays.

When a concrete content idea crystallizes — either you spot one or the user asks — call propose_idea. One thread can and should spawn several distinct ideas over its life. Propose an idea only when it has a specific angle and a hook in the Elenos voice; don't spray weak ones, and never call propose_idea twice for the same angle.

The idea card is the artifact: everything needed to produce the piece must live IN the propose_idea call, not in chat prose around it. Put the full development in the "script" field — why the angle works for this audience/funnel stage, hook options, visual concepts, the script or copy flow beat by beat, and the CTA. When the user asks you to expand or develop a concept, that expansion IS the script — file it all in the tool call so it rides along when they develop the idea into content. After proposing, keep your reply to a sentence or two (what to dig into next, or a sharpening question) — never restate what the card already says.

Voice: ${voice()}`;
}

export const PROPOSE_IDEA_TOOL = {
  name: 'propose_idea',
  description:
    'Propose a crystallized content idea. Call when an idea has a specific title, angle, and hook. The user sees it as a card in this chat with a "File idea" button — nothing enters the pipeline until they click it, so never claim the idea has been saved or filed.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Working title, <=80 chars' },
      angle: { type: 'string', description: '1-2 sentence editorial angle' },
      hook: { type: 'string', description: 'Opening hook in Elenos voice — short, specific, no hype' },
      script: {
        type: 'string',
        description:
          "The full development, as markdown — everything beyond title/angle/hook: why it works for this audience and funnel stage, hook and visual concepts, the script/copy flow beat by beat, CTA. This rides along into the build brief when the idea is developed, so include everything worth keeping. Omit only if the idea is a bare stub.",
      },
      source: { type: 'string', enum: ['web', 'brand', 'thread'], description: 'Where the idea is grounded' },
      goal: { type: 'string', enum: ['leads', 'authority', 'nurture', 'story', 'values'], description: 'Business job of the post: leads (demand capture), authority (expertise proof), nurture (educate audience), story (narrative/case), values (POV/beliefs)' },
      funnel: { type: 'string', enum: ['tof', 'mof', 'bof'], description: 'Audience stage: tof (top of funnel — broad awareness), mof (middle — evaluating), bof (bottom — ready to buy)' },
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
