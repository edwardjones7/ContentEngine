import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getPiece } from '@/lib/db.mjs';
import { Stepper } from '../parts';
import { saveAction, regenerateAction, publishAction, regenerateMediumAction, saveMediumAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function ReviewPage({ params }: { params: Promise<{ pieceId: string }> }) {
  const { pieceId } = await params;
  const p: any = getPiece(pieceId);
  if (!p) notFound();
  if (p.status === 'building') redirect(`/content/${pieceId}/edit`);
  const slides = p.render?.slides || [];
  const mediums = p.mediums || {};

  return (
    <>
      <div className="row"><Link className="src" href="/content">← board</Link></div>
      <Stepper current={p.status} />
      <div className="row" style={{ margin: '6px 0 18px' }}>
        <h1 style={{ margin: 0 }}>{p.title}</h1>
        <span className={`badge ${p.status}`}>{p.status}</span>
        <span className="sp" />
        {p.render ? <span className="src">{p.render.theme}/{p.render.bg} · seed {p.seed}</span> : null}
      </div>

      <div className="row" style={{ marginBottom: 20 }}>
        {p.render ? (
          <>
            <form action={regenerateAction}><input type="hidden" name="pieceId" value={p.id} /><button type="submit">↻ Reshuffle layouts</button></form>
            <a className="btn" href={`/content/${p.id}/download`}>⤓ Download slides (.zip)</a>
          </>
        ) : null}
        {p.blog ? (
          p.status !== 'published'
            ? <form action={publishAction}><input type="hidden" name="pieceId" value={p.id} /><button className="primary" type="submit">✓ Accept &amp; publish blog</button></form>
            : <Link className="btn" href={`/blog/${p.slug}`}>View published post →</Link>
        ) : <span className="src">no blog in this build — nothing to publish</span>}
      </div>

      <div className="split">
        {p.blog ? (
          <div>
            <h2 className="sec">Blog draft {p.status !== 'published' ? '(editable — not published)' : '(published)'}</h2>
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
        ) : null}
        {p.render ? (
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
        ) : null}
      </div>

      {Object.keys(mediums).length ? (
        <>
          <h2 className="sec">Mediums</h2>
          <div className="grid cols2">
            {mediums.caption ? <CaptionSection p={p} m={mediums.caption} /> : null}
            {mediums.xthread ? <XThreadSection p={p} m={mediums.xthread} /> : null}
            {mediums.linkedin ? <LinkedInSection p={p} m={mediums.linkedin} /> : null}
            {mediums.video ? <VideoSection p={p} m={mediums.video} /> : null}
          </div>
        </>
      ) : null}
    </>
  );
}

function MediumHead({ p, medium, title, note }: { p: any; medium: string; title: string; note?: string }) {
  return (
    <div className="row" style={{ marginBottom: 12 }}>
      <span className="label">{title}</span>
      {note ? <span className="src">{note}</span> : null}
      <span className="sp" />
      <form action={regenerateMediumAction}>
        <input type="hidden" name="pieceId" value={p.id} />
        <input type="hidden" name="medium" value={medium} />
        <button type="submit">↻ Regenerate</button>
      </form>
    </div>
  );
}

function MediumError({ p, medium, title, error }: { p: any; medium: string; title: string; error: string }) {
  return (
    <div className="card">
      <MediumHead p={p} medium={medium} title={title} note="failed" />
      <div className="meta" style={{ color: '#ff9c9c' }}>⚠ {error} — regenerate to retry.</div>
    </div>
  );
}

function CaptionSection({ p, m }: { p: any; m: any }) {
  if (m.status === 'error') return <MediumError p={p} medium="caption" title="Caption + hashtags" error={m.error} />;
  return (
    <div className="card">
      <MediumHead p={p} medium="caption" title="Caption + hashtags" note={`${(m.text || '').length}/2200 chars`} />
      <form action={saveMediumAction}>
        <input type="hidden" name="pieceId" value={p.id} />
        <input type="hidden" name="medium" value="caption" />
        <textarea name="text" defaultValue={m.text} style={{ minHeight: 160 }} />
        <label className="src" style={{ margin: '10px 0 4px', display: 'block' }}>Hashtags (space-separated)</label>
        <input className="title" style={{ fontSize: 13 }} name="hashtags" defaultValue={(m.hashtags || []).map((h: string) => `#${h}`).join(' ')} />
        <button className="primary" type="submit">Save</button>
      </form>
    </div>
  );
}

function XThreadSection({ p, m }: { p: any; m: any }) {
  if (m.status === 'error') return <MediumError p={p} medium="xthread" title="X thread" error={m.error} />;
  const tweets = m.tweets || [];
  return (
    <div className="card">
      <MediumHead p={p} medium="xthread" title="X thread" note={`${tweets.length} posts`} />
      <form action={saveMediumAction}>
        <input type="hidden" name="pieceId" value={p.id} />
        <input type="hidden" name="medium" value="xthread" />
        {tweets.map((t: any, i: number) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <label className="src">{i + 1}/{tweets.length} · {(t.text || '').length}/280</label>
            <textarea name="tweet" defaultValue={t.text} style={{ minHeight: 64 }} />
          </div>
        ))}
        <button className="primary" type="submit">Save</button>
      </form>
    </div>
  );
}

function LinkedInSection({ p, m }: { p: any; m: any }) {
  if (m.status === 'error') return <MediumError p={p} medium="linkedin" title="LinkedIn post" error={m.error} />;
  return (
    <div className="card">
      <MediumHead p={p} medium="linkedin" title="LinkedIn post" note={`${(m.text || '').length}/3000 chars`} />
      <form action={saveMediumAction}>
        <input type="hidden" name="pieceId" value={p.id} />
        <input type="hidden" name="medium" value="linkedin" />
        <textarea name="text" defaultValue={m.text} style={{ minHeight: 220 }} />
        <button className="primary" type="submit" style={{ marginTop: 10 }}>Save</button>
      </form>
    </div>
  );
}

function VideoSection({ p, m }: { p: any; m: any }) {
  if (m.status === 'error') return <MediumError p={p} medium="video" title="Video script" error={m.error} />;
  const beats = m.beats || [];
  return (
    <div className="card">
      <MediumHead p={p} medium="video" title="Video script" note={`${beats.length} beats · TikTok/Reels`} />
      <form action={saveMediumAction}>
        <input type="hidden" name="pieceId" value={p.id} />
        <input type="hidden" name="medium" value="video" />
        <label className="src">Hook (spoken open)</label>
        <textarea name="hook" defaultValue={m.hook} style={{ minHeight: 56 }} />
        {beats.map((b: any, i: number) => (
          <div key={i} style={{ margin: '10px 0' }}>
            <label className="src">Beat {i + 1}</label>
            <textarea name="beat" defaultValue={b.beat} style={{ minHeight: 56 }} />
            <input className="title" style={{ fontSize: 13, marginTop: 6 }} name="onScreenText" defaultValue={b.onScreenText} placeholder="on-screen text" />
          </div>
        ))}
        <label className="src">CTA (closing line)</label>
        <textarea name="cta" defaultValue={m.cta} style={{ minHeight: 56 }} />
        <button className="primary" type="submit" style={{ marginTop: 10 }}>Save</button>
      </form>
    </div>
  );
}
