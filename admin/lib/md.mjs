// Tiny markdown -> HTML renderer (enough for our generated posts).
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inline(s) {
  return esc(s)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

export function mdToHtml(md) {
  const blocks = md.split(/\n{2,}/);
  const out = [];
  for (const raw of blocks) {
    const b = raw.trim();
    if (!b) continue;
    if (b === '---') out.push('<hr/>');
    else if (b.startsWith('## ')) out.push(`<h2>${inline(b.slice(3))}</h2>`);
    else if (b.startsWith('# ')) out.push(`<h1>${inline(b.slice(2))}</h1>`);
    else if (b.startsWith('> ')) out.push(`<blockquote>${b.split('\n').map((l) => inline(l.replace(/^>\s?/, ''))).join('<br/>')}</blockquote>`);
    else if (/^\d+\.\s/.test(b)) out.push(`<ol>${b.split('\n').map((l) => `<li>${inline(l.replace(/^\d+\.\s/, ''))}</li>`).join('')}</ol>`);
    else out.push(`<p>${inline(b)}</p>`);
  }
  return out.join('\n');
}
