// Small shared helpers used across the slide system.

export const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const pad2 = (n) => String(n).padStart(2, '0');

export const slugify = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Deterministic PRNG — same seed, same result (keeps renders reproducible).
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Stable small hash of a string -> uint32 (used to pick a theme from a slug).
export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Flatten a field that should be plain text but may arrive from the LLM as a
// {t,em} runs array. Prevents "[object Object]" ever reaching the canvas.
export function text(v) {
  if (Array.isArray(v)) return v.map((r) => (r && r.t) || '').join('');
  return v == null ? '' : String(v);
}

// Render an array of {t, em} runs into HTML. `mode` controls the emphasis style:
//   'grad'   -> themed gradient italic (headlines)
//   'accent' -> themed accent italic (body emphasis)
//   'ink'    -> plain white italic
// Tolerates a plain string (wrapped as a single run) — the inverse drift of text().
export function runs(parts, mode = 'accent') {
  if (typeof parts === 'string') parts = [{ t: parts }];
  const cls = mode === 'grad' ? 'em-grad' : mode === 'ink' ? 'em-ink' : 'em-accent';
  return (parts || []).map((p) => (p.em ? `<span class="${cls}">${esc(p.t)}</span>` : esc(p.t))).join('');
}
