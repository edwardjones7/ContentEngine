// Blog generator: idea + carousel spec -> markdown post. The blog is the
// long-form lead magnet; the slides are its distilled, swipeable form — so we
// build both from one brief and they stay consistent. Offline/templated; the
// live path swaps in Claude with the same inputs.
import { slugify } from '../../slide-prototype/util.mjs';

const text = (runs) => (runs || []).map((r) => r.t).join('').trim();

function breakerMd(s) {
  if (s.type === 'quote') return `> ${text(s.quote)}${s.cite ? `\n>\n> — ${s.cite}` : ''}`;
  if (s.type === 'stat') return `> **${s.stat}** ${text(s.caption)}`;
  if (s.type === 'list') return (s.items || []).map((it, i) => `${i + 1}. ${text(it.text || it)}`).join('\n');
  if (s.type === 'compare')
    return `**${s.left?.tag || 'Before'}:** ${text(s.left?.body)}\n\n**${s.right?.tag || 'After'}:** ${text(s.right?.body)}`;
  return '';
}

export function makeBlog(idea, spec) {
  const title = idea.title;
  const slug = (idea.id || '').replace(/^idea-/, '') || slugify(title);
  const dek = idea.angle;

  const cover = spec.slides.find((s) => s.type === 'cover');
  const bodies = spec.slides.filter((s) => s.type === 'body');
  const breaker = spec.slides.find((s) => ['stat', 'quote', 'list', 'compare'].includes(s.type));
  const cta = spec.slides.find((s) => s.type === 'cta');

  const md = [];
  md.push(`# ${title}`);
  md.push(`*${dek}*`);
  md.push(`${text(cover?.headline) || idea.hook} It shows up the same way across almost every shop we look at — quietly, in places nobody's watching.`);

  bodies.forEach((b, i) => {
    md.push(`## ${text(b.headline)}`);
    (b.blocks || []).forEach((bl) => md.push(text(bl.body)));
    if (i === 0 && breaker) md.push(breakerMd(breaker));
  });

  // if there were no body slides to host it, still surface the breaker
  if (breaker && bodies.length === 0) md.push(breakerMd(breaker));

  md.push('---');
  const ctaLine = cta
    ? `**${text(cta.headline)}** ${text(cta.ctaBody)}`
    : `**Want us to look at yours?** We'll show you where the leaks are — and what to fix first.`;
  md.push(`${ctaLine} [${cta?.sub || 'Book a free teardown · elenos.ai'}](https://elenos.ai)`);

  return {
    title,
    slug,
    dek,
    markdown: md.join('\n\n'),
    meta: { description: dek, source: idea.source, words: md.join(' ').split(/\s+/).length },
  };
}
