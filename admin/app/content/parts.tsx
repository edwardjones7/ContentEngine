import Link from 'next/link';
import { BOARD_STAGES, STAGE_LABEL, GOAL_LABEL } from '@/lib/content/stages.mjs';

// Horizontal pipeline indicator. `current` is the active stage (db normalizes
// legacy statuses, so pieces always carry board-stage values).
export function Stepper({ current }: { current: string }) {
  return (
    <div className="stepper">
      {BOARD_STAGES.map((s: string, i: number) => (
        <span key={s}>
          {i ? <span className="arrow">→</span> : null}
          <span className={s === current ? 'on' : ''}>{STAGE_LABEL[s]}</span>
        </span>
      ))}
    </div>
  );
}

const MEDIUM_BADGE: Record<string, string> = { carousel: 'IG', blog: 'Blog', caption: 'Cap', xthread: 'X', linkedin: 'LI', video: '🎬' };

// Flat list row for an accepted piece (used by /content/queue). Action + meta
// adapt to the stage.
export function PieceRow({ p }: { p: any }) {
  const slides = p.render?.slides?.length ?? 0;
  const built = p.mediumsRequested || (p.builtAt ? ['carousel', 'blog'] : []); // pre-Orbit pieces were always carousel+blog
  const action =
    p.status === 'production' && !p.builtAt ? { href: `/content/${p.id}/edit`, label: 'Edit / Build →' }
    : p.status === 'review' ? { href: `/content/${p.id}`, label: 'Review →' }
    : { href: `/content/${p.id}`, label: 'View →' };
  return (
    <div className="card">
      <div className="row" style={{ gap: 8 }}>
        <Link href={action.href}><h3 style={{ margin: 0 }}>{p.title}</h3></Link>
        <span className={`badge ${p.status}`}>{p.status}</span>
        {p.goal ? <span className={`chip goal goal-${p.goal}`}>{GOAL_LABEL[p.goal]}</span> : null}
      </div>
      <div className="meta">
        {!p.builtAt
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
