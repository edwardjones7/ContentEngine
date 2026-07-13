// Orbit chat turn — the agent loop behind /api/orbit/[threadId]. Mirrors the
// live/offline dispatch in content/pipeline.mjs: no key → canned reply so the
// plumbing (streaming, persistence, UI) is testable keyless.
//
// chatTurn() is an async generator of simplified UI events the route re-emits
// as NDJSON: {type:'text',delta} {type:'search',query} {type:'sources',results}
// {type:'citation',citation} {type:'idea',idea} {type:'error',message} {type:'done'}
import { id, addMessage, getMessages, getIdea, addIdea } from '../db.mjs';
import { activeProvider } from '../settings.mjs';
import { streamMessages, createAccumulator } from './anthropic-stream.mjs';
import { geminiChatTurn } from './gemini-chat.mjs';
import { orbitSystem, PROPOSE_IDEA_TOOL } from './persona.mjs';

const CHAT_MODEL = 'claude-sonnet-4-6'; // paid research chat — swap to claude-opus-4-8 if depth disappoints
const WEB_SEARCH_TOOL = { type: 'web_search_20260209', name: 'web_search', max_uses: 5 };
const MAX_TURNS = 8;

const now = () => new Date().toISOString();

function persist(threadId, role, content) {
  return addMessage({ id: id('msg'), threadId, role, content, createdAt: now() });
}

function slugifyIdeaId(title) {
  const base = 'idea-' + String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
  let iid = base, n = 2;
  while (getIdea(iid)) iid = `${base}-${n++}`;
  return iid;
}

// Rows written by the Gemini provider carry blocks Anthropic would reject
// (synthesized search blocks, Gemini-shaped citations) — strip those and keep
// the conversation substance (text, propose_idea calls/results).
function sanitizeForAnthropic(m) {
  if (m.provider !== 'gemini') return { role: m.role, content: m.content };
  const content = (m.content || [])
    .filter((b) => ['text', 'tool_use', 'tool_result'].includes(b.type))
    .map((b) => (b.type === 'text' ? { type: 'text', text: b.text } : b));
  return content.length ? { role: m.role, content } : null;
}

export async function* chatTurn(threadId, userText) {
  persist(threadId, 'user', [{ type: 'text', text: userText }]);

  const p = activeProvider();

  if (p.kind === 'free') {
    yield* geminiChatTurn(threadId);
    return;
  }

  if (p.kind !== 'paid') {
    const canned =
      "I'm running offline — Orbit's live research chat needs an API key. Open Settings (top right) and add a free Gemini key or a paid Claude key, and I can dig into the web, cite sources, and file ideas straight to your board. (This exchange was still saved to the thread.)";
    for (const word of canned.split(/(?<= )/)) yield { type: 'text', delta: word };
    persist(threadId, 'assistant', [{ type: 'text', text: canned }]);
    yield { type: 'done' };
    return;
  }

  // Replay is verbatim: every API-level message (including tool turns) is a db row.
  const messages = getMessages(threadId).map(sanitizeForAnthropic).filter(Boolean);

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const acc = createAccumulator();
    for await (const ev of streamMessages({
      model: CHAT_MODEL,
      max_tokens: 8000,
      system: orbitSystem(),
      tools: [WEB_SEARCH_TOOL, PROPOSE_IDEA_TOOL],
      messages,
    })) {
      acc.push(ev);
      if (ev.type === 'content_block_delta') {
        if (ev.delta.type === 'text_delta') yield { type: 'text', delta: ev.delta.text };
        else if (ev.delta.type === 'citations_delta') yield { type: 'citation', citation: pickCitation(ev.delta.citation) };
      } else if (ev.type === 'content_block_start' && ev.content_block?.type === 'web_search_tool_result') {
        yield { type: 'sources', results: pickSources(ev.content_block) };
      } else if (ev.type === 'content_block_stop') {
        const b = acc.blocks[ev.index];
        if (b?.type === 'server_tool_use' && b.name === 'web_search') yield { type: 'search', query: b.input?.query || '' };
      }
    }

    const blocks = acc.blocks.filter(Boolean);
    const assistantRow = persist(threadId, 'assistant', blocks);
    messages.push({ role: 'assistant', content: blocks });

    if (acc.stopReason === 'pause_turn') continue; // server tool still running — re-request

    if (acc.stopReason === 'tool_use') {
      const results = [];
      for (const b of blocks) {
        if (b.type !== 'tool_use' || b.name !== 'propose_idea') continue;
        const { title, angle, hook, source, evidence } = b.input || {};
        if (!title || !angle || !hook) {
          results.push({ type: 'tool_result', tool_use_id: b.id, is_error: true, content: 'Rejected: title, angle, and hook are all required.' });
          continue;
        }
        const idea = addIdea({
          id: slugifyIdeaId(title),
          title, angle, hook,
          source: source || 'thread',
          threadId,
          messageId: assistantRow.id,
          toolUseId: b.id,
          citations: (evidence || []).map((e) => ({ url: e.url, title: e.note || e.url })),
        });
        yield { type: 'idea', idea };
        results.push({ type: 'tool_result', tool_use_id: b.id, content: `Saved as ${idea.id}. It now appears in the Research column and as a card in this thread.` });
      }
      const userRow = { role: 'user', content: results };
      persist(threadId, 'user', results);
      messages.push(userRow);
      continue;
    }

    if (acc.stopReason === 'max_tokens') yield { type: 'error', message: 'Orbit hit the response length limit — the reply may be cut off.' };
    yield { type: 'done' };
    return;
  }
  yield { type: 'error', message: 'Orbit stopped after too many tool rounds in one turn.' };
  yield { type: 'done' };
}

// Trim API objects down to what the UI renders.
function pickCitation(c) {
  return { url: c?.url, title: c?.title || c?.url, cited_text: c?.cited_text };
}
function pickSources(block) {
  const items = Array.isArray(block.content) ? block.content : [];
  return items.filter((r) => r?.url).map((r) => ({ url: r.url, title: r.title || r.url }));
}
