// Tiny markdown -> HTML renderer (enough for our generated posts and Orbit
// chat replies). Line-based so single-newline lists/headings — the shape LLM
// chat output usually has — parse correctly.
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

export function mdToHtml(md) {
  const lines = String(md).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let para = [];   // consecutive plain lines -> one <p>
  let quote = [];  // consecutive > lines -> one <blockquote>
  let list = null; // { type: 'ul'|'ol', items: [] }

  const flushPara = () => { if (para.length) { out.push(`<p>${para.map(inline).join('<br/>')}</p>`); para = []; } };
  const flushQuote = () => { if (quote.length) { out.push(`<blockquote>${quote.map(inline).join('<br/>')}</blockquote>`); quote = []; } };
  const flushList = () => { if (list) { out.push(`<${list.type}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.type}>`); list = null; } };
  const flushAll = () => { flushPara(); flushQuote(); flushList(); };

  for (const raw of lines) {
    const t = raw.trim();
    if (!t) { flushAll(); continue; }

    const h = t.match(/^(#{1,4})\s+(.*)/);
    if (h) { flushAll(); const d = h[1].length; out.push(`<h${d}>${inline(h[2])}</h${d}>`); continue; }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { flushAll(); out.push('<hr/>'); continue; }

    if (t.startsWith('>')) { flushPara(); flushList(); quote.push(t.replace(/^>\s?/, '')); continue; }

    const ul = t.match(/^[*+-]\s+(.*)/);
    if (ul) { flushPara(); flushQuote(); if (list?.type !== 'ul') { flushList(); list = { type: 'ul', items: [] }; } list.items.push(ul[1]); continue; }

    const ol = t.match(/^\d+[.)]\s+(.*)/);
    if (ol) { flushPara(); flushQuote(); if (list?.type !== 'ol') { flushList(); list = { type: 'ol', items: [] }; } list.items.push(ol[1]); continue; }

    flushQuote(); flushList(); para.push(t);
  }
  flushAll();
  return out.join('\n');
}
