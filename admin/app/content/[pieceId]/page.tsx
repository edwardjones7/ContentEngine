import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getPiece } from '@/lib/db.mjs';
import { activeProvider } from '@/lib/settings.mjs';
import { Stepper } from '../parts';
import { SubmitButton, ChipSubmit } from '../pending';
import { saveAction, regenerateAction, rebuildCarouselAction, publishAction, regenerateMediumAction, saveMediumAction, editSlideAction, setTagAction } from '../actions';
import { TAG_FIELDS } from '@/lib/content/stages.mjs';

export const dynamic = 'force-dynamic';

export default async function ReviewPage({ params }: { params: Promise<{ pieceId: string }> }) {
  const { pieceId } = await params;
  const p: any = getPiece(pieceId);
  if (!p) notFound();
  if (!p.builtAt) redirect(`/content/${pieceId}/edit`);
  const slides = p.render?.slides || [];
  const mediums = p.mediums || {};
  const qa = p.render?.qa || null;
  const live = activeProvider().kind !== 'offline';

  return (
    <>
      <div className="row"><Link className="src" href="/content">← board</Link></div>
      <Stepper current={p.status} />
      <div className="row" style={{ margin: '6px 0 18px' }}>
        <h1 style={{ margin: 0 }}>{p.title}</h1>
        <span className={`badge ${p.status}`}>{p.status}</span>
        {Object.entries(TAG_FIELDS).map(([field, dim]: [string, any]) => (
          <form key={field} action={setTagAction} className="row" style={{ gap: 6 }}>
            <input type="hidden" name="kind" value="piece" />
            <input type="hidden" name="id" value={p.id} />
            <input type="hidden" name="field" value={field} />
            {dim.values.map((v: string) => (
              <ChipSubmit key={v} value={v} chipClass={`chip goal ${field}-${v} ${p[field] === v ? 'on' : ''}`} title={`${field}: ${dim.labels[v]}`}>
                {dim.labels[v]}
              </ChipSubmit>
            ))}
          </form>
        ))}
        <span className="sp" />
        {p.render ? <span className="src">{p.render.theme}/{p.render.bg} · seed {p.seed}</span> : null}
      </div>

      <div className="row" style={{ marginBottom: 20 }}>
        {p.render ? (
          <>
            <form action={regenerateAction}>
              <input type="hidden" name="pieceId" value={p.id} />
              <SubmitButton busy="↻ reshuffling…" title="New seed, same copy — reshuffles theme/background/layouts (runs AI QA)">↻ Reshuffle layouts</SubmitButton>
            </form>
            <form action={rebuildCarouselAction}>
              <input type="hidden" name="pieceId" value={p.id} />
              <SubmitButton busy="✦ rewriting & rendering…" title="Rewrite the carousel from the concept — new copy, new illustrations, fresh AI QA pass">✦ Refresh carousel</SubmitButton>
            </form>
            <a className="btn" href={`/content/${p.id}/download`}>⤓ Download slides (.zip)</a>
          </>
        ) : null}
        {p.blog ? (
          <>
            <form action={publishAction}>
              <input type="hidden" name="pieceId" value={p.id} />
              <SubmitButton className={p.publishedAt ? '' : 'primary'} busy="publishing…">{p.publishedAt ? '↻ Republish blog' : '✓ Publish blog'}</SubmitButton>
            </form>
            {p.publishedAt ? <Link className="btn ghost" href={`/blog/${p.slug}`}>View published post →</Link> : null}
          </>
        ) : <span className="src">no blog in this build — nothing to publish</span>}
      </div>

      <div className="split">
        {p.blog ? (
          <div>
            <h2 className="sec">Blog draft {p.publishedAt ? '(published)' : '(editable — not published)'}</h2>
            <form action={saveAction}>
              <input type="hidden" name="pieceId" value={p.id} />
              <input className="title" name="title" defaultValue={p.blog.title} />
              <textarea name="markdown" defaultValue={p.blog.markdown} />
              <div className="row" style={{ marginTop: 12 }}>
                <SubmitButton className="primary" busy="saving…">Save draft</SubmitButton>
                <span className="src">{p.blog.meta?.words || ''} words · markdown</span>
              </div>
            </form>
          </div>
        ) : null}
        {p.render ? (
          <div>
            <h2 className="sec">Carousel — {slides.length} slides, post-ready PNGs</h2>
            {qa ? (
              <div className="src" style={{ marginBottom: 10 }}>
                🎯 AI QA {qa.overall != null ? `${qa.overall}/10` : 'ran'} · best of {qa.candidates.length} seed{qa.candidates.length > 1 ? 's' : ''}
                {qa.fixes?.length ? ` · ${qa.fixes.length} auto-fix${qa.fixes.length > 1 ? 'es' : ''} applied` : ''}
                {qa.rounds ? ` · re-verified ×${qa.rounds}` : ''}
                {!(qa.issues || []).length
                  ? <span style={{ color: 'var(--green)' }}> · ✓ clean</span>
                  : <span style={{ color: 'var(--amber)' }}> · {qa.issues.length} unresolved</span>}
              </div>
            ) : live ? null : (
              <div className="src" style={{ marginBottom: 10 }}>AI QA off — offline mode (add a key in Settings)</div>
            )}
            <div className="slides">
              {slides.map((s: any) => {
                const issues = (qa?.issues || []).filter((i: any) => i.index === s.index);
                return (
                  <figure key={s.file}>
                    <a href={s.url} target="_blank"><img src={s.url} loading="lazy" alt={`slide ${s.index}`} /></a>
                    <figcaption>
                      {String(s.index).padStart(2, '0')} · {s.type}/{s.layout}
                      {issues.map((i: any, n: number) => (
                        <span key={n} className="src" style={{ display: 'block', color: '#d9b64e' }} title={i.note}>⚠ {i.kind}: {i.note}</span>
                      ))}
                    </figcaption>
                    {live ? (
                      <form action={editSlideAction} className="row" style={{ gap: 6, marginTop: 6 }}>
                        <input type="hidden" name="pieceId" value={p.id} />
                        <input type="hidden" name="index" value={s.index} />
                        <input className="title" style={{ fontSize: 12, flex: 1 }} name="instruction" placeholder="AI edit — e.g. punchier hook, shorter copy…" />
                        <SubmitButton busy="✨…" title="Revise this slide with AI and re-render">✨</SubmitButton>
                      </form>
                    ) : null}
                  </figure>
                );
              })}
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
            {mediums.youtube ? <YouTubeSection p={p} m={mediums.youtube} /> : null}
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
        <SubmitButton busy="↻ regenerating…">↻ Regenerate</SubmitButton>
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
        <SubmitButton className="primary" busy="saving…">Save</SubmitButton>
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
        <SubmitButton className="primary" busy="saving…">Save</SubmitButton>
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
        <div style={{ marginTop: 10 }}><SubmitButton className="primary" busy="saving…">Save</SubmitButton></div>
      </form>
    </div>
  );
}

function YouTubeSection({ p, m }: { p: any; m: any }) {
  if (m.status === 'error') return <MediumError p={p} medium="youtube" title="YouTube video" error={m.error} />;
  const sections = m.script?.sections || [];
  return (
    <div className="card">
      <MediumHead p={p} medium="youtube" title="YouTube video" note={`${sections.length} chapters · 4-8 min`} />
      <form action={saveMediumAction}>
        <input type="hidden" name="pieceId" value={p.id} />
        <input type="hidden" name="medium" value="youtube" />
        <label className="src">Title ({(m.title || '').length}/100)</label>
        <input className="title" style={{ fontSize: 14 }} name="title" defaultValue={m.title} />
        <label className="src">Description</label>
        <textarea name="description" defaultValue={m.description} style={{ minHeight: 120 }} />
        <label className="src" style={{ marginTop: 8, display: 'block' }}>Tags (comma-separated)</label>
        <input className="title" style={{ fontSize: 13 }} name="tags" defaultValue={(m.tags || []).join(', ')} />
        <label className="src" style={{ marginTop: 8, display: 'block' }}>Hook (first 30 seconds, spoken)</label>
        <textarea name="hook" defaultValue={m.script?.hook} style={{ minHeight: 64 }} />
        {sections.map((s: any, i: number) => (
          <div key={i} style={{ margin: '10px 0' }}>
            <label className="src">Chapter {i + 1}</label>
            <input className="title" style={{ fontSize: 13, marginBottom: 6 }} name="heading" defaultValue={s.heading} placeholder="chapter title" />
            <textarea name="talking" defaultValue={s.talking} style={{ minHeight: 72 }} />
          </div>
        ))}
        <label className="src">Outro (closing CTA)</label>
        <textarea name="outro" defaultValue={m.script?.outro} style={{ minHeight: 56 }} />
        <div style={{ marginTop: 10 }}><SubmitButton className="primary" busy="saving…">Save</SubmitButton></div>
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
        <div style={{ marginTop: 10 }}><SubmitButton className="primary" busy="saving…">Save</SubmitButton></div>
      </form>
    </div>
  );
}
