// Brand context + seed ideas. In the live pipeline, ideas come from Claude +
// Serper research grounded in elenos-context.json; offline, we seed a curated
// set so the whole flow is demonstrable without a key.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const CONTEXT_PATH = resolve(here, '..', '..', '.claude', 'context', 'elenos-context.json');

export const BRAND_FOOTER = 'Elenos / Software Studio · New Jersey · USA';

let _ctx;
export function loadBrandContext() {
  if (_ctx) return _ctx;
  try {
    _ctx = JSON.parse(readFileSync(CONTEXT_PATH, 'utf8'));
  } catch {
    _ctx = {};
  }
  return _ctx;
}

// Seed ideas. `carouselFile` (optional) points at an authored spec in
// ../slide-prototype/carousels for instant high-quality output; otherwise the
// templated brief generator builds the spec from the fields here.
export const SEED_IDEAS = [
  {
    id: 'idea-contractor-site',
    title: 'Three things on every contractor site that cost jobs',
    angle: 'A diagnostic teardown of the website mistakes that quietly cost contractors booked work.',
    hook: 'Most contractor sites leak booked work in three predictable places.',
    source: 'brand',
    carouselFile: '01-contractor-field-notes.json',
  },
  {
    id: 'idea-speed-to-lead',
    title: 'The job goes to whoever calls back first',
    angle: 'Speed-to-lead beats price — and an AI operator wins it while you are on the job.',
    hook: 'The job didn’t go to the best contractor. It went to the one who called back first.',
    source: 'brand',
    carouselFile: '02-speed-to-lead.json',
  },
  {
    id: 'idea-systems-tax',
    title: 'Five tabs that don’t talk are a tax',
    angle: 'Disconnected tools leak capital one manual handoff at a time.',
    hook: 'Five tabs open. None of them talk. That’s not a stack — it’s a tax.',
    source: 'brand',
    carouselFile: '03-systems-tax.json',
  },
  {
    id: 'idea-five-second-test',
    title: 'The five-second test for a contractor homepage',
    angle: 'A visitor decides in five seconds; most contractor homepages waste all five.',
    hook: 'A visitor decides in five seconds. Most contractor sites waste all five.',
    source: 'web',
    carouselFile: '04-five-second-test.json',
  },
  {
    id: 'idea-operators',
    title: 'Operators, not chatbots',
    angle: 'A chatbot answers questions; an operator finishes the job.',
    hook: 'A chatbot answers questions. An operator finishes the job.',
    source: 'brand',
    carouselFile: '05-operators-not-chatbots.json',
  },
  {
    // novel idea — no authored carousel; exercises the templated brief generator.
    id: 'idea-followup',
    title: 'The follow-up nobody sends',
    angle: 'Most service businesses lose deals in the silence after the quote.',
    hook: 'You didn’t lose the job. You lost the *follow-up*.',
    source: 'web',
    theme: 'magenta',
    bg: 'aurora',
    illustration: 'bubble',
    leakHeadline: 'The silence after the *quote*.',
    leakIllustration: 'phone',
    blocks: [
      { body: 'A quote goes out. Then nothing. No nudge, no reminder, *no second touch*.' },
      { body: 'The customer didn’t say no. They went quiet — *and you let them*.' },
    ],
    breaker: { type: 'stat', label: 'THE MATH', stat: '80%', caption: 'of sales need five follow-ups. *Most businesses stop after one*.' },
    fix: {
      headline: 'Let an operator do the *chasing*.',
      blocks: [
        { body: 'Five touches, spaced and personal — *sent without you lifting a finger*.' },
        { body: 'It never forgets, never gets busy, *never lets a quote go cold*.' },
      ],
      illustration: 'clock',
    },
    cta: {
      headline: 'Where are your follow-ups leaking?',
      sub: 'Free follow-up audit · elenos.ai',
      body: 'We’ll map the touches you’re missing — and the operator that sends them for you.',
    },
  },
];
