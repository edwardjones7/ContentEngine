// Where rendered slide PNGs live. Locally that's public/renders (Next serves
// them at /renders/...). With BLOB_READ_WRITE_TOKEN set, they go to Vercel Blob
// instead, so a carousel built on your Mac is visible on the deployment too —
// the piece stores absolute Blob URLs and both environments resolve them.
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { RENDER_DIR } from './db.mjs';

export const usingBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;

// Replace a piece's whole render set. Returns [{ file, url }] in input order.
export async function putRenders(pieceId, files) {
  if (usingBlob()) {
    const { put, list, del } = await import('@vercel/blob');
    const { blobs } = await list({ prefix: `renders/${pieceId}/` });
    if (blobs.length) await del(blobs.map((b) => b.url));
    const out = [];
    for (const f of files) {
      const { url } = await put(`renders/${pieceId}/${f.file}`, f.png, {
        access: 'public',
        contentType: 'image/png',
        addRandomSuffix: false,
      });
      out.push({ file: f.file, url });
    }
    return out;
  }

  const dir = resolve(RENDER_DIR, pieceId);
  if (existsSync(dir)) rmSync(dir, { recursive: true });
  mkdirSync(dir, { recursive: true });
  return files.map((f) => {
    writeFileSync(resolve(dir, f.file), f.png);
    return { file: f.file, url: `/renders/${pieceId}/${f.file}` };
  });
}

export async function removeRenders(pieceId) {
  if (usingBlob()) {
    const { list, del } = await import('@vercel/blob');
    const { blobs } = await list({ prefix: `renders/${pieceId}/` });
    if (blobs.length) await del(blobs.map((b) => b.url));
    return;
  }
  rmSync(resolve(RENDER_DIR, pieceId), { recursive: true, force: true });
}
