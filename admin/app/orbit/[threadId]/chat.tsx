'use client';
// Orbit chat surface. History comes server-rendered from db rows (verbatim
// Anthropic content blocks); the in-flight turn streams as NDJSON events from
// /api/orbit/[threadId] and is replaced by the authoritative server render on done.
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { developIdeaAction } from '../actions';

type StreamItem =
  | { kind: 'text'; text: string; citations: any[] }
  | { kind: 'search'; query: string }
  | { kind: 'sources'; results: any[] }
  | { kind: 'idea'; idea: any }
  | { kind: 'error'; message: string };

export default function Chat({ threadId, messages, ideas, acceptedIdeaIds }: {
  threadId: string; messages: any[]; ideas: any[]; acceptedIdeaIds: string[];
}) {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const [stream, setStream] = useState<StreamItem[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const accepted = new Set(acceptedIdeaIds);
  const ideaByToolUse = new Map(ideas.map((i) => [i.toolUseId, i]));

  // once the server render includes the finished turn, drop the local copy
  useEffect(() => { setPendingUser(null); setStream([]); }, [messages.length]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages.length, stream, pendingUser]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput(''); setBusy(true); setPendingUser(text); setStream([]);
    try {
      const res = await fetch(`/api/orbit/${threadId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok || !res.body) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (line.trim()) handleEvent(JSON.parse(line));
        }
      }
    } catch (e: any) {
      setStream((s) => [...s, { kind: 'error', message: e?.message || 'send failed' }]);
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  function handleEvent(ev: any) {
    setStream((s) => {
      const next = [...s];
      const last = next[next.length - 1];
      if (ev.type === 'text') {
        if (last?.kind === 'text') next[next.length - 1] = { ...last, text: last.text + ev.delta };
        else next.push({ kind: 'text', text: ev.delta, citations: [] });
      } else if (ev.type === 'citation') {
        if (last?.kind === 'text') next[next.length - 1] = { ...last, citations: [...last.citations, ev.citation] };
      } else if (ev.type === 'search') next.push({ kind: 'search', query: ev.query });
      else if (ev.type === 'sources') next.push({ kind: 'sources', results: ev.results });
      else if (ev.type === 'idea') next.push({ kind: 'idea', idea: ev.idea });
      else if (ev.type === 'error') next.push({ kind: 'error', message: ev.message });
      return next;
    });
  }

  return (
    <div className="chat">
      <div className="chat-log">
        {messages.length === 0 && !pendingUser ? (
          <div className="empty">Ask Orbit anything — pain points, trends, competitors, angles. Try “what are contractors complaining about this month?”</div>
        ) : null}
        {messages.map((m) => <MessageRow key={m.id} m={m} ideaByToolUse={ideaByToolUse} accepted={accepted} />)}
        {pendingUser ? <div className="msg user"><div className="bubble">{pendingUser}</div></div> : null}
        {stream.length > 0 || busy ? (
          <div className="msg assistant">
            <div className="who">orbit</div>
            {stream.map((it, i) => <StreamPart key={i} it={it} accepted={accepted} />)}
            {busy ? <div className="thinking">●●●</div> : null}
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      <div className="composer">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={busy ? 'Orbit is working…' : 'Message Orbit  (Enter to send, Shift+Enter for a new line)'}
          disabled={busy}
          rows={2}
        />
        <button className="primary" onClick={send} disabled={busy || !input.trim()}>Send</button>
      </div>
    </div>
  );
}

// --- persisted history -------------------------------------------------------

function MessageRow({ m, ideaByToolUse, accepted }: { m: any; ideaByToolUse: Map<string, any>; accepted: Set<string> }) {
  const blocks = Array.isArray(m.content) ? m.content : [{ type: 'text', text: String(m.content) }];
  if (m.role === 'user') {
    const texts = blocks.filter((b: any) => b.type === 'text');
    if (!texts.length) return null; // tool_result rows are plumbing, not conversation
    return <div className="msg user"><div className="bubble">{texts.map((b: any) => b.text).join('\n')}</div></div>;
  }
  const visible = blocks.filter((b: any) => ['text', 'server_tool_use', 'web_search_tool_result', 'tool_use'].includes(b.type));
  if (!visible.length) return null;
  return (
    <div className="msg assistant">
      <div className="who">orbit</div>
      {visible.map((b: any, i: number) => {
        if (b.type === 'text') return <AssistantText key={i} text={b.text} citations={b.citations || []} />;
        if (b.type === 'server_tool_use') return b.name === 'web_search' ? <div key={i} className="activity">🔎 searched: {b.input?.query}</div> : null;
        if (b.type === 'web_search_tool_result') return <Sources key={i} results={(Array.isArray(b.content) ? b.content : []).filter((r: any) => r?.url)} />;
        if (b.type === 'tool_use' && b.name === 'propose_idea') {
          const idea = ideaByToolUse.get(b.id) || { id: null, ...b.input };
          return <IdeaCard key={i} idea={idea} accepted={accepted} />;
        }
        return null;
      })}
    </div>
  );
}

// --- shared parts ------------------------------------------------------------

function AssistantText({ text, citations }: { text: string; citations: any[] }) {
  const unique = [...new Map(citations.filter((c) => c?.url).map((c) => [c.url, c])).values()];
  return (
    <div className="bubble">
      <div style={{ whiteSpace: 'pre-wrap' }}>{text}</div>
      {unique.length ? (
        <div className="citations">
          {unique.map((c, i) => <a key={c.url} className="chip" href={c.url} target="_blank" rel="noreferrer" title={c.cited_text || c.url}>{i + 1} · {host(c.url)}</a>)}
        </div>
      ) : null}
    </div>
  );
}

function Sources({ results }: { results: any[] }) {
  if (!results.length) return null;
  return (
    <details className="sources">
      <summary>{results.length} source{results.length > 1 ? 's' : ''}</summary>
      {results.map((r) => <a key={r.url} href={r.url} target="_blank" rel="noreferrer">{r.title || r.url}</a>)}
    </details>
  );
}

function IdeaCard({ idea, accepted }: { idea: any; accepted: Set<string> }) {
  const inPipeline = idea.id && accepted.has(idea.id);
  return (
    <div className="card idea-card">
      <div className="row"><span className="label">idea filed</span><span className="sp" />{idea.source ? <span className="src">{idea.source}</span> : null}</div>
      <h3>{idea.title}</h3>
      <div className="meta">{idea.angle}</div>
      <div className="meta" style={{ color: '#cfc7e6' }}>“{idea.hook}”</div>
      {inPipeline ? (
        <Link className="btn" href="/content">In pipeline →</Link>
      ) : idea.id ? (
        <form action={developIdeaAction}><input type="hidden" name="ideaId" value={idea.id} /><button className="primary" type="submit">Develop this idea →</button></form>
      ) : (
        <span className="src">saved to Research column</span>
      )}
    </div>
  );
}

function StreamPart({ it, accepted }: { it: StreamItem; accepted: Set<string> }) {
  if (it.kind === 'text') return <AssistantText text={it.text} citations={it.citations} />;
  if (it.kind === 'search') return <div className="activity">🔎 searching: {it.query}</div>;
  if (it.kind === 'sources') return <Sources results={it.results} />;
  if (it.kind === 'idea') return <IdeaCard idea={it.idea} accepted={accepted} />;
  return <div className="activity error">⚠ {it.message}</div>;
}

const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
