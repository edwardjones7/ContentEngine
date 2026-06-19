import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPiece } from '@/lib/db.mjs';
import { saveAction, regenerateAction, publishAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function ReviewPage({ params }: { params: Promise<{ pieceId: string }> }) {
  const { pieceId } = await params;
  const p: any = getPiece(pieceId);
  if (!p) notFound();
  const slides = p.render?.slides || [];

  return (
    <>
      <div className="row"><Link className="src" href="/content/queue">← queue</Link></div>
      <div className="row" style={{ margin: '6px 0 18px' }}>
        <h1 style={{ margin: 0 }}>{p.title}</h1>
        <span className={`badge ${p.status}`}>{p.status}</span>
        <span className="sp" />
        <span className="src">{p.render?.theme}/{p.render?.bg} · seed {p.seed}</span>
      </div>

      <div className="row" style={{ marginBottom: 20 }}>
        <form action={regenerateAction}><input type="hidden" name="pieceId" value={p.id} /><button type="submit">↻ Reshuffle layouts</button></form>
        <a className="btn" href={`/content/${p.id}/download`}>⤓ Download slides (.zip)</a>
        {p.status === 'draft'
          ? <form action={publishAction}><input type="hidden" name="pieceId" value={p.id} /><button className="primary" type="submit">✓ Accept &amp; publish blog</button></form>
          : <Link className="btn" href={`/blog/${p.slug}`}>View published post →</Link>}
      </div>

      <div className="split">
        <div>
          <h2 className="sec">Blog draft {p.status === 'draft' ? '(editable — not published)' : '(published)'}</h2>
          <form action={saveAction}>
            <input type="hidden" name="pieceId" value={p.id} />
            <input className="title" name="title" defaultValue={p.blog.title} />
            <textarea name="markdown" defaultValue={p.blog.markdown} />
            <div className="row" style={{ marginTop: 12 }}>
              <button className="primary" type="submit">Save draft</button>
              <span className="src">{p.blog.meta?.words || ''} words · markdown</span>
            </div>
          </form>
        </div>
        <div>
          <h2 className="sec">Carousel — {slides.length} slides, post-ready PNGs</h2>
          <div className="slides">
            {slides.map((s: any) => (
              <figure key={s.file}>
                <a href={s.url} target="_blank"><img src={s.url} loading="lazy" alt={`slide ${s.index}`} /></a>
                <figcaption>{String(s.index).padStart(2, '0')} · {s.type}/{s.layout}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
