// FREE-tier Orbit chat — Gemini with Google Search grounding + propose_idea
// function calling (Gemini 3+ supports combining both in one request).
//
// Persistence strategy: each assistant row stores BOTH
//   content — our canonical block vocabulary (text/citations, synthesized
//             search blocks, tool_use) so the chat UI renders identically
//             across providers, and
//   raw     — Gemini's native parts verbatim (incl. thoughtSignature, which
//             Gemini 3 requires echoed back on function-calling turns) so
//             replay to Gemini is lossless.
import { id, addMessage, getMessages, getIdea, addIdea } from '../db.mjs';
import { geminiKey } from '../settings.mjs';
import { BASE, GEMINI_CHAIN, isRetryable, friendlyGeminiError } from '../content/gemini.mjs';
import { orbitSystem, PROPOSE_IDEA_TOOL } from './persona.mjs';
const MAX_TURNS = 8;
const now = () => new Date().toISOString();

function persist(threadId, role, content, raw) {
  return addMessage({ id: id('msg'), threadId, role, content, raw, provider: 'gemini', createdAt: now() });
}

function slugifyIdeaId(title) {
  const base = 'idea-' + String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
  let iid = base, n = 2;
  while (getIdea(iid)) iid = `${base}-${n++}`;
  return iid;
}

// Rebuild Gemini `contents` from stored rows. Gemini-native rows replay their
// raw parts verbatim; rows from other providers are rebuilt from canonical
// blocks (search blocks dropped — grounding is server-side).
function toContents(rows) {
  const contents = [];
  for (const m of rows) {
    const role = m.role === 'assistant' ? 'model' : 'user';
    if (Array.isArray(m.raw) && m.raw.length) {
      contents.push({ role, parts: m.raw });
      continue;
    }
    const parts = [];
    for (const b of m.content || []) {
      if (b.type === 'text' && b.text) parts.push({ text: b.text });
      else if (b.type === 'tool_use' && b.name === 'propose_idea') parts.push({ functionCall: { name: 'propose_idea', args: b.input || {} } });
      else if (b.type === 'tool_result') parts.push({ functionResponse: { name: 'propose_idea', response: { result: String(b.content || 'ok') } } });
    }
    if (parts.length) contents.push({ role, parts });
  }
  return contents;
}

// Google Search grounding has its own (often zero) quota on free-tier keys —
// when a grounded request 429s but the same model works ungrounded, remember
// that for a while so we stop burning a doomed request every turn.
let groundingBlockedUntil = 0;
const groundingBlocked = () => Date.now() < groundingBlockedUntil;

// Open a stream on the first model in the chain that accepts the request.
// Grounding degrades before the model does: grounded 429 → retry the same
// model without google_search; only then move down the chain.
async function openStream(baseBody, contents) {
  const key = geminiKey();
  if (!key) throw new Error('no Gemini API key — add one in Settings');

  const attempt = async (model, grounded) => {
    const tools = grounded
      ? [{ google_search: {} }, { function_declarations: baseBody._functions }]
      : [{ function_declarations: baseBody._functions }];
    const res = await fetch(`${BASE}/${model}:streamGenerateContent?alt=sse`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ systemInstruction: baseBody.systemInstruction, generationConfig: baseBody.generationConfig, tools, contents }),
    });
    if (res.ok) return { res };
    const errBody = await res.text();
    if (!isRetryable(res.status, errBody)) throw new Error(`Gemini ${res.status}: ${errBody}`);
    return { retryable: `${model}${grounded ? '+search' : ''}: ${res.status}` };
  };

  let lastErr = 'unknown';
  for (const { model } of GEMINI_CHAIN) {
    if (!groundingBlocked()) {
      const grounded = await attempt(model, true);
      if (grounded.res) return { res: grounded.res, model, searchActive: true };
      lastErr = grounded.retryable;
      const bare = await attempt(model, false);
      if (bare.res) {
        // grounded failed but the bare model works → grounding quota is the problem
        groundingBlockedUntil = Date.now() + 15 * 60 * 1000;
        console.warn(`[orbit chat] search grounding quota exhausted — running ${model} without live search for 15min`);
        return { res: bare.res, model, searchActive: false };
      }
      lastErr = bare.retryable;
    } else {
      const bare = await attempt(model, false);
      if (bare.res) return { res: bare.res, model, searchActive: false };
      lastErr = bare.retryable;
    }
    console.warn(`[orbit chat] ${model} unavailable (${lastErr}), trying next model`);
  }
  throw friendlyGeminiError(lastErr);
}

async function* readStream(res) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).replace(/\r$/, '');
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data) yield JSON.parse(data);
    }
  }
}

export async function* geminiChatTurn(threadId) {
  const contents = toContents(getMessages(threadId));

  const body = {
    systemInstruction: { parts: [{ text: orbitSystem() }] },
    _functions: [{ name: PROPOSE_IDEA_TOOL.name, description: PROPOSE_IDEA_TOOL.description, parameters: PROPOSE_IDEA_TOOL.input_schema }],
    generationConfig: { maxOutputTokens: 8000 },
  };

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const rawParts = [];
    let grounding = null;
    const seenQueries = new Set();

    // free-tier RPM windows are short — wait one out rather than failing the turn
    let opened;
    try {
      opened = await openStream(body, contents);
    } catch (e) {
      if (!e.rateLimited) throw e;
      yield { type: 'error', message: 'Free tier is rate-limited — waiting ~35s for the window to reset, hang tight…' };
      await new Promise((r) => setTimeout(r, 35000));
      opened = await openStream(body, contents);
    }
    const { res, searchActive } = opened;
    if (turn === 0 && !searchActive) {
      yield { type: 'error', message: 'Live web search is unavailable on this key’s free quota right now — answering from model knowledge instead.' };
    }
    for await (const chunk of readStream(res)) {
      const cand = chunk.candidates?.[0];
      if (!cand) continue;
      for (const part of cand.content?.parts || []) {
        if (part.text && !part.thought) {
          yield { type: 'text', delta: part.text };
          const last = rawParts[rawParts.length - 1];
          if (last?.text != null && !last.thought && !last.thoughtSignature) last.text += part.text;
          else rawParts.push({ ...part });
        } else {
          rawParts.push({ ...part }); // functionCall / thought — keep verbatim (thoughtSignature!)
        }
      }
      if (cand.groundingMetadata) {
        grounding = cand.groundingMetadata;
        for (const q of cand.groundingMetadata.webSearchQueries || []) {
          if (!seenQueries.has(q)) { seenQueries.add(q); yield { type: 'search', query: q }; }
        }
      }
    }

    // fold the turn into canonical blocks for rendering
    const blocks = [];
    for (const q of seenQueries) blocks.push({ type: 'server_tool_use', id: id('gs'), name: 'web_search', input: { query: q } });
    const sources = (grounding?.groundingChunks || [])
      .map((c) => ({ url: c.web?.uri, title: c.web?.title || c.web?.uri }))
      .filter((s) => s.url);
    if (sources.length) {
      blocks.push({ type: 'web_search_tool_result', tool_use_id: id('gs'), content: sources });
      yield { type: 'sources', results: sources };
    }
    const text = rawParts.filter((p) => p.text && !p.thought).map((p) => p.text).join('');
    if (text) {
      const citations = [];
      for (const sup of grounding?.groundingSupports || []) {
        for (const ci of sup.groundingChunkIndices || []) {
          const src = sources[ci];
          if (src && !citations.some((c) => c.url === src.url)) {
            const citation = { url: src.url, title: src.title, cited_text: sup.segment?.text?.slice(0, 200) };
            citations.push(citation);
            yield { type: 'citation', citation };
          }
        }
      }
      blocks.push({ type: 'text', text, ...(citations.length ? { citations } : {}) });
    }
    const calls = rawParts.filter((p) => p.functionCall);
    const callBlocks = calls.map((p) => ({ type: 'tool_use', id: id('fc'), name: p.functionCall.name, input: p.functionCall.args || {} }));
    blocks.push(...callBlocks);

    persist(threadId, 'assistant', blocks, rawParts);
    contents.push({ role: 'model', parts: rawParts });

    if (!calls.length) { yield { type: 'done' }; return; }

    // handle propose_idea calls, reply with functionResponse, and loop
    const resultBlocks = [];
    const responseParts = [];
    for (let i = 0; i < calls.length; i++) {
      const call = calls[i].functionCall;
      const toolUse = callBlocks[i];
      let result;
      if (call.name !== 'propose_idea') {
        result = `Unknown tool: ${call.name}`;
      } else {
        const { title, angle, hook, source, evidence } = call.args || {};
        if (!title || !angle || !hook) {
          result = 'Rejected: title, angle, and hook are all required.';
        } else {
          const idea = addIdea({
            id: slugifyIdeaId(title),
            title, angle, hook,
            source: source || 'thread',
            threadId,
            toolUseId: toolUse.id,
            citations: (evidence || []).map((e) => ({ url: e.url, title: e.note || e.url })),
          });
          yield { type: 'idea', idea };
          result = `Saved as ${idea.id}. It now appears in the Research column and as a card in this thread.`;
        }
      }
      resultBlocks.push({ type: 'tool_result', tool_use_id: toolUse.id, content: result });
      responseParts.push({ functionResponse: { name: call.name, response: { result } } });
    }
    persist(threadId, 'user', resultBlocks, responseParts);
    contents.push({ role: 'user', parts: responseParts });
  }
  yield { type: 'error', message: 'Orbit stopped after too many tool rounds in one turn.' };
  yield { type: 'done' };
}
