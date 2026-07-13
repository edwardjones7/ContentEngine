import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getThread, getMessages, getIdeas, getPieces } from '@/lib/db.mjs';
import { provider } from '@/lib/mode.mjs';
import { renameThreadAction } from '../actions';
import Chat from './chat';

export const dynamic = 'force-dynamic';

export default async function ThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const thread: any = getThread(threadId);
  if (!thread) notFound();

  const messages = getMessages(threadId);
  const threadIdeas = getIdeas().filter((i: any) => i.threadId === threadId);
  const accepted = new Set<string>(getPieces().map((p: any) => String(p.ideaId)));

  return (
    <>
      <div className="row"><Link className="src" href="/orbit">← threads</Link></div>
      <div className="row" style={{ margin: '6px 0 4px' }}>
        <form action={renameThreadAction} className="row" style={{ flex: 1 }}>
          <input type="hidden" name="threadId" value={thread.id} />
          <input className="title" name="title" defaultValue={thread.title} style={{ flex: 1, margin: 0 }} />
          <button type="submit">Rename</button>
        </form>
        <span className="mode">{provider().label}</span>
      </div>
      <p className="lead">Research with Orbit. When an idea crystallizes, Orbit files it — it shows up here and in the Research column.</p>

      <Chat threadId={thread.id} messages={messages} ideas={threadIdeas} acceptedIdeaIds={[...accepted]} />
    </>
  );
}
