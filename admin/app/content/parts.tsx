import Link from 'next/link';
import { acceptAction } from './actions';
import { ideateIdeaAction } from '../orbit/actions';

const STAGES = ['research', 'building', 'review', 'published'] as const;
const STAGE_LABEL: Record<string, string> = { research: 'Research', building: 'Building', review: 'Review', published: 'Published' };

// Horizontal pipeline indicator. `current` is the active stage.
export function Stepper({ current }: { current: string }) {
  const at = current === 'draft' ? 'review' : current;
  return (
    <div className="stepper">
      {STAGES.map((s, i) => (
        <span key={s}>
          {i ? <span className="arrow">→</span> : null}
          <span className={s === at ? 'on' : ''}>{STAGE_LABEL[s]}</span>
        </span>
      ))}
    </div>
  );
}

// A board column with a header count and an empty-state placeholder.
export function Column({ title, count, empty, children }: { title: string; count: number; empty: string; children: React.ReactNode }) {
  return (
    <div className="column">
      <h2>{title} <span className="count">{count}</span></h2>
      {count ? children : <div className="empty">{empty}</div>}
    </div>
  );
}

// Research-stage card: an idea not yet accepted into the pipeline.
export function IdeaCard({ idea }: { idea: any }) {
  return (
    <div className="card">
      <div className="row">
        <span className="label">{idea.source || 'idea'}</span>
        <span className="sp" />
        {idea.threadId ? <Link className="src" href={`/orbit/${idea.threadId}`}>from thread →</Link> : idea.suggested ? <span className="src">✨ orbit pitch</span> : idea.carouselFile ? null : <span className="src">novel</span>}
      </div>
      <h3>{idea.title}</h3>
      <div className="meta">{idea.angle}</div>
      <div className="meta" style={{ color: '#cfc7e6' }}>“{idea.hook}”</div>
      <div className="row" style={{ gap: 8 }}>
        <form action={ideateIdeaAction}>
          <input type="hidden" name="ideaId" value={idea.id} />
          <button type="submit" title="Riff on this idea with Orbit before committing it">💬 Ideate</button>
        </form>
        <form action={acceptAction}><input type="hidden" name="ideaId" value={idea.id} /><button className="primary" type="submit">Accept →</button></form>
      </div>
    </div>
  );
}

const MEDIUM_BADGE: Record<string, string> = { carousel: 'IG', blog: 'Blog', caption: 'Cap', xthread: 'X', linkedin: 'LI', video: '🎬' };

// Pipeline card for an accepted piece. Action + meta adapt to the stage.
export function PieceRow({ p }: { p: any }) {
  const slides = p.render?.slides?.length ?? 0;
  const built = p.mediumsRequested || (p.builtAt ? ['carousel', 'blog'] : []); // pre-Orbit pieces were always carousel+blog
  const action =
    p.status === 'building' ? { href: `/content/${p.id}/edit`, label: 'Edit / Build →' }
    : p.status === 'published' ? { href: `/content/${p.id}`, label: 'View →' }
    : { href: `/content/${p.id}`, label: 'Review →' };
  return (
    <div className="card">
      <div className="row" style={{ gap: 8 }}>
        <Link href={action.href}><h3 style={{ margin: 0 }}>{p.title}</h3></Link>
        <span className={`badge ${p.status}`}>{p.status}</span>
      </div>
      <div className="meta">
        {p.status === 'building'
          ? (p.concept?.angle || 'concept — not built yet')
          : p.render
            ? `${slides} slides · ${p.render.theme}/${p.render.bg} · /${p.slug}`
            : `no carousel · /${p.slug}`}
      </div>
      {built.length ? (
        <div className="row" style={{ gap: 6, marginBottom: 10 }}>
          {built.map((m: string) => <span key={m} className="badge medium">{MEDIUM_BADGE[m] || m}</span>)}
        </div>
      ) : null}
      <div className="row"><span className="sp" /><Link className="btn" href={action.href}>{action.label}</Link></div>
    </div>
  );
}
