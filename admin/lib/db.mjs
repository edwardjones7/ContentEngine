// File-backed store (server-only). The interface — getPieces/savePiece/… — is
// the seam that swaps to Postgres (Prisma/Drizzle) in the real monorepo; the
// call sites don't change. Renders are written under public/ so Next serves them
// statically at /renders/<pieceId>/<file>.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = resolve(here, '..', 'data');
export const RENDER_DIR = resolve(here, '..', 'public', 'renders');
const DB = resolve(DATA_DIR, 'db.json');

function ensure() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(RENDER_DIR)) mkdirSync(RENDER_DIR, { recursive: true });
  if (!existsSync(DB)) writeFileSync(DB, JSON.stringify({ ideas: [], pieces: [], published: [] }, null, 2));
}
export function read() { ensure(); return JSON.parse(readFileSync(DB, 'utf8')); }
export function write(db) { ensure(); writeFileSync(DB, JSON.stringify(db, null, 2)); }

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
export const getIdeas = () => read().ideas;
export function setIdeas(ideas) { const db = read(); db.ideas = ideas; write(db); }
export const getPublished = () => read().published;
export const getPublishedBySlug = (slug) => read().published.find((p) => p.slug === slug);
export function addPublished(post) {
  const db = read();
  const i = db.published.findIndex((p) => p.slug === post.slug);
  if (i >= 0) db.published[i] = post; else db.published.unshift(post);
  write(db); return post;
}
