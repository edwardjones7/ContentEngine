// Sanitizer for LLM-generated wireframe SVG illustrations. The generated SVG
// is untrusted model output that gets inlined into the slide HTML, so this is
// a strict whitelist: shape elements only, no scripts/handlers/links/rasters.
// On any doubt it returns null and the caller falls back to the stock kit.

const ALLOWED_TAGS = new Set(['svg', 'g', 'circle', 'ellipse', 'rect', 'line', 'path', 'polyline', 'polygon']);
const ALLOWED_ATTRS = new Set([
  'viewbox', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
  'width', 'height', 'd', 'points', 'transform', 'opacity',
  'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'fill',
]);
const THEME_VALUE = 'var(--accent-bright)';
const ROOT_STYLE = 'width:100%;height:100%;filter:drop-shadow(0 0 10px var(--accent-glow));';

export function sanitizeSVG(raw) {
  if (typeof raw !== 'string') return null;
  const start = raw.indexOf('<svg');
  const end = raw.lastIndexOf('</svg>');
  if (start < 0 || end < 0) return null;
  const svg = raw.slice(start, end + 6);

  if (/<!--|<!\[CDATA\[|<\?/.test(svg)) return null;
  if (/\son[a-z]+\s*=/i.test(svg)) return null;
  if (/javascript:|url\s*\(|href|xlink|data:/i.test(svg)) return null;

  for (const m of svg.matchAll(/<\s*\/?\s*([a-zA-Z][\w:-]*)/g)) {
    if (!ALLOWED_TAGS.has(m[1].toLowerCase())) return null;
  }

  const root = svg.match(/^<svg([^>]*)>/i);
  if (!root) return null;
  const viewBox = (root[1].match(/viewBox\s*=\s*"([\d\s.,-]+)"/i) || [, '0 0 360 380'])[1];
  let body = svg.slice(root[0].length, -'</svg>'.length);

  // Whitelist attributes on every child element; force color values onto the
  // theme variable so the illustration recolors per carousel like the stock kit.
  let ok = true;
  body = body.replace(/<\s*([a-zA-Z][\w-]*)((?:\s+[\w-]+\s*=\s*"[^"]*")*)\s*(\/?)>/g, (_, tag, attrs, close) => {
    const kept = [];
    for (const a of attrs.matchAll(/([\w-]+)\s*=\s*"([^"]*)"/g)) {
      const name = a[1].toLowerCase();
      let value = a[2];
      if (!ALLOWED_ATTRS.has(name)) { continue; }
      if (name === 'stroke' && value !== 'none') value = THEME_VALUE;
      if (name === 'fill' && value !== 'none') value = THEME_VALUE;
      if (/[<>"']/.test(value)) { ok = false; break; }
      kept.push(`${a[1]}="${value}"`);
    }
    return `<${tag}${kept.length ? ' ' + kept.join(' ') : ''}${close ? '/' : ''}>`;
  });
  if (!ok) return null;
  if (!body.trim()) return null;

  return `<svg viewBox="${viewBox}" style="${ROOT_STYLE}" fill="none" stroke="${THEME_VALUE}" stroke-width="2">${body}</svg>`;
}
