// LIVE provider path — real Claude calls, used only when ANTHROPIC_API_KEY is
// set. Untested here (no key); structured so it works the moment a key is added.
// The offline path in pipeline.mjs is the tested default.
import { validateCarousel } from '../slides/api.mjs';
import { loadBrandContext } from './context.mjs';

const TEXT_MODEL = 'claude-opus-4-8'; // best long-form on-brand writing (blog, brief)
const FAST_MODEL = 'claude-sonnet-4-6'; // cheaper fan-out (ideation)

async function callClaude({ system, user, model = TEXT_MODEL, maxTokens = 4000 }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.content || []).map((c) => c.text || '').join('');
}

const extractJson = (s) => {
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b < 0) throw new Error('no JSON in model response');
  return JSON.parse(s.slice(a, b + 1));
};

function voice() {
  const c = loadBrandContext();
  const v = c.voice || c.brand?.voice || {};
  return JSON.stringify(v).slice(0, 4000); // keep the system prompt bounded
}

const SPEC_SUMMARY = `Carousel JSON: { slug, title, theme?(violet|magenta|blue|amber|emerald), bg?(starfield|grid|aurora|solid-grain), slides:[...] }.
Each slide: { type, index, label, ... }. Text fields are run arrays: [{t:"plain "},{t:"emphasis",em:true}].
type=cover{headline,illustration?}; body{headline,blocks:[{body}],illustration?}; cta{headline,sub?,ctaBody?,footer?,arrow?};
stat{stat,caption}; quote{quote,cite?}; list{headline?,items:[{text}]}; compare{headline?,left:{tag?,body},right:{tag?,body}}.
illustration is one of: magnifier phone bubble card clock bolt nodes hex. 5-7 slides, cover first, cta last, 1-2 rhythm-breakers.`;

export async function ideate({ count = 6 } = {}) {
  const out = await callClaude({
    model: FAST_MODEL,
    system: `You generate Instagram/blog content ideas for Elenos, a software studio for service businesses. Brand voice: ${voice()}`,
    user: `Propose ${count} content ideas grounded in current pain points of US service-business owners (contractors, HVAC, plumbers). Return JSON: {"ideas":[{"id","title","angle","hook","source":"web"|"brand"}]}. Hooks in Elenos voice — short, specific, no hype.`,
    maxTokens: 2000,
  });
  return extractJson(out).ideas;
}

export async function brief(idea) {
  const out = await callClaude({
    system: `You design Elenos carousels. Output ONLY valid carousel JSON per this contract.\n${SPEC_SUMMARY}\nVoice: ${voice()}`,
    user: `Idea: ${JSON.stringify(idea)}\nWrite a 5-7 slide carousel. One emphasis (em:true) per headline/block. Real specifics. Return JSON only.`,
  });
  const spec = extractJson(out);
  spec.slug = spec.slug || idea.id.replace(/^idea-/, '');
  const errors = [];
  validateCarousel(spec.slug, spec, errors, []);
  if (errors.length) throw new Error(`live brief invalid:\n${errors.join('\n')}`);
  return spec;
}

export async function blog(idea, spec) {
  const out = await callClaude({
    system: `You write Elenos blog posts — the long-form lead magnet. Voice: ${voice()}`,
    user: `Idea: ${JSON.stringify(idea)}\nThe carousel distills this post: ${JSON.stringify(spec.slides.map((s) => s.label))}.\nWrite a 500-800 word markdown post (# title, *dek*, ## sections, one pull-quote, a closing CTA to elenos.ai). Elenos voice. Markdown only.`,
    maxTokens: 3000,
  });
  const title = (out.match(/^#\s+(.+)$/m) || [, idea.title])[1];
  const slug = idea.id.replace(/^idea-/, '');
  return { title, slug, dek: idea.angle, markdown: out, meta: { description: idea.angle, source: idea.source } };
}
