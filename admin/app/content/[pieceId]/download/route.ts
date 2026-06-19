import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getPiece, RENDER_DIR } from '@/lib/db.mjs';
import { buildZip } from '@/lib/zip.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ pieceId: string }> }) {
  const { pieceId } = await params;
  const p: any = getPiece(pieceId);
  if (!p?.render) return new Response('not found', { status: 404 });
  const dir = resolve(RENDER_DIR, p.id);
  const files = p.render.slides.map((s: any) => ({ name: s.file, data: readFileSync(resolve(dir, s.file)) }));
  const zip = buildZip(files);
  return new Response(new Uint8Array(zip), {
    headers: { 'content-type': 'application/zip', 'content-disposition': `attachment; filename="${p.slug}-slides.zip"` },
  });
}
