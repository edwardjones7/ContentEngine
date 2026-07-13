// Streaming chat endpoint (a route handler because server actions can't
// stream). Emits NDJSON lines of simplified UI events from lib/orbit/chat.mjs.
import { getThread } from '@/lib/db.mjs';
import { chatTurn } from '@/lib/orbit/chat.mjs';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  if (!getThread(threadId)) return new Response('thread not found', { status: 404 });

  const { text } = await req.json();
  if (!text || !String(text).trim()) return new Response('empty message', { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (ev: unknown) => controller.enqueue(encoder.encode(JSON.stringify(ev) + '\n'));
      try {
        for await (const ev of chatTurn(threadId, String(text))) emit(ev);
      } catch (e: any) {
        console.warn('[orbit chat]', e);
        emit({ type: 'error', message: e?.message || 'chat failed' });
        emit({ type: 'done' });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-cache' },
  });
}
