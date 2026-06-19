// Brief generator: idea -> carousel spec (the SPEC.md shape).
// Offline/deterministic. If the idea points at an authored carousel we use it;
// otherwise we assemble a spec from the idea's fields. Output always runs through
// validateCarousel before it leaves here.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCarousel } from '../../slide-prototype/api.mjs';
import { BRAND_FOOTER } from './context.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const CAROUSELS = resolve(here, '..', '..', 'slide-prototype', 'carousels');

// "plain *emphasis* plain" -> [{t:'plain '},{t:'emphasis',em:true},{t:' plain'}]
// already-structured runs (arrays) pass through untouched.
export function toRuns(v) {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  const out = [];
  String(v).split(/(\*[^*]+\*)/).forEach((seg) => {
    if (!seg) return;
    if (seg.startsWith('*') && seg.endsWith('*')) out.push({ t: seg.slice(1, -1), em: true });
    else out.push({ t: seg });
  });
  return out;
}

function breakerSlide(b, index) {
  if (!b) return null;
  if (b.type === 'quote') return { type: 'quote', index, label: b.label || 'THE THESIS', quote: toRuns(b.quote), cite: b.cite };
  if (b.type === 'list') return { type: 'list', index, label: b.label || 'THE LIST', headline: toRuns(b.headline), items: (b.items || []).map((it) => ({ text: toRuns(it.text || it) })) };
  if (b.type === 'compare') return { type: 'compare', index, label: b.label || 'THE DIFFERENCE', headline: toRuns(b.headline), left: { tag: b.left?.tag, body: toRuns(b.left?.body) }, right: { tag: b.right?.tag, body: toRuns(b.right?.body) } };
  // default: stat
  return { type: 'stat', index, label: b.label || 'THE MATH', stat: b.stat, caption: toRuns(b.caption) };
}

export function makeBrief(idea) {
  // 1) authored carousel -> instant, high-quality
  if (idea.carouselFile) {
    const spec = JSON.parse(readFileSync(resolve(CAROUSELS, idea.carouselFile), 'utf8'));
    spec.slug = spec.slug || idea.id.replace(/^idea-/, '');
    assertValid(spec);
    return spec;
  }

  // 2) templated from idea fields
  const slides = [
    { type: 'cover', index: 1, label: 'FIELD NOTES', headline: toRuns(idea.hook), illustration: idea.illustration || 'magnifier' },
    { type: 'body', index: 2, label: 'THE LEAK', headline: toRuns(idea.leakHeadline || idea.title), blocks: (idea.blocks || []).map((b) => ({ body: toRuns(b.body) })), illustration: idea.leakIllustration || 'card' },
    breakerSlide(idea.breaker, 3),
    idea.fix && { type: 'body', index: 4, label: 'THE FIX', headline: toRuns(idea.fix.headline), blocks: (idea.fix.blocks || []).map((b) => ({ body: toRuns(b.body) })), illustration: idea.fix.illustration || 'nodes' },
    {
      type: 'cta',
      index: 5,
      label: 'NEXT',
      headline: toRuns(idea.cta?.headline || 'Want me to look at yours?'),
      arrow: true,
      sub: idea.cta?.sub || 'Free 20-minute teardown · elenos.ai',
      ctaBody: toRuns(idea.cta?.body || 'We’ll show you exactly where the leaks are — and what to fix first.'),
      footer: BRAND_FOOTER,
      illustration: 'hex',
    },
  ].filter(Boolean);

  // renumber after any nulls were filtered
  slides.forEach((s, i) => { s.index = i + 1; s.total = slides.length; });

  const spec = { slug: idea.id.replace(/^idea-/, ''), title: idea.title, theme: idea.theme, bg: idea.bg, slides };
  assertValid(spec);
  return spec;
}

function assertValid(spec) {
  const errors = [];
  validateCarousel(spec.slug, spec, errors, []);
  if (errors.length) throw new Error(`Generated brief failed validation:\n  ${errors.join('\n  ')}`);
}
