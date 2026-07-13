// Minimal streaming client for the Anthropic Messages API — raw fetch + SSE
// parsing, same zero-dependency stance as providers.mjs. Two pieces:
//   streamMessages(body) — async generator of parsed stream events
//   createAccumulator()  — folds events back into content blocks for persistence
import { anthropicKey } from '../settings.mjs';

export async function* streamMessages(body) {
  const key = anthropicKey();
  if (!key) throw new Error('no Anthropic API key — add one in Settings');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ ...body, stream: true }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`);

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
      if (!line.startsWith('data:')) continue; // event: lines are redundant — data carries a type field
      const data = line.slice(5).trim();
      if (!data) continue;
      const ev = JSON.parse(data);
      if (ev.type === 'error') throw new Error(`Claude stream error: ${ev.error?.message || data}`);
      yield ev;
    }
  }
}

// Rebuilds the assistant message's content[] from stream events. Blocks come out
// in API shape (tool_use has parsed `input`), so they persist and replay verbatim.
export function createAccumulator() {
  const blocks = [];
  const partialJson = new Map(); // index -> accumulating input_json_delta string
  let stopReason = null;

  return {
    blocks,
    get stopReason() { return stopReason; },
    push(ev) {
      if (ev.type === 'content_block_start') {
        blocks[ev.index] = structuredClone(ev.content_block);
        if ('input' in (ev.content_block || {})) partialJson.set(ev.index, '');
      } else if (ev.type === 'content_block_delta') {
        const b = blocks[ev.index];
        const d = ev.delta;
        if (d.type === 'text_delta') b.text = (b.text || '') + d.text;
        else if (d.type === 'input_json_delta') partialJson.set(ev.index, partialJson.get(ev.index) + d.partial_json);
        else if (d.type === 'citations_delta') (b.citations ||= []).push(d.citation);
      } else if (ev.type === 'content_block_stop') {
        if (partialJson.has(ev.index)) {
          const raw = partialJson.get(ev.index);
          blocks[ev.index].input = raw ? JSON.parse(raw) : {};
          partialJson.delete(ev.index);
        }
      } else if (ev.type === 'message_delta') {
        stopReason = ev.delta?.stop_reason ?? stopReason;
      }
    },
  };
}
