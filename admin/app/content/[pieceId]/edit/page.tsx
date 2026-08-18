import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getPiece } from '@/lib/db.mjs';
import { Stepper } from '../../parts';
import { SubmitButton } from '../../pending';
import { updateConceptAction, buildAction } from '../../actions';
import { canRenderSlides } from '@/lib/render.mjs';

export const dynamic = 'force-dynamic';
// Builds run brief → blog → mediums (several sequential LLM calls) inside a
// server action, which inherits this page's route config. Without an explicit
// value the platform default is far too short for that. 300 is the Hobby
// ceiling; raise to 800 on Pro if a full multi-medium build still gets cut off.
export const maxDuration = 300;


const MEDIUM_OPTIONS: [string, string, string][] = [
  ['carousel', 'Instagram carousel', 'post-ready PNGs'],
  ['blog', 'Blog post', 'the lead magnet'],
  ['caption', 'Caption + hashtags', 'pairs with the carousel'],
  ['xthread', 'X thread', 'hook + supporting posts'],
  ['linkedin', 'LinkedIn post', 'long-form single post'],
  ['video', 'Video script', 'TikTok/Reels talking head'],
  ['youtube', 'YouTube video', '4-8 min chaptered script'],
];

export default async function EditConceptPage({ params }: { params: Promise<{ pieceId: string }> }) {
  const { pieceId } = await params;
  const p: any = await getPiece(pieceId);
  if (!p) notFound();
  if (p.status !== 'production') redirect(`/content/${pieceId}`);
  const canRender = canRenderSlides();

  return (
    <>
      <div className="row"><Link className="src" href="/content">← board</Link></div>
      <Stepper current="production" />
      <div className="row" style={{ margin: '6px 0 4px' }}>
        <h1 style={{ margin: 0 }}>Shape the concept</h1>
        <span className="badge production">production</span>
      </div>
      <p className="lead">Refine the angle before building. Nothing is rendered until you hit Build.</p>
      {p.concept?.carouselFile ? <p className="src">authored carousel — slide content is fixed; edits here shape the blog framing only.</p> : null}

      <div className="split" style={{ marginTop: 18 }}>
        <div>
          <h2 className="sec">Concept</h2>
          <form action={updateConceptAction}>
            <input type="hidden" name="pieceId" value={p.id} />
            <input className="title" name="title" defaultValue={p.concept.title} />
            <label className="src">Angle</label>
            <textarea name="angle" defaultValue={p.concept.angle} style={{ minHeight: 90 }} />
            <label className="src" style={{ marginTop: 10, display: 'block' }}>Hook</label>
            <textarea name="hook" defaultValue={p.concept.hook} style={{ minHeight: 90 }} />
            <label className="src" style={{ marginTop: 10, display: 'block' }}>Script — draft copy or notes; guides the AI build (optional)</label>
            <textarea name="script" defaultValue={p.concept.script || ''} style={{ minHeight: 140 }} />
            <div className="row" style={{ marginTop: 12 }}>
              <SubmitButton className="primary" busy="saving…">Save concept</SubmitButton>
              <span className="src">{p.concept.source || 'idea'}</span>
            </div>
          </form>
        </div>
        <div>
          <h2 className="sec">Build</h2>
          <div className="card">
            <div className="meta">Pick the mediums this idea becomes. Orbit distills one brief into each — every medium is reviewed (and regenerated) independently. This is the heavy step — give it a moment.</div>
            <form action={buildAction}>
              <input type="hidden" name="pieceId" value={p.id} />
              <div className="mediums-pick">
                {MEDIUM_OPTIONS.map(([value, label, note]) => (
                  <label key={value} className="pick">
                    <input type="checkbox" name="mediums" value={value} defaultChecked />
                    <span>{label}</span><span className="src">{note}</span>
                  </label>
                ))}
              </div>
              <div style={{ marginTop: 14 }}>
                <SubmitButton
                  className="primary"
                  busy={canRender ? '⚙ building — brief → slides → renders → mediums…' : '⚙ building — brief → blog → mediums…'}
                >
                  {p.builtAt ? 'Rebuild piece →' : 'Build piece →'}
                </SubmitButton>
                {canRender ? null : (
                  <div className="meta" style={{ marginTop: 10, marginBottom: 0, color: 'var(--amber)' }}>
                    Everything but the slide PNGs builds here. Screenshotting needs a real browser, so if you tick
                    Instagram carousel the copy and layout are written now and the render stays pending — open the
                    piece at localhost:4050 and hit “Render slides” to finish it.
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
