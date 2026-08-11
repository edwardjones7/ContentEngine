import { getPieces, getIdeas, getCalNotes } from '@/lib/db.mjs';
import { Calendar, type CalCard } from './calendar';

export const dynamic = 'force-dynamic';

// A piece shows on the calendar by its posted date (shipped) or its target
// post date (scheduled). Ready pieces with no date wait in the tray.
function toCard(p: any): CalCard {
  return {
    id: p.id,
    kind: 'piece',
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

// Unaccepted ideas can be planned onto a date too; accepting the idea later
// carries the date onto the piece, so the pill just changes flavor.
function toIdeaCard(i: any): CalCard {
  return {
    id: i.id,
    kind: 'idea',
    title: i.title,
    stage: 'idea',
    goal: i.goal || null,
    brand: i.brand || null,
    date: i.postAt || null,
    posted: false,
  };
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(m || '') ? (m as string) : new Date().toISOString().slice(0, 7);

  const allPieces = await getPieces();
  const accepted = new Set(allPieces.map((p: any) => String(p.ideaId)));
  const ideas = (await getIdeas()).filter((i: any) => !accepted.has(i.id));
  const cards = [...allPieces.map(toCard), ...ideas.map(toIdeaCard)];
  const notes = await getCalNotes();

  return (
    <>
      <h1>Content calendar</h1>
      <p className="lead">Everything in the pipeline by date. Click a day's + to place any idea or piece, file a new idea, or jot a note; drag cards between days to reschedule.</p>
      <Calendar month={month} cards={cards} notes={notes} />
    </>
  );
}
