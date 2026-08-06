'use client';
// Month-grid content calendar. Server page hands slim card DTOs; this owns the
// grid math, drag-to-reschedule (native HTML5, same pattern as the board), and
// optimistic updates. Posted pieces are pinned — only scheduled ones drag.
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { schedulePieceAction } from '../actions';

export type CalCard = {
  id: string;
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

export function Calendar({ month, cards }: { month: string; cards: CalCard[] }) {
  const router = useRouter();
  const [items, setItems] = useState(cards);
  const [drag, setDrag] = useState<CalCard | null>(null);
  const [, startTransition] = useTransition();
  useEffect(() => setItems(cards), [cards]);

  const today = new Date().toISOString().slice(0, 10);
  const days = gridDays(month);
  const unscheduled = items.filter((c) => !c.date && c.stage === 'ready');

  function drop(card: CalCard, date: string | null) {
    if (card.posted) return;
    setItems((all) => all.map((c) => (c.id === card.id ? { ...c, date } : c)));
    startTransition(async () => {
      await schedulePieceAction(card.id, date || '');
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

  return (
    <>
      <div className="row" style={{ marginTop: 18 }}>
        <Link className="btn ghost" href={`/content/calendar?m=${shiftMonth(month, -1)}`}>←</Link>
        <h2 className="cal-month">{MONTH_NAME(month)}</h2>
        <Link className="btn ghost" href={`/content/calendar?m=${shiftMonth(month, 1)}`}>→</Link>
        <span className="sp" />
        <span className="src">
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
              {dayCards.map((c) => (
                <Link
                  key={c.id}
                  href={`/content/${c.id}`}
                  className={`cal-pill ${c.posted ? 'posted' : 'sched'}`}
                  draggable={!c.posted}
                  onDragStart={(e) => { e.dataTransfer.setData('text/plain', c.id); e.dataTransfer.effectAllowed = 'move'; setDrag(c); }}
                  onDragEnd={() => setDrag(null)}
                  title={`${c.title}${c.posted ? ' · posted' : ' · scheduled — drag to reschedule'}`}
                >
                  {c.goal ? <span className="cal-dot" style={{ background: GOAL_DOT[c.goal] }} /> : null}
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
            draggable
            onDragStart={(e) => { e.dataTransfer.setData('text/plain', c.id); e.dataTransfer.effectAllowed = 'move'; setDrag(c); }}
            onDragEnd={() => setDrag(null)}
            title={`${c.title} — drag onto a day to schedule`}
          >
            {c.goal ? <span className="cal-dot" style={{ background: GOAL_DOT[c.goal] }} /> : null}
            <span className="cal-pill-t">{c.title}</span>
          </Link>
        )) : <span className="src">Nothing waiting — pieces in Ready to Post without a date land here. Drop a scheduled card here to unschedule it.</span>}
      </div>
    </>
  );
}
