// Per-medium generators + validators. Offline/templated versions derive
// deterministically from idea + carousel spec (like makeBlog); the live path
// in providers.mjs swaps in Claude with the same inputs and falls back here
// when validation fails. Every generator returns the medium's stored shape
// WITHOUT `status` — the pipeline layer stamps {status:'ready'|'error'}.

const text = (runs) => (runs || []).map((r) => r.t).join('').trim();

export const MEDIUM_LABEL = {
  carousel: 'Carousel',
  blog: 'Blog',
  caption: 'Caption',
  xthread: 'X thread',
  linkedin: 'LinkedIn',
  video: 'Video script',
};
export const ALL_MEDIUMS = Object.keys(MEDIUM_LABEL);
// mediums stored under piece.mediums (carousel/blog keep their legacy homes)
export const EXTRA_MEDIUMS = ['caption', 'xthread', 'linkedin', 'video'];

function slidePoints(spec) {
  return (spec?.slides || [])
    .filter((s) => s.type === 'body')
    .flatMap((s) => [text(s.headline), ...(s.blocks || []).map((b) => text(b.body))])
    .filter(Boolean);
}
function breakerLine(spec) {
  const s = (spec?.slides || []).find((x) => ['stat', 'quote'].includes(x.type));
  if (!s) return '';
  return s.type === 'stat' ? `${s.stat} ${text(s.caption)}` : text(s.quote);
}

// --- validators (shared by live + offline paths) -----------------------------

export function validateCaption(c) {
  const errors = [];
  if (!c?.text || typeof c.text !== 'string') errors.push('caption: text required');
  else if (c.text.length > 2200) errors.push('caption: over 2200 chars');
  if (!Array.isArray(c?.hashtags)) errors.push('caption: hashtags[] required');
  else if (c.hashtags.length > 10) errors.push('caption: more than 10 hashtags');
  return errors;
}
export function validateXThread(t) {
  const errors = [];
  if (!Array.isArray(t?.tweets) || t.tweets.length < 2) errors.push('xthread: needs >=2 tweets');
  (t?.tweets || []).forEach((tw, i) => {
    if (!tw?.text) errors.push(`xthread: tweet ${i + 1} empty`);
    else if (tw.text.length > 280) errors.push(`xthread: tweet ${i + 1} over 280 chars (${tw.text.length})`);
  });
  return errors;
}
export function validateLinkedIn(l) {
  const errors = [];
  if (!l?.text || typeof l.text !== 'string') errors.push('linkedin: text required');
  else if (l.text.length > 3000) errors.push('linkedin: over 3000 chars');
  return errors;
}
export function validateVideo(v) {
  const errors = [];
  if (!v?.hook) errors.push('video: hook required');
  if (!Array.isArray(v?.beats) || v.beats.length < 4 || v.beats.length > 8) errors.push('video: needs 4-8 beats');
  (v?.beats || []).forEach((b, i) => { if (!b?.beat) errors.push(`video: beat ${i + 1} empty`); });
  if (!v?.cta) errors.push('video: cta required');
  return errors;
}
export const VALIDATORS = { caption: validateCaption, xthread: validateXThread, linkedin: validateLinkedIn, video: validateVideo };

// --- offline template generators ---------------------------------------------

export function makeCaption(idea, spec) {
  const points = slidePoints(spec).slice(0, 2);
  const lines = [
    idea.hook,
    '',
    ...points,
    breakerLine(spec) ? `\n${breakerLine(spec)}` : '',
    '',
    'Swipe through — then ask where yours is leaking. Link in bio.',
  ].filter((l) => l !== '');
  return {
    text: lines.join('\n').slice(0, 2200),
    hashtags: ['contractorlife', 'servicebusiness', 'hvac', 'plumbing', 'smallbusinessowner', 'leadgeneration', 'elenos'],
  };
}

export function makeXThread(idea, spec) {
  const clamp = (s) => (s.length > 276 ? s.slice(0, 273) + '…' : s);
  const tweets = [{ text: clamp(idea.hook) }];
  for (const p of slidePoints(spec).slice(0, 4)) tweets.push({ text: clamp(p) });
  const br = breakerLine(spec);
  if (br) tweets.push({ text: clamp(br) });
  tweets.push({ text: clamp(`The full breakdown (and what to fix first) is on the blog. elenos.ai`) });
  return { tweets };
}

export function makeLinkedIn(idea, spec) {
  const points = slidePoints(spec).slice(0, 3);
  const br = breakerLine(spec);
  const parts = [
    idea.hook,
    '',
    idea.angle,
    '',
    ...points.map((p) => `→ ${p}`),
    br ? `\n${br}` : '',
    '',
    `We see this across almost every service business we look at. If you run one, it's worth twenty minutes to check.`,
    '',
    `Full breakdown on the Elenos blog.`,
  ].filter((l) => l !== '');
  return { text: parts.join('\n').slice(0, 3000) };
}

export function makeVideoScript(idea, spec) {
  const points = slidePoints(spec).slice(0, 4);
  const beats = points.map((p, i) => ({
    beat: p,
    onScreenText: p.split(/[.—]/)[0].trim().slice(0, 42),
  }));
  while (beats.length < 4) beats.push({ beat: idea.angle, onScreenText: idea.title.slice(0, 42) });
  const br = breakerLine(spec);
  if (br && beats.length < 8) beats.splice(1, 0, { beat: br, onScreenText: br.split(' ').slice(0, 6).join(' ') });
  return {
    hook: idea.hook,
    beats: beats.slice(0, 8),
    cta: 'If this sounds like your shop, the full teardown is on elenos.ai — link in bio.',
  };
}

export const TEMPLATES = { caption: makeCaption, xthread: makeXThread, linkedin: makeLinkedIn, video: makeVideoScript };
