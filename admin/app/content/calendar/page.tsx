import { getPieces } from '@/lib/db.mjs';
import { Calendar, type CalCard } from './calendar';

export const dynamic = 'force-dynamic';

// A piece shows on the calendar by its posted date (shipped) or its target
// post date (scheduled). Ready pieces with no date wait in the tray.
function toCard(p: any): CalCard {
  return {
    id: p.id,
    title: p.title,
    stage: p.status,
    goal: p.goal || null,
    brand: p.brand || null,
    date: p.status === 'posted'
      ? (p.postedAt || '').slice(0, 10) || null
      : p.postAt || null,
    posted: p.status === 'posted',
  };
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(m || '') ? (m as string) : new Date().toISOString().slice(0, 7);

  const pieces = getPieces().filter((p: any) => p.builtAt);
  const cards = pieces.map(toCard);

  return (
    <>
      <h1>Content calendar</h1>
      <p className="lead">Scheduled and posted pieces by date. Drag a card between days to reschedule — unscheduled Ready pieces wait in the tray below.</p>
      <Calendar month={month} cards={cards} />
    </>
  );
}
