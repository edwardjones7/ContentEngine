import { ensureIdeas } from '@/lib/service.mjs';
import { getPieces } from '@/lib/db.mjs';
import { MODE } from '@/lib/mode.mjs';
import { PieceRow } from './parts';
import { generateAction, researchAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function ContentPage() {
  const ideas = await ensureIdeas();
  const pieces = getPieces().slice(0, 4);
  return (
    <>
      <h1>Content ideas</h1>
      <p className="lead">Research-grounded angles in the Elenos voice. Pick one — it becomes a blog draft + a swipeable carousel.</p>
      <div className="row">
        <form action={researchAction}><button type="submit">↻ Refresh research</button></form>
        <span className="src">{MODE === 'live' ? 'live: Claude + research' : 'offline: seeded ideas (set ANTHROPIC_API_KEY to go live)'}</span>
      </div>
      <div className="grid cols2" style={{ marginTop: 16 }}>
        {ideas.map((i: any) => (
          <div className="card" key={i.id}>
            <div className="row"><span className="label">{i.source || 'idea'}</span><span className="sp" />{i.carouselFile ? null : <span className="src">novel · templated</span>}</div>
            <h3>{i.title}</h3>
            <div className="meta">{i.angle}</div>
            <div className="meta" style={{ color: '#cfc7e6' }}>“{i.hook}”</div>
            <form action={generateAction}><input type="hidden" name="ideaId" value={i.id} /><button className="primary" type="submit">Generate piece →</button></form>
          </div>
        ))}
      </div>
      {pieces.length ? (<><h2 className="sec">Recent pieces</h2><div className="grid">{pieces.map((p: any) => <PieceRow key={p.id} p={p} />)}</div></>) : null}
    </>
  );
}
