import Link from 'next/link';
import { getThreads, getMessages, getIdeas, getPieces } from '@/lib/db.mjs';
import { provider } from '@/lib/mode.mjs';
import { createThreadAction, deleteThreadAction, developIdeaAction, suggestIdeasAction, dismissIdeaAction, ideateIdeaAction } from './actions';
import { SubmitButton } from '../content/pending';

export const dynamic = 'force-dynamic';

export default async function OrbitPage() {
  const threads = getThreads();
  const ideas = getIdeas();
  const accepted = new Set(getPieces().map((p: any) => String(p.ideaId)));
  const pitches = ideas.filter((i: any) => i.suggested && !accepted.has(i.id));

  return (
    <>
      <h1>Orbit</h1>
      <p className="lead">Research threads for deep dives — or let Orbit pitch you starting points. When an idea crystallizes it lands on the board.</p>
      <div className="row">
        <form action={createThreadAction} className="row" style={{ flex: 1 }}>
          <input className="title" style={{ flex: 1, margin: 0, fontSize: 15 }} name="title" placeholder="What do you want to research?" />
          <SubmitButton className="primary" busy="creating…">New thread →</SubmitButton>
        </form>
        <span className="src">{provider().kind === 'offline' ? 'offline — add an API key in Settings for live research' : provider().kind === 'free' ? 'live: Gemini (free tier)' : 'live: Claude + web search'}</span>
      </div>

      <div className="row" style={{ marginTop: 28 }}>
        <h2 className="sec" style={{ margin: 0 }}>Orbit's pitches</h2>
        <span className="sp" />
        <form action={suggestIdeasAction}>
          <SubmitButton busy="✨ pitching…">✨ Pitch me 3 ideas</SubmitButton>
        </form>
      </div>
      {pitches.length ? (
        <div className="board" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginTop: 12 }}>
          {pitches.map((i: any) => (
            <div key={i.id} className="card">
              <div className="row">
                <span className="label">orbit pitch</span>
                <span className="sp" />
                <form action={dismissIdeaAction}>
                  <input type="hidden" name="ideaId" value={i.id} />
                  <SubmitButton className="ghost" busy="…" title="Dismiss this pitch">✕</SubmitButton>
                </form>
              </div>
              <h3>{i.title}</h3>
              <div className="meta">{i.angle}</div>
              <div className="meta" style={{ color: '#cfc7e6' }}>“{i.hook}”</div>
              <div className="row" style={{ gap: 8 }}>
                <form action={ideateIdeaAction}>
                  <input type="hidden" name="ideaId" value={i.id} />
                  <SubmitButton busy="opening thread…" title="Riff on this idea with Orbit before committing it">💬 Ideate</SubmitButton>
                </form>
                <form action={developIdeaAction}>
                  <input type="hidden" name="ideaId" value={i.id} />
                  <SubmitButton className="primary" busy="accepting…">Develop →</SubmitButton>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty" style={{ marginTop: 12 }}>No pitches yet — hit ✨ and Orbit will propose a few post ideas to get you started. They also land in the board's Research column.</div>
      )}

      <h2 className="sec" style={{ marginTop: 30 }}>Research threads</h2>
      <div className="grid" style={{ marginTop: 12 }}>
        {threads.length === 0 ? (
          <div className="empty">No research threads yet — start one above.</div>
        ) : (
          threads.map((t: any) => {
            const msgs = getMessages(t.id);
            const spawned = ideas.filter((i: any) => i.threadId === t.id).length;
            return (
              <div key={t.id} className="card">
                <div className="row">
                  <Link href={`/orbit/${t.id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}>
                    <h3 style={{ margin: 0 }}>{t.title}</h3>
                  </Link>
                  {spawned ? <span className="badge review">{spawned} idea{spawned > 1 ? 's' : ''}</span> : null}
                  <form action={deleteThreadAction}>
                    <input type="hidden" name="threadId" value={t.id} />
                    <SubmitButton className="ghost" busy="…" title="Delete this thread">✕</SubmitButton>
                  </form>
                </div>
                <div className="meta" style={{ marginBottom: 0, marginTop: 6 }}>
                  {msgs.length} message{msgs.length === 1 ? '' : 's'} · updated {new Date(t.updatedAt).toLocaleDateString()}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
