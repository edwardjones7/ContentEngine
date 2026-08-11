'use client';
// Month-grid content calendar. Server page hands slim card DTOs; this owns the
// grid math, drag-to-reschedule (native HTML5, same pattern as the board), and
// optimistic updates. Posted pieces are pinned — only scheduled ones drag.
// Ideas ride along as plannable pills: place via each day's + picker or by
// dragging from the tray; they stay ideas until accepted from the board.
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { schedulePieceAction, scheduleIdeaAction } from '../actions';

export type CalCard = {
  id: string;
  kind: 'idea' | 'piece';
  title: string;
  stage: string;
  goal: string | null;
  brand: string | null;
  date: string | null; // YYYY-MM-DD — postedAt for posted, postAt otherwise
  posted: boolean;
};

const GOAL_DOT: Record<string, string> = { leads: '#34e0a8', authority: '#a06bf5', nurture: '#4cc9ff', story: '#ff5fb0', values: '#ffc24d' };
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// 6-week grid of YYYY-MM-DD strings covering the given YYYY-MM month.
function gridDays(month: string): { date: string; inMonth: boolean }[] {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay()); // back to Sunday
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return { date: d.toISOString().slice(0, 10), inMonth: d.getUTCMonth() === m - 1 };
  });
}

function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}

const MONTH_NAME = (month: string) =>
  new Date(month + '-01T12:00:00Z').toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

function Dot({ goal }: { goal: string | null }) {
  return goal ? <span className="cal-dot" style={{ background: GOAL_DOT[goal] }} /> : null;
}

export function Calendar({ month, cards }: { month: string; cards: CalCard[] }) {
  const router = useRouter();
  const [items, setItems] = useState(cards);
  const [drag, setDrag] = useState<CalCard | null>(null);
  const [pick, setPick] = useState<string | null>(null); // date whose idea picker is open
  const [, startTransition] = useTransition();
  useEffect(() => setItems(cards), [cards]);

  // any click outside the open picker (or its + button) closes it
  useEffect(() => {
    if (!pick) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.cal-pick, .cal-add')) setPick(null);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [pick]);

  const today = new Date().toISOString().slice(0, 10);
  const days = gridDays(month);
  const unscheduled = items.filter((c) => !c.date && c.kind === 'piece' && c.stage === 'ready');
  const looseIdeas = items.filter((c) => !c.date && c.kind === 'idea');

  function drop(card: CalCard, date: string | null) {
    if (card.posted) return;
    setItems((all) => all.map((c) => (c.id === card.id ? { ...c, date } : c)));
    startTransition(async () => {
      if (card.kind === 'idea') await scheduleIdeaAction(card.id, date || '');
      else await schedulePieceAction(card.id, date || '');
      router.refresh();
    });
  }

  const cellProps = (date: string | null) => ({
    onDragOver: (e: React.DragEvent) => { if (drag && !drag.posted) e.preventDefault(); },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).classList.remove('drop');
      if (drag && !drag.posted) drop(drag, date);
    },
    onDragEnter: (e: React.DragEvent) => { if (drag && !drag.posted) (e.currentTarget as HTMLElement).classList.add('drop'); },
    onDragLeave: (e: React.DragEvent) => {
      if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) (e.currentTarget as HTMLElement).classList.remove('drop');
    },
  });

  const dragProps = (c: CalCard) => ({
    draggable: !c.posted,
    onDragStart: (e: React.DragEvent) => { e.dataTransfer.setData('text/plain', c.id); e.dataTransfer.effectAllowed = 'move'; setDrag(c); },
    onDragEnd: () => setDrag(null),
  });

  return (
    <>
      <div className="row" style={{ marginTop: 18 }}>
        <Link className="btn ghost" href={`/content/calendar?m=${shiftMonth(month, -1)}`}>←</Link>
        <h2 className="cal-month">{MONTH_NAME(month)}</h2>
        <Link className="btn ghost" href={`/content/calendar?m=${shiftMonth(month, 1)}`}>→</Link>
        <span className="sp" />
        <span className="src">
          <span className="cal-key cal-key-idea" /> idea&nbsp;&nbsp;
          <span className="cal-key cal-key-sched" /> scheduled&nbsp;&nbsp;
          <span className="cal-key cal-key-posted" /> posted
        </span>
      </div>

      <div className="cal">
        {WEEKDAYS.map((w) => <div key={w} className="cal-wd">{w}</div>)}
        {days.map(({ date, inMonth }) => {
          const dayCards = items.filter((c) => c.date === date);
          return (
            <div key={date} className={`cal-day${inMonth ? '' : ' out'}${date === today ? ' today' : ''}`} {...cellProps(date)}>
              <span className="cal-num">{Number(date.slice(8))}</span>
              <button
                type="button"
                className="cal-add"
                title="Place an idea on this day"
                onClick={() => setPick(pick === date ? null : date)}
              >+</button>
              {pick === date ? (
                <div className="cal-pick">
                  {looseIdeas.length ? looseIdeas.map((c) => (
                    <button key={c.id} type="button" className="cal-pick-row" onClick={() => { drop(c, date); setPick(null); }}>
                      <Dot goal={c.goal} />
                      <span className="cal-pill-t">{c.title}</span>
                    </button>
                  )) : <span className="cal-pick-empty">No unscheduled ideas</span>}
                </div>
              ) : null}
              {dayCards.map((c) => c.kind === 'idea' ? (
                <span
                  key={c.id}
                  className="cal-pill idea"
                  {...dragProps(c)}
                  title={`${c.title} · planned idea — drag to move, drop on a tray to unschedule`}
                >
                  <Dot goal={c.goal} />
                  <span className="cal-pill-t">{c.title}</span>
                </span>
              ) : (
                <Link
                  key={c.id}
                  href={`/content/${c.id}`}
                  className={`cal-pill ${c.posted ? 'posted' : 'sched'}`}
                  {...dragProps(c)}
                  title={`${c.title}${c.posted ? ' · posted' : ' · scheduled — drag to reschedule'}`}
                >
                  <Dot goal={c.goal} />
                  <span className="cal-pill-t">{c.title}</span>
                </Link>
              ))}
            </div>
          );
        })}
      </div>

      <div className="row" style={{ marginTop: 16 }}>
        <h2 className="sec" style={{ margin: 0 }}>Unscheduled — Ready to Post</h2>
      </div>
      <div className="cal-tray" {...cellProps(null)}>
        {unscheduled.length ? unscheduled.map((c) => (
          <Link
            key={c.id}
            href={`/content/${c.id}`}
            className="cal-pill sched"
            {...dragProps(c)}
            title={`${c.title} — drag onto a day to schedule`}
          >
            <Dot goal={c.goal} />
            <span className="cal-pill-t">{c.title}</span>
          </Link>
        )) : <span className="src">Nothing waiting — pieces in Ready to Post without a date land here. Drop a scheduled card here to unschedule it.</span>}
      </div>

      <div className="row" style={{ marginTop: 16 }}>
        <h2 className="sec" style={{ margin: 0 }}>Ideas — not yet planned</h2>
      </div>
      <div className="cal-tray" {...cellProps(null)}>
        {looseIdeas.length ? looseIdeas.map((c) => (
          <span
            key={c.id}
            className="cal-pill idea"
            {...dragProps(c)}
            title={`${c.title} — drag onto a day to plan it`}
          >
            <Dot goal={c.goal} />
            <span className="cal-pill-t">{c.title}</span>
          </span>
        )) : <span className="src">No unplanned ideas — everything on the board is either placed on a day or already in production.</span>}
      </div>
    </>
  );
}
