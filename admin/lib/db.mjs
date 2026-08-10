// Store (server-only). Two backends behind one async interface:
//   • Postgres (Neon) when POSTGRES_URL is set — the shared source of truth, so
//     localhost and the Vercel deployment see the same board.
//   • JSON file under data/ otherwise — zero-setup local dev.
// The whole store is one JSONB document guarded by a version column, so a
// read-modify-write can't silently lose a concurrent edit; mutate() retries.
// Renders live under public/renders locally and in Blob storage on Vercel
// (see lib/blob.mjs) so the URLs on a piece resolve in both places.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeStatus } from './content/stages.mjs';

const here = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = resolve(here, '..', 'data');
export const RENDER_DIR = resolve(here, '..', 'public', 'renders');
const DB = resolve(DATA_DIR, 'db.json');

const EMPTY = () => ({ threads: [], messages: [], ideas: [], pieces: [], published: [] });
const CONN = () => process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
export const usingPostgres = () => !!CONN();

// ---- postgres backend -------------------------------------------------------

let _sql = null;
async function sql() {
  if (!_sql) {
    const { neon } = await import('@neondatabase/serverless');
    _sql = neon(CONN());
    await _sql`create schema if not exists orbit`;
    await _sql`create table if not exists orbit.state (
      id int primary key, doc jsonb not null,
      version bigint not null default 1, updated_at timestamptz not null default now()
    )`;
  }
  return _sql;
}

async function loadPg() {
  const q = await sql();
  const rows = await q`select doc, version from orbit.state where id = 1`;
  if (!rows.length) return { doc: EMPTY(), version: 0 };
  return { doc: rows[0].doc, version: Number(rows[0].version) };
}

// Compare-and-set on version; false means someone else wrote first.
async function savePg(doc, version) {
  const q = await sql();
  const json = JSON.stringify(doc);
  if (version === 0) {
    const r = await q`insert into orbit.state (id, doc, version) values (1, ${json}::jsonb, 1)
                      on conflict (id) do nothing returning version`;
    return r.length > 0;
  }
  const r = await q`update orbit.state set doc = ${json}::jsonb, version = version + 1, updated_at = now()
                    where id = 1 and version = ${version} returning version`;
  return r.length > 0;
}

// ---- file backend -----------------------------------------------------------

let _mem = null;
let _ro = false;

function ensureFile() {
  if (_ro) return;
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    if (!existsSync(RENDER_DIR)) mkdirSync(RENDER_DIR, { recursive: true });
    if (!existsSync(DB)) writeFileSync(DB, JSON.stringify(EMPTY(), null, 2));
  } catch (e) {
    _ro = true;
    console.warn('[db] read-only filesystem — in-memory store:', e.code || e.message);
  }
}

function loadFile() {
  ensureFile();
  if (_ro) {
    if (!_mem) { try { _mem = JSON.parse(readFileSync(DB, 'utf8')); } catch { _mem = EMPTY(); } }
    return _mem;
  }
  try { return JSON.parse(readFileSync(DB, 'utf8')); } catch { return EMPTY(); }
}

function saveFile(doc) {
  ensureFile();
  if (_ro) { _mem = doc; return; }
  writeFileSync(DB, JSON.stringify(doc, null, 2));
}

// ---- shared ----------------------------------------------------------------

function normalize(db) {
  db.threads ||= []; db.messages ||= []; db.ideas ||= []; db.pieces ||= []; db.published ||= [];
  // legacy piece statuses (building/draft/published) normalize to board stages
  for (const p of db.pieces) {
    const s = normalizeStatus(p.status);
    if (p.status === 'published' && !p.postedAt) p.postedAt = p.publishedAt || null;
    p.status = s;
  }
  return db;
}

export async function read() {
  if (!usingPostgres()) return normalize(loadFile());
  const { doc } = await loadPg();
  return normalize(doc);
}

export async function write(db) {
  if (!usingPostgres()) return saveFile(db);
  const { version } = await loadPg();
  await savePg(db, version);
}

// Atomic read-modify-write. `fn(doc)` mutates the doc and may return a value.
async function mutate(fn) {
  if (!usingPostgres()) {
    const doc = normalize(loadFile());
    const out = fn(doc);
    saveFile(doc);
    return out;
  }
  for (let attempt = 0; attempt < 6; attempt++) {
    const { doc, version } = await loadPg();
    const out = fn(normalize(doc));
    if (await savePg(doc, version)) return out;
  }
  throw new Error('db: write contention — please retry');
}

let _seq = 0;
export function id(prefix = 'x') { _seq += 1; return `${prefix}_${Date.now().toString(36)}${_seq}`; }

// ---- pieces ----------------------------------------------------------------

export const getPieces = async () => (await read()).pieces;
export const getPiece = async (pid) => (await read()).pieces.find((p) => p.id === pid);
export const savePiece = (piece) => mutate((db) => {
  const i = db.pieces.findIndex((p) => p.id === piece.id);
  if (i >= 0) db.pieces[i] = piece; else db.pieces.unshift(piece);
  return piece;
});
export const removePiece = (pid) => mutate((db) => { db.pieces = db.pieces.filter((p) => p.id !== pid); });

// ---- ideas -----------------------------------------------------------------

export const getIdeas = async () => (await read()).ideas;
export const getIdea = async (iid) => (await read()).ideas.find((i) => i.id === iid);
export const setIdeas = (ideas) => mutate((db) => { db.ideas = ideas; });
export const addIdea = (idea) => mutate((db) => {
  const i = db.ideas.findIndex((x) => x.id === idea.id);
  if (i >= 0) db.ideas[i] = idea; else db.ideas.unshift(idea);
  return idea;
});

// ---- orbit threads + messages ----------------------------------------------
// `content` holds verbatim Anthropic content blocks so history replays to the
// API untransformed (and maps 1:1 to a JSONB column).

export const getThreads = async () => (await read()).threads;
export const getThread = async (tid) => (await read()).threads.find((t) => t.id === tid);
export const saveThread = (thread) => mutate((db) => {
  const i = db.threads.findIndex((t) => t.id === thread.id);
  if (i >= 0) db.threads[i] = thread; else db.threads.unshift(thread);
  return thread;
});
export const deleteThread = (tid) => mutate((db) => {
  db.threads = db.threads.filter((t) => t.id !== tid);
  db.messages = db.messages.filter((m) => m.threadId !== tid);
  for (const i of db.ideas) if (i.threadId === tid) i.threadId = null;
});
export const getMessages = async (tid) => (await read()).messages.filter((m) => m.threadId === tid);
export const addMessage = (message) => mutate((db) => {
  db.messages.push(message);
  const t = db.threads.find((x) => x.id === message.threadId);
  if (t) t.updatedAt = message.createdAt;
  return message;
});

// ---- published -------------------------------------------------------------

export const getPublished = async () => (await read()).published;
export const getPublishedBySlug = async (slug) => (await read()).published.find((p) => p.slug === slug);
export const addPublished = (post) => mutate((db) => {
  const i = db.published.findIndex((p) => p.slug === post.slug);
  if (i >= 0) db.published[i] = post; else db.published.unshift(post);
  return post;
});
