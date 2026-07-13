import { ensureIdeas } from '@/lib/service.mjs';
import { getPieces } from '@/lib/db.mjs';
import { provider } from '@/lib/mode.mjs';
import { Column, IdeaCard, PieceRow } from './parts';
import { researchAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function ContentPage() {
  const ideas = await ensureIdeas();
  const pieces = getPieces();
  const accepted = new Set(pieces.map((p: any) => p.ideaId));

  const research = ideas.filter((i: any) => !accepted.has(i.id));
  const building = pieces.filter((p: any) => p.status === 'building');
  const review = pieces.filter((p: any) => p.status === 'review' || p.status === 'draft');
  const published = pieces.filter((p: any) => p.status === 'published');

  return (
    <>
      <h1>Content pipeline</h1>
      <p className="lead">Research → Build → Review. Chat with <a href="/orbit" style={{ color: 'var(--accent2)' }}>Orbit</a> to develop ideas, or accept one below — then fan it out into the mediums you pick.</p>
      <div className="row">
        <form action={researchAction}><button type="submit">↻ Refresh research</button></form>
        <span className="src">{provider().kind === 'offline' ? 'offline: seeded ideas (add an API key in Settings to go live)' : `live research via ${provider().kind === 'free' ? 'Gemini + Google Search' : 'Claude + web search'}`}</span>
      </div>

      <div className="board">
        <Column title="Research" count={research.length} empty="No ideas yet — chat with Orbit to develop one, or hit ↻ Refresh research.">
          {research.map((i: any) => <IdeaCard key={i.id} idea={i} />)}
        </Column>
        <Column title="Building" count={building.length} empty="Accept an idea to start building.">
          {building.map((p: any) => <PieceRow key={p.id} p={p} />)}
        </Column>
        <Column title="Review" count={review.length} empty="Built pieces land here for review.">
          {review.map((p: any) => <PieceRow key={p.id} p={p} />)}
        </Column>
        <Column title="Published" count={published.length} empty="Nothing published yet.">
          {published.map((p: any) => <PieceRow key={p.id} p={p} />)}
        </Column>
      </div>
    </>
  );
}
