// Validate carousel JSON against the SPEC contract — the guard that stops
// malformed LLM output from reaching the renderer. Dependency-free.
//   node validate.mjs            -> validate every carousels/*.json
//   node validate.mjs <file>     -> validate one file
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { THEME_NAMES, BACKGROUNDS } from './themes.mjs';
import { ILLUSTRATIONS } from './illustrations.mjs';
import { LAYOUTS_FOR } from './layouts.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const TYPES = Object.keys(LAYOUTS_FOR); // cover body cta stat quote list compare

// Required copy fields per archetype (beyond the common type/index/label).
const REQUIRED = {
  cover: ['headline:runs'],
  body: ['headline:runs', 'blocks:blocks'],
  cta: ['headline:runs'],
  stat: ['stat:string', 'caption:runs'],
  quote: ['quote:runs'],
  list: ['items:items'],
  compare: ['left:col', 'right:col'],
};

const isStr = (v) => typeof v === 'string' && v.length > 0;
const isRuns = (v) => Array.isArray(v) && v.length > 0 && v.every((r) => r && isStr(r.t) && (r.em === undefined || typeof r.em === 'boolean'));
const isBlocks = (v) => Array.isArray(v) && v.length > 0 && v.every((b) => b && isRuns(b.body));
const isItems = (v) => Array.isArray(v) && v.length > 0 && v.every((it) => isStr(it) || isRuns(it.text));
const isCol = (v) => v && isRuns(v.body) && (v.tag === undefined || isStr(v.tag));

const CHECK = { runs: isRuns, string: isStr, blocks: isBlocks, items: isItems, col: isCol };

function validIllustration(v) {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return ILLUSTRATIONS.includes(v);
  if (typeof v === 'object') return isStr(v.img) || isStr(v.ai);
  return false;
}

export function validateCarousel(name, data, errors, warnings) {
  const tag = (i, msg) => errors.push(`${name} · slide ${i}: ${msg}`);
  if (data.theme !== undefined && !THEME_NAMES.includes(data.theme)) errors.push(`${name}: bad theme "${data.theme}"`);
  if (data.bg !== undefined && !BACKGROUNDS.includes(data.bg)) errors.push(`${name}: bad bg "${data.bg}"`);
  if (!Array.isArray(data.slides) || !data.slides.length) return errors.push(`${name}: no slides`);

  data.slides.forEach((s, i) => {
    const n = s.index ?? i + 1;
    if (!TYPES.includes(s.type)) return tag(n, `unknown type "${s.type}"`);
    if (!Number.isInteger(s.index) || s.index < 1) tag(n, 'index must be a positive integer');
    if (!isStr(s.label)) tag(n, 'missing label');
    if (s.layout !== undefined && !LAYOUTS_FOR[s.type].includes(s.layout)) tag(n, `layout "${s.layout}" not valid for ${s.type}`);
    if (!validIllustration(s.illustration)) tag(n, 'invalid illustration');
    if (s.bg !== undefined && !BACKGROUNDS.includes(s.bg)) tag(n, `bad bg "${s.bg}"`);
    for (const spec of REQUIRED[s.type]) {
      const [field, kind] = spec.split(':');
      if (!CHECK[kind](s[field])) tag(n, `${s.type} needs valid "${field}" (${kind})`);
    }
  });

  // soft conventions
  if (data.slides[0]?.type !== 'cover') warnings.push(`${name}: first slide isn't a cover`);
  if (data.slides.at(-1)?.type !== 'cta') warnings.push(`${name}: last slide isn't a cta`);
  const breakers = data.slides.filter((s) => ['stat', 'quote', 'list', 'compare'].includes(s.type)).length;
  if (data.slides.length >= 5 && breakers === 0) warnings.push(`${name}: no rhythm-breaker slide (stat/quote/list/compare) — may read monotonous`);
}

// CLI: only run when invoked directly (so the engine can import validateCarousel cleanly).
const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const only = process.argv[2];
  const files = readdirSync(resolve(here, 'carousels'))
    .filter((f) => f.endsWith('.json'))
    .filter((f) => !only || f.includes(only))
    .sort();

  const errors = [];
  const warnings = [];
  for (const f of files) {
    const data = JSON.parse(readFileSync(resolve(here, 'carousels', f), 'utf8'));
    validateCarousel(data.slug || basename(f, '.json'), data, errors, warnings);
  }

  warnings.forEach((w) => console.log(`  ⚠︎ ${w}`));
  if (errors.length) {
    errors.forEach((e) => console.log(`  ✗ ${e}`));
    console.log(`\n${files.length} carousel(s) — ${errors.length} error(s). ❌`);
    process.exit(1);
  }
  console.log(`\n${files.length} carousel(s) validated — all conform to SPEC.md. ✅${warnings.length ? `  (${warnings.length} warning[s])` : ''}`);
}
