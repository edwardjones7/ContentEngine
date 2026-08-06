'use client';
// The Kanban board. Server page (page.tsx) loads the data and hands slim card
// DTOs across the boundary; this component owns drag-and-drop, optimistic
// moves, the goal filter, and per-stage card affordances. Native HTML5 DnD —
// cards only move between columns, and every drag has a button fallback.
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { moveCardAction, setGoalAction, setPostDateAction, buildCardAction, acceptAction, addIdeaAction } from './actions';
import { ideateIdeaAction } from '../orbit/actions';
import { SubmitButton } from './pending';

export type CardDTO = {
  kind: 'idea' | 'piece';
  id: string;
  stage: string;
  title: string;
  goal: string | null;
  formats: string[];
  source?: string;
  angle?: string;
  hook?: string;
  hasScript?: boolean;
  thumb?: string | null;
  built?: boolean;
  hasBlog?: boolean;
  blogPublished?: boolean;
  slug?: string;
  postAt?: string | null;
  postedAt?: string | null;
  threadId?: string | null;
  suggested?: boolean;
  accepting?: boolean; // optimistic idea→production placeholder
};

type Columns = Record<string, CardDTO[]>;

const STAGES = ['idea', 'production', 'review', 'ready', 'posted'];
const STAGE_LABEL: Record<string, string> = { idea: 'Idea', production: 'Production', review: 'Review', ready: 'Ready to Post', posted: 'Posted' };
const STAGE_EMPTY: Record<string, string> = {
  idea: 'No ideas yet — chat with Orbit to develop one, or hit ↻ Refresh research.',
  production: 'Drag an idea here (or Accept one) to start producing.',
  review: 'Built pieces land here for review.',
  ready: 'Approved pieces queue here with a target post date.',
  posted: 'Nothing posted yet.',
};
const GOALS = ['leads', 'authority', 'nurture', 'story', 'values'];
const GOAL_LABEL: Record<string, string> = { leads: 'Leads', authority: 'Authority', nurture: 'Nurture', story: 'Story', values: 'Values' };
const MEDIUM_BADGE: Record<string, string> = { carousel: 'IG', blog: 'Blog', caption: 'Cap', xthread: 'X', linkedin: 'LI', video: '🎬' };

function canDrop(card: CardDTO | null, stage: string): boolean {
  if (!card || card.stage === stage) return false;
  if (card.kind === 'idea') return stage === 'production';
  if (stage === 'idea') return false;
  if (stage !== 'production' && !card.built) return false;
  return true;
}

export function Board({ columns }: { columns: Columns }) {
  const router = useRouter();
  const [cols, setCols] = useState<Columns>(columns);
  const [drag, setDrag] = useState<CardDTO | null>(null);
  const [goalFilter, setGoalFilter] = useState<string | null>(null);
  const [hint, setHint] = useState('');
  const [, startTransition] = useTransition();

  // resync optimistic state whenever the server sends fresh columns
  useEffect(() => setCols(columns), [columns]);

  function onDrop(card: CardDTO, toStage: string) {
    setHint('');
    const snapshot = cols;
    const moved: CardDTO = card.kind === 'idea'
      ? { ...card, stage: toStage, accepting: true }
      : { ...card, stage: toStage };
    setCols((c) => {
      const next: Columns = {};
      for (const s of STAGES) next[s] = (c[s] || []).filter((x) => x.id !== card.id);
      next[toStage] = [moved, ...next[toStage]];
      return next;
    });
    startTransition(async () => {
      const res = await moveCardAction(card.kind, card.id, toStage);
      if (!res.ok) {
        setCols(snapshot);
        setHint(res.error || 'Move failed');
      } else {
        router.refresh();
      }
    });
  }

  const visible = (cards: CardDTO[]) => (goalFilter ? cards.filter((c) => c.goal === goalFilter) : cards);

  return (
    <>
      <div className="board-filter">
        <button type="button" className={`chip ${goalFilter === null ? 'on' : ''}`} onClick={() => setGoalFilter(null)}>All</button>
        {GOALS.map((g) => (
          <button
            key={g}
            type="button"
            className={`chip goal goal-${g} ${goalFilter === g ? 'on' : ''}`}
            onClick={() => setGoalFilter(goalFilter === g ? null : g)}
          >
            {GOAL_LABEL[g]}
          </button>
        ))}
        {hint ? <span className="board-hint">⚠ {hint}</span> : null}
      </div>

      <div className="board">
        {STAGES.map((stage) => {
          const cards = visible(cols[stage] || []);
          return (
            <BoardColumn key={stage} stage={stage} count={cards.length} drag={drag} onDrop={onDrop}>
              {cards.map((card) =>
                card.kind === 'idea'
                  ? <IdeaCardC key={card.id} card={card} setDrag={setDrag} />
                  : <PieceCardC key={card.id} card={card} setDrag={setDrag} />
              )}
              {cards.length === 0 ? <div className="empty">{STAGE_EMPTY[stage]}</div> : null}
              {stage === 'idea' ? <NewIdeaCard /> : null}
            </BoardColumn>
          );
        })}
      </div>
    </>
  );
}

function BoardColumn({ stage, count, drag, onDrop, children }: {
  stage: string;
  count: number;
  drag: CardDTO | null;
  onDrop: (card: CardDTO, stage: string) => void;
  children: React.ReactNode;
}) {
  const [over, setOver] = useState(0);
  const droppable = canDrop(drag, stage);
  return (
    <div
      className={`column ${droppable && over > 0 ? 'drop' : ''}`}
      onDragOver={(e) => { if (droppable) e.preventDefault(); }}
      onDragEnter={() => setOver((n) => n + 1)}
      onDragLeave={() => setOver((n) => Math.max(0, n - 1))}
      onDrop={(e) => {
        e.preventDefault();
        setOver(0);
        if (drag && droppable) onDrop(drag, stage);
      }}
    >
      <h2>{STAGE_LABEL[stage]} <span className="count">{count}</span></h2>
      {children}
    </div>
  );
}

function dragProps(card: CardDTO, setDrag: (c: CardDTO | null) => void) {
  return {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData('text/plain', card.id); // Firefox needs data to start a drag
      e.dataTransfer.effectAllowed = 'move';
      setDrag(card);
      (e.currentTarget as HTMLElement).classList.add('dragging');
    },
    onDragEnd: (e: React.DragEvent) => {
      setDrag(null);
      (e.currentTarget as HTMLElement).classList.remove('dragging');
    },
  };
}

// Manual idea entry, Notion-style "+ New" at the foot of the Idea column.
function NewIdeaCard() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  if (!open) {
    return <button type="button" className="add-card" onClick={() => setOpen(true)}>＋ New idea</button>;
  }
  return (
    <div className="card" style={{ marginTop: 10 }}>
      <form action={async (fd: FormData) => { await addIdeaAction(fd); setOpen(false); router.refresh(); }}>
        <input className="title" name="title" placeholder="Title" required autoFocus style={{ fontSize: 14, marginBottom: 8 }} />
        <textarea name="angle" placeholder="Angle — the argument this post makes (optional)" style={{ minHeight: 60, marginBottom: 8 }} />
        <textarea name="hook" placeholder="Hook — the opening line (optional)" style={{ minHeight: 48, marginBottom: 8 }} />
        <textarea name="script" placeholder="Script — draft copy or notes; guides the AI build (optional)" style={{ minHeight: 90, marginBottom: 8 }} />
        <div className="row" style={{ gap: 8 }}>
          <select name="goal" defaultValue="" title="Goal tag">
            <option value="">goal…</option>
            {GOALS.map((g) => <option key={g} value={g}>{GOAL_LABEL[g]}</option>)}
          </select>
          <span className="sp" />
          <button type="button" onClick={() => setOpen(false)}>Cancel</button>
          <SubmitButton className="primary" busy="adding…">Add</SubmitButton>
        </div>
      </form>
    </div>
  );
}

function GoalPicker({ kind, id, goal }: { kind: string; id: string; goal: string | null }) {
  return (
    <details className="goal-pick">
      <summary>
        {goal
          ? <span className={`chip goal goal-${goal}`}>{GOAL_LABEL[goal]}</span>
          : <span className="chip goal">＋ goal</span>}
      </summary>
      <form className="goal-menu" action={setGoalAction} onClick={(e) => (e.currentTarget.closest('details') as HTMLDetailsElement)?.removeAttribute('open')}>
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={id} />
        {GOALS.map((g) => (
          <button key={g} type="submit" name="goal" value={g}>
            <span className={`chip goal goal-${g} ${g === goal ? 'on' : ''}`}>{GOAL_LABEL[g]}</span>
          </button>
        ))}
      </form>
    </details>
  );
}

function IdeaCardC({ card, setDrag }: { card: CardDTO; setDrag: (c: CardDTO | null) => void }) {
  return (
    <div className="card" {...dragProps(card, setDrag)}>
      <div className="row">
        <span className="label">{card.source || 'idea'}</span>
        <span className="sp" />
        {card.threadId
          ? <Link className="src" href={`/orbit/${card.threadId}`}>from thread →</Link>
          : card.suggested ? <span className="src">✨ orbit pitch</span> : <span className="src">novel</span>}
      </div>
      <h3>{card.title}</h3>
      <div className="meta">{card.angle}</div>
      {card.hook ? <div className="meta" style={{ color: '#cfc7e6' }}>“{card.hook}”</div> : null}
      <div className="row" style={{ gap: 8 }}>
        <GoalPicker kind="idea" id={card.id} goal={card.goal} />
        {card.hasScript ? <span className="badge medium" title="Has a draft script — it guides the AI build">📝 script</span> : null}
        <span className="sp" />
        <form action={ideateIdeaAction}>
          <input type="hidden" name="ideaId" value={card.id} />
          <button type="submit" title="Riff on this idea with Orbit before committing it">💬</button>
        </form>
        <form action={acceptAction}>
          <input type="hidden" name="ideaId" value={card.id} />
          <button className="primary" type="submit">Accept →</button>
        </form>
      </div>
    </div>
  );
}

function PieceCardC({ card, setDrag }: { card: CardDTO; setDrag: (c: CardDTO | null) => void }) {
  if (card.accepting) {
    return <div className="card"><h3>{card.title}</h3><div className="meta"><span className="busy">accepting…</span></div></div>;
  }
  const href = card.built ? `/content/${card.id}` : `/content/${card.id}/edit`;
  return (
    <div className="card" {...dragProps(card, setDrag)}>
      {card.thumb ? <Link href={href}><img className="card-thumb" src={card.thumb} alt="" /></Link> : null}
      <div className="row" style={{ gap: 8 }}>
        <Link href={href}><h3 style={{ margin: 0 }}>{card.title}</h3></Link>
      </div>
      {card.angle && !card.built ? <div className="meta">{card.angle}</div> : null}
      <div className="row" style={{ gap: 6, marginBottom: 10 }}>
        <GoalPicker kind="piece" id={card.id} goal={card.goal} />
        {card.formats.map((m) => <span key={m} className="badge medium">{MEDIUM_BADGE[m] || m}</span>)}
      </div>
      <StageActions card={card} href={href} />
    </div>
  );
}

function StageActions({ card, href }: { card: CardDTO; href: string }) {
  if (card.stage === 'production') {
    return (
      <div className="row" style={{ gap: 8 }}>
        <Link className="btn ghost" href={`/content/${card.id}/edit`}>✎ Concept</Link>
        <span className="sp" />
        {card.built
          ? <Link className="btn" href={href}>Review →</Link>
          : (
            <form action={buildCardAction}>
              <input type="hidden" name="pieceId" value={card.id} />
              <SubmitButton className="primary" busy="building…" title="Brief → slides → renders → mediums">⚡ Build</SubmitButton>
            </form>
          )}
      </div>
    );
  }
  if (card.stage === 'ready') {
    return (
      <div className="row" style={{ gap: 8 }}>
        <form action={setPostDateAction}>
          <input type="hidden" name="pieceId" value={card.id} />
          <input
            type="date"
            name="postAt"
            defaultValue={card.postAt || ''}
            title="Target post date"
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
          />
        </form>
        <span className="sp" />
        <Link className="btn" href={href}>View →</Link>
      </div>
    );
  }
  if (card.stage === 'posted') {
    return (
      <div className="row" style={{ gap: 8 }}>
        {card.postedAt ? <span className="src">posted {card.postedAt.slice(0, 10)}</span> : null}
        <span className="sp" />
        {card.blogPublished && card.slug
          ? <Link className="btn ghost" href={`/blog/${card.slug}`}>Blog →</Link>
          : null}
        <Link className="btn" href={href}>View →</Link>
      </div>
    );
  }
  return (
    <div className="row">
      <span className="sp" />
      <Link className="btn" href={href}>Review →</Link>
    </div>
  );
}
