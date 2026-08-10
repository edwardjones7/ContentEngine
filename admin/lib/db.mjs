// File-backed store (server-only). The interface — getPieces/savePiece/… — is
// the seam that swaps to Postgres (Prisma/Drizzle) in the real monorepo; the
// call sites don't change. Renders are written under public/ so Next serves them
// statically at /renders/<pieceId>/<file>.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeStatus } from './content/stages.mjs';

const here = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = resolve(here, '..', 'data');
export const RENDER_DIR = resolve(here, '..', 'public', 'renders');
const DB = resolve(DATA_DIR, 'db.json');

const EMPTY = () => ({ threads: [], messages: [], ideas: [], pieces: [], published: [] });

// Serverless (Vercel) mounts a read-only filesystem, so the JSON store can't be
// created or written there. Rather than 500 the whole app, fall back to a
// per-instance in-memory copy: reads work off the bundled db.json, writes stay
// in memory for the life of the instance. Swapping this module for Postgres +
// Blob is the real fix — see README.
let _mem = null;
let _ro = false;

function ensure() {
  if (_ro) return;
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    if (!existsSync(RENDER_DIR)) mkdirSync(RENDER_DIR, { recursive: true });
    if (!existsSync(DB)) writeFileSync(DB, JSON.stringify(EMPTY(), null, 2));
  } catch (e) {
    _ro = true;
    console.warn('[db] read-only filesystem — using in-memory store:', e.code || e.message);
  }
}
export function read() {
  ensure();
  if (_ro) {
    if (!_mem) {
      try { _mem = JSON.parse(readFileSync(DB, 'utf8')); } catch { _mem = EMPTY(); }
    }
    return normalize(_mem);
  }
  const db = JSON.parse(readFileSync(DB, 'utf8'));
  return normalize(db);
}

function normalize(db) {
  // backfill collections added after a db.json was first written
  db.threads ||= []; db.messages ||= []; db.ideas ||= []; db.pieces ||= []; db.published ||= [];
  // legacy piece statuses (building/draft/published) normalize to board stages;
  // the file converges to the new vocabulary on its next write
  for (const p of db.pieces) {
    const s = normalizeStatus(p.status);
    if (p.status === 'published' && !p.postedAt) p.postedAt = p.publishedAt || null;
    p.status = s;
  }
  return db;
}

export function write(db) {
  ensure();
  if (_ro) { _mem = db; return; }
  writeFileSync(DB, JSON.stringify(db, null, 2));
}

let _seq = 0;
export function id(prefix = 'x') { _seq += 1; return `${prefix}_${Date.now().toString(36)}${_seq}`; }

export const getPieces = () => read().pieces;
export const getPiece = (pid) => read().pieces.find((p) => p.id === pid);
export function savePiece(piece) {
  const db = read();
  const i = db.pieces.findIndex((p) => p.id === piece.id);
  if (i >= 0) db.pieces[i] = piece; else db.pieces.unshift(piece);
  write(db); return piece;
}
export function removePiece(pid) {
  const db = read();
  db.pieces = db.pieces.filter((p) => p.id !== pid);
  write(db);
}
export const getIdeas = () => read().ideas;
export const getIdea = (iid) => read().ideas.find((i) => i.id === iid);
export function setIdeas(ideas) { const db = read(); db.ideas = ideas; write(db); }
export function addIdea(idea) {
  const db = read();
  const i = db.ideas.findIndex((x) => x.id === idea.id);
  if (i >= 0) db.ideas[i] = idea; else db.ideas.unshift(idea);
  write(db); return idea;
}

// Orbit research threads + their messages. `content` on a message holds the
// verbatim Anthropic content blocks so history replays to the API untransformed
// (and maps 1:1 to a JSONB column when this seam swaps to Postgres).
export const getThreads = () => read().threads;
export const getThread = (tid) => read().threads.find((t) => t.id === tid);
export function saveThread(thread) {
  const db = read();
  const i = db.threads.findIndex((t) => t.id === thread.id);
  if (i >= 0) db.threads[i] = thread; else db.threads.unshift(thread);
  write(db); return thread;
}
export function deleteThread(tid) {
  const db = read();
  db.threads = db.threads.filter((t) => t.id !== tid);
  db.messages = db.messages.filter((m) => m.threadId !== tid);
  for (const i of db.ideas) if (i.threadId === tid) i.threadId = null;
  write(db);
}
export const getMessages = (tid) => read().messages.filter((m) => m.threadId === tid);
export function addMessage(message) {
  const db = read();
  db.messages.push(message);
  const t = db.threads.find((x) => x.id === message.threadId);
  if (t) t.updatedAt = message.createdAt;
  write(db); return message;
}
export const getPublished = () => read().published;
export const getPublishedBySlug = (slug) => read().published.find((p) => p.slug === slug);
export function addPublished(post) {
  const db = read();
  const i = db.published.findIndex((p) => p.slug === post.slug);
  if (i >= 0) db.published[i] = post; else db.published.unshift(post);
  write(db); return post;
}
