// Shared prompt builders + post-processors for the live generation steps.
// Provider transports (providers.mjs = Claude, gemini.mjs = Gemini) stay thin:
// they send these prompts and hand raw text back to the post-processors, so
// both engines produce identical shapes.
import { validateCarousel } from '../slides/api.mjs';
import { loadBrandContext } from './context.mjs';

export function voice() {
  const c = loadBrandContext();
  const v = c.voice || c.brand?.voice || {};
  return JSON.stringify(v).slice(0, 4000); // keep the system prompt bounded
}

// Pull the first JSON value out of a model response — tolerates prose around
// it and both shapes models actually emit (a bare array vs a wrapped object).
export const extractJson = (s) => {
  const objStart = s.indexOf('{');
  const arrStart = s.indexOf('[');
  const isArray = arrStart >= 0 && (objStart < 0 || arrStart < objStart);
  const start = isArray ? arrStart : objStart;
  const end = s.lastIndexOf(isArray ? ']' : '}');
  if (start < 0 || end < 0) throw new Error('no JSON in model response');
  return JSON.parse(s.slice(start, end + 1));
};

export const SPEC_SUMMARY = `Carousel JSON: { slug, title, theme?(violet|magenta|blue|amber|emerald), bg?(starfield|grid|aurora|solid-grain), slides:[...] }.
Each slide: { type, index, label, ... }. Text fields are run arrays: [{t:"plain "},{t:"emphasis",em:true}].
type=cover{headline,illustration?}; body{headline,blocks:[{body}],illustration?}; cta{headline,sub?,ctaBody?,footer?,arrow?};
stat{stat,caption}; quote{quote,cite?}; list{headline?,items:[{text}]}; compare{headline?,left:{tag?,body},right:{tag?,body}}.
illustration is one of: magnifier phone bubble card clock bolt nodes hex. 5-7 slides, cover first, cta last, 1-2 rhythm-breakers.`;

export function ideatePrompt({ count = 6, avoid = [] } = {}) {
  const avoidLine = avoid.length
    ? `\nDo NOT repeat or closely rephrase these existing ideas: ${JSON.stringify(avoid.slice(0, 20))}.`
    : '';
  return {
    tier: 'fast',
    maxTokens: 2000,
    json: true,
    system: `You are Orbit, the Elenos content engine. You generate Instagram/blog content ideas for Elenos, a software studio for service businesses. Brand voice: ${voice()}`,
    user: `Propose ${count} distinct content ideas grounded in current pain points of US service-business owners (contractors, HVAC, plumbers). Vary the approach across ideas (diagnostic teardown / contrarian take / specific playbook), but "angle" must be a 1-2 sentence editorial angle stating the specific argument the post makes — never a category label.${avoidLine} Return JSON: {"ideas":[{"id","title","angle","hook","source":"web"|"brand"}]}. Hooks in Elenos voice — short, specific, no hype.`,
  };
}
export const postIdeate = (out) => {
  const j = extractJson(out);
  const ideas = Array.isArray(j) ? j : j.ideas;
  if (!Array.isArray(ideas) || !ideas.length) throw new Error('no ideas in model response');
  return ideas;
};

export function briefPrompt(idea) {
  return {
    tier: 'text',
    maxTokens: 4000,
    json: true,
    system: `You design Elenos carousels. Output ONLY valid carousel JSON per this contract.\n${SPEC_SUMMARY}\nVoice: ${voice()}`,
    user: `Idea: ${JSON.stringify(idea)}\nWrite a 5-7 slide carousel. One emphasis (em:true) per headline/block. Real specifics. Return JSON only.`,
  };
}
export function postBrief(out, idea) {
  const spec = extractJson(out);
  spec.slug = spec.slug || idea.id.replace(/^idea-/, '');
  const errors = [];
  validateCarousel(spec.slug, spec, errors, []);
  if (errors.length) throw new Error(`live brief invalid:\n${errors.join('\n')}`);
  return spec;
}

export function blogPrompt(idea, spec) {
  return {
    tier: 'text',
    maxTokens: 3000,
    json: false,
    system: `You write Elenos blog posts — the long-form lead magnet. Voice: ${voice()}`,
    user: `Idea: ${JSON.stringify(idea)}\nThe carousel distills this post: ${JSON.stringify(spec.slides.map((s) => s.label))}.\nWrite a 500-800 word markdown post (# title, *dek*, ## sections, one pull-quote, a closing CTA to elenos.ai). Elenos voice. Markdown only.`,
  };
}
export function postBlog(out, idea) {
  const title = (out.match(/^#\s+(.+)$/m) || [, idea.title])[1];
  const slug = idea.id.replace(/^idea-/, '');
  return { title, slug, dek: idea.angle, markdown: out, meta: { description: idea.angle, source: idea.source } };
}

const MEDIUM_SPECS = {
  caption: {
    what: 'an Instagram/TikTok caption to accompany the carousel',
    shape: '{"text": "caption, <=2200 chars, hook first line, line breaks between thoughts, ends with a soft CTA", "hashtags": ["<=10, no # prefix"]}',
  },
  xthread: {
    what: 'an X/Twitter thread',
    shape: '{"tweets": [{"text": "<=280 chars"}]} — 4-7 tweets: hook tweet first, one point per tweet, closing tweet points to elenos.ai',
  },
  linkedin: {
    what: 'a single long-form LinkedIn post',
    shape: '{"text": "<=3000 chars, hook line, short paragraphs, arrows (→) for scannable points, no hashtag spam"}',
  },
  video: {
    what: 'a 30-45s talking-head TikTok/Reels script',
    shape: '{"hook": "spoken opening line", "beats": [{"beat": "what to say", "onScreenText": "<=42 chars overlay"}], "cta": "closing line"} — 4-8 beats',
  },
};

export function mediumPrompt(kind, idea, spec) {
  const m = MEDIUM_SPECS[kind];
  if (!m) throw new Error(`unknown medium: ${kind}`);
  return {
    tier: 'fast',
    maxTokens: 2000,
    json: true,
    system: `You are Orbit, the Elenos content engine. You adapt one developed content idea into ${m.what}. Voice: ${voice()}. Return ONLY valid JSON: ${m.shape}`,
    user: `Idea: ${JSON.stringify({ title: idea.title, angle: idea.angle, hook: idea.hook })}\nThe carousel it accompanies: ${JSON.stringify(spec.slides.map((s) => s.label))}\nWrite the ${kind}. Real specifics, Elenos voice, no hype. JSON only.`,
  };
}
export const postMedium = (out) => extractJson(out);
