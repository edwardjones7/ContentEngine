// Elenos Content Engine — standalone offline portal.
//   npm start   (then open http://localhost:4040)
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { layout, esc } from './lib/html.mjs';
import { mdToHtml } from './lib/md.mjs';
import { MODE, ideate, brief, blog } from './lib/pipeline.mjs';
import { renderPieceSlides } from './lib/render.mjs';
import { buildZip } from './lib/zip.mjs';
import { SEED_IDEAS } from './lib/context.mjs';
import {
  id, RENDER_DIR, getPieces, getPiece, savePiece, getIdeas, setIdeas,
  getPublished, getPublishedBySlug, addPublished,
} from './lib/store.mjs';

const PORT = process.env.PORT || 4040;
const text = (runs) => (runs || []).map((r) => r.t).join('');

const send = (res, status, type, body) => { res.writeHead(status, { 'content-type': type }); res.end(body); };
const html = (res, body) => send(res, 200, 'text/html; charset=utf-8', body);
const redirect = (res, to) => { res.writeHead(302, { location: to }); res.end(); };
function readBody(req) {
  return new Promise((r) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => { const o = {}; for (const [k, v] of new URLSearchParams(d)) o[k] = v; r(o); }); });
}

// ---------- views ----------
function ideaCard(i) {
  return `<div class="card">
    <div class="row"><span class="label">${esc(i.source || 'idea')}</span><span class="sp"></span>${i.carouselFile ? '' : '<span class="src">novel · templated</span>'}</div>
    <h3>${esc(i.title)}</h3>
    <div class="meta">${esc(i.angle)}</div>
    <div class="meta" style="color:#cfc7e6">“${esc(i.hook)}”</div>
    <form class="inline" method="post" action="/generate"><input type="hidden" name="ideaId" value="${esc(i.id)}"/>
      <button class="primary" type="submit">Generate piece →</button></form>
  </div>`;
}

function pieceRow(p) {
  return `<div class="card"><div class="row">
    <div><div class="row" style="gap:8px"><a href="/piece/${p.id}"><h3 style="margin:0">${esc(p.title)}</h3></a>
      <span class="badge ${p.status}">${p.status}</span></div>
      <div class="meta">${p.render?.slides?.length || 0} slides · ${esc(p.render?.theme || '')}/${esc(p.render?.bg || '')} · /${esc(p.slug)}</div></div>
    <span class="sp"></span><a class="btn" href="/piece/${p.id}">Review →</a>
  </div></div>`;
}

async function dashboard(res) {
  let ideas = getIdeas();
  if (!ideas.length) { ideas = await ideate(); setIdeas(ideas); }
  const pieces = getPieces().slice(0, 4);
  const body = `
    <h1>Content ideas</h1>
    <p class="lead">Research-grounded angles in the Elenos voice. Pick one — it becomes a blog draft + a swipeable carousel.</p>
    <div class="row"><form class="inline" method="post" action="/research"><button type="submit">↻ Refresh research</button></form>
      <span class="src">${MODE === 'live' ? 'live: Claude + research' : 'offline: seeded ideas (set ANTHROPIC_API_KEY to go live)'}</span></div>
    <div class="grid cols2" style="margin-top:16px">${ideas.map(ideaCard).join('')}</div>
    ${pieces.length ? `<h2 class="sec">Recent pieces</h2><div class="grid">${pieces.map(pieceRow).join('')}</div>` : ''}`;
  html(res, layout({ title: 'Ideas', body, active: 'ideas', mode: MODE }));
}

function queuePage(res) {
  const pieces = getPieces();
  const body = `<h1>Review queue</h1><p class="lead">Every generated piece. Blogs publish only when you accept them.</p>
    ${pieces.length ? `<div class="grid">${pieces.map(pieceRow).join('')}</div>` : '<div class="empty">Nothing yet — generate a piece from Ideas.</div>'}`;
  html(res, layout({ title: 'Queue', body, active: 'queue', mode: MODE }));
}

function piecePage(res, p) {
  if (!p) return notFound(res);
  const slides = (p.render?.slides || [])
    .map((s) => `<figure><a href="/renders/${p.id}/${s.file}" target="_blank"><img src="/renders/${p.id}/${s.file}" loading="lazy"/></a>
      <figcaption>${String(s.index).padStart(2, '0')} · ${esc(s.type)}/${esc(s.layout)}</figcaption></figure>`).join('');
  const body = `
    <div class="row"><a class="src" href="/queue">← queue</a></div>
    <div class="row" style="margin:6px 0 18px"><h1 style="margin:0">${esc(p.title)}</h1>
      <span class="badge ${p.status}">${p.status}</span><span class="sp"></span>
      <span class="src">${esc(p.render?.theme)}/${esc(p.render?.bg)} · seed ${p.seed}</span></div>

    <div class="row" style="margin-bottom:20px">
      <form class="inline" method="post" action="/piece/${p.id}/regenerate"><button type="submit">↻ Reshuffle layouts</button></form>
      <a class="btn" href="/piece/${p.id}/download">⤓ Download slides (.zip)</a>
      ${p.status === 'draft'
        ? `<form class="inline" method="post" action="/piece/${p.id}/publish"><button class="primary" type="submit">✓ Accept &amp; publish blog</button></form>`
        : `<a class="btn" href="/blog/${esc(p.slug)}">View published post →</a>`}
    </div>

    <div class="split">
      <div>
        <h2 class="sec">Blog draft ${p.status === 'draft' ? '(editable — not published)' : '(published)'}</h2>
        <form method="post" action="/piece/${p.id}/save">
          <input class="title" name="title" value="${esc(p.blog.title)}"/>
          <textarea name="markdown">${esc(p.blog.markdown)}</textarea>
          <div class="row" style="margin-top:12px"><button class="primary" type="submit">Save draft</button>
            <span class="src">${p.blog.meta?.words || ''} words · markdown</span></div>
        </form>
      </div>
      <div>
        <h2 class="sec">Carousel — ${p.render?.slides?.length || 0} slides, post-ready PNGs</h2>
        <div class="slides">${slides}</div>
      </div>
    </div>`;
  html(res, layout({ title: p.title, body, active: 'queue', mode: MODE }));
}

function blogList(res) {
  const posts = getPublished();
  const body = `<h1>Published</h1><p class="lead">Live on elenos.ai (simulated). Accepted from the review queue.</p>
    ${posts.length ? `<div class="grid">${posts.map((p) => `<div class="card"><a href="/blog/${esc(p.slug)}"><h3>${esc(p.title)}</h3></a><div class="meta">${esc(p.dek)}</div><div class="src">/blog/${esc(p.slug)}</div></div>`).join('')}</div>`
      : '<div class="empty">No posts published yet.</div>'}`;
  html(res, layout({ title: 'Published', body, active: 'blog', mode: MODE }));
}

function blogPost(res, slug) {
  const post = getPublishedBySlug(slug);
  if (!post) return notFound(res);
  const body = `<div class="row"><a class="src" href="/blog">← all posts</a></div>
    <article class="article">${mdToHtml(post.markdown)}</article>`;
  html(res, layout({ title: post.title, body, active: 'blog', mode: MODE }));
}

const notFound = (res) => html(res, layout({ title: 'Not found', body: '<div class="empty">Not found.</div>', mode: MODE }));

// ---------- actions ----------
async function generate(res, ideaId) {
  const idea = getIdeas().find((i) => i.id === ideaId) || SEED_IDEAS.find((i) => i.id === ideaId);
  if (!idea) return notFound(res);
  const spec = await brief(idea);
  const blogDoc = await blog(idea, spec);
  const piece = { id: id('pc'), ideaId, title: idea.title, slug: blogDoc.slug, status: 'draft', seed: 0, spec, blog: blogDoc, createdAt: new Date().toISOString() };
  piece.render = await renderPieceSlides(piece, { seed: 0 });
  savePiece(piece);
  redirect(res, `/piece/${piece.id}`);
}

async function regenerate(res, p) {
  if (!p) return notFound(res);
  p.seed = Math.floor(Math.random() * 1e6);
  p.render = await renderPieceSlides(p, { seed: p.seed });
  savePiece(p);
  redirect(res, `/piece/${p.id}`);
}

async function saveBlog(res, p, bodyParams) {
  if (!p) return notFound(res);
  p.blog.title = bodyParams.title || p.blog.title;
  p.blog.markdown = bodyParams.markdown ?? p.blog.markdown;
  if (p.status === 'published') addPublished({ ...p.blog }); // keep published copy in sync
  savePiece(p);
  redirect(res, `/piece/${p.id}`);
}

function publish(res, p) {
  if (!p) return notFound(res);
  p.status = 'published';
  p.publishedAt = new Date().toISOString();
  addPublished({ title: p.blog.title, slug: p.slug, dek: p.blog.dek, markdown: p.blog.markdown, meta: p.blog.meta });
  savePiece(p);
  redirect(res, `/piece/${p.id}`);
}

function download(res, p) {
  if (!p || !p.render) return notFound(res);
  const dir = resolve(RENDER_DIR, p.id);
  const files = p.render.slides.map((s) => ({ name: s.file, data: readFileSync(resolve(dir, s.file)) }));
  const zip = buildZip(files);
  res.writeHead(200, { 'content-type': 'application/zip', 'content-disposition': `attachment; filename="${p.slug}-slides.zip"` });
  res.end(zip);
}

function serveRender(res, pid, file) {
  const safe = basename(file);
  const path = resolve(RENDER_DIR, pid, safe);
  if (!path.startsWith(RENDER_DIR) || !existsSync(path)) return notFound(res);
  send(res, 200, 'image/png', readFileSync(path));
}

// ---------- router ----------
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const parts = url.pathname.split('/').filter(Boolean);
    const get = req.method === 'GET';
    const post = req.method === 'POST';

    if (get && url.pathname === '/') return dashboard(res);
    if (get && url.pathname === '/queue') return queuePage(res);
    if (get && url.pathname === '/blog') return blogList(res);
    if (get && parts[0] === 'blog' && parts[1]) return blogPost(res, parts[1]);
    if (get && parts[0] === 'renders' && parts[1] && parts[2]) return serveRender(res, parts[1], parts[2]);

    if (post && url.pathname === '/research') { await ideate().then((i) => setIdeas(i)); return redirect(res, '/'); }
    if (post && url.pathname === '/generate') { const b = await readBody(req); return generate(res, b.ideaId); }

    if (parts[0] === 'piece' && parts[1]) {
      const p = getPiece(parts[1]);
      if (get && !parts[2]) return piecePage(res, p);
      if (get && parts[2] === 'download') return download(res, p);
      if (post && parts[2] === 'regenerate') return regenerate(res, p);
      if (post && parts[2] === 'publish') return publish(res, p);
      if (post && parts[2] === 'save') { const b = await readBody(req); return saveBlog(res, p, b); }
    }
    return notFound(res);
  } catch (e) {
    console.error(e);
    send(res, 500, 'text/plain', `Error: ${e.message}`);
  }
});

server.listen(PORT, () => {
  console.log(`\n  Elenos Content Engine — ${MODE.toUpperCase()} mode`);
  console.log(`  http://localhost:${PORT}\n`);
});
