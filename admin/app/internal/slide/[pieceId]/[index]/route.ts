// The slide as a live page — open /internal/slide/<pieceId>/<n> to iterate a
// single slide visually in the browser. In the monorepo this is the route the
// renderer screenshots; here render.ts uses setContent, so this is for design.
import { getPiece } from '@/lib/db.mjs';
import { artDirect } from '@/lib/slides/art-director.mjs';
import { renderSlideHTML } from '@/lib/slides/template.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ pieceId: string; index: string }> }) {
  const { pieceId, index } = await params;
  const p: any = getPiece(pieceId);
  if (!p) return new Response('piece not found', { status: 404 });
  const carousel = artDirect(p.spec, p.seed || 0);
  const slide = carousel.slides[Number(index) - 1];
  if (!slide) return new Response('slide not found', { status: 404 });
  return new Response(renderSlideHTML(slide, { width: 1080, height: 1350 }), {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
