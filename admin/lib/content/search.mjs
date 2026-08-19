// Live web search, independent of which LLM is driving. Both callers — the
// Orbit `web_search` tool and anything that wants sources for research — get
// the same `{ summary, sources, via }` back no matter who served it.
//
// Why this exists: Gemini's Google Search grounding is the cheapest backend
// (it rides the chat request) but free-tier keys are routinely given ZERO
// grounding quota, so every grounded call 429s while the same model answers
// fine ungrounded. That left Orbit ideating with no live sources at all.
//
// Chain: Gemini grounding → Tavily → give up. Every backend is optional; with
// no keys at all `search()` throws `searchUnavailable` and callers degrade to
// model knowledge exactly as before. Adding a backend = one function + one
// entry in BACKENDS, same shape as the provider router in pipeline.mjs.
import { searchGrounded } from './gemini.mjs';
import { geminiKey, tavilyKey } from '../settings.mjs';

// A grounded 429 means the *grounding* quota is gone, not the key — the same
// model still answers ungrounded. Remember it so we stop paying a doomed
// round-trip on every turn. Mirrors the window in orbit/gemini-chat.mjs.
const BLOCK_MS = 15 * 60 * 1000;
let groundingBlockedUntil = 0;
export const groundingBlocked = () => Date.now() < groundingBlockedUntil;
export const blockGrounding = () => { groundingBlockedUntil = Date.now() + BLOCK_MS; };

const unavailable = (msg) => {
  const e = new Error(msg);
  e.searchUnavailable = true;
  return e;
};

// ---- backends ---------------------------------------------------------------

// Tavily is built to be read by a model: `include_answer` returns a synthesized
// summary alongside the sources, which is the same shape Gemini grounding
// returns, so neither caller has to know which one ran.
async function tavily(queries) {
  const key = tavilyKey();
  if (!key) return null;

  const hits = [];
  const parts = [];
  for (const q of queries.slice(0, 4)) {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ query: q, max_results: 5, include_answer: true, search_depth: 'basic' }),
    });
    if (!res.ok) {
      const body = await res.text();
      // 401/403 = bad key, 432/433 = plan exhausted — all permanent for this
      // call, so surface rather than silently returning half a result set.
      throw new Error(`Tavily ${res.status}: ${body.slice(0, 200)}`);
    }
    const j = await res.json();
    for (const r of j.results || []) {
      if (r.url && !hits.some((h) => h.url === r.url)) hits.push({ url: r.url, title: r.title || r.url });
    }
    const answer = (j.answer || '').trim();
    const snippets = (j.results || []).slice(0, 3).map((r) => `  - ${r.title}: ${(r.content || '').trim().slice(0, 400)}`);
    parts.push(`${q}\n${answer ? `  ${answer}\n` : ''}${snippets.join('\n')}`);
  }
  return { summary: parts.join('\n\n'), sources: hits, via: 'tavily' };
}

async function gemini(queries) {
  if (!geminiKey() || groundingBlocked()) return null;
  try {
    const { summary, sources } = await searchGrounded(queries);
    return { summary, sources, via: 'gemini' };
  } catch (e) {
    // Free-tier grounding quota is the common case — fall through to the next
    // backend instead of failing the turn, and stop retrying for a while.
    if (e.rateLimited) {
      blockGrounding();
      console.warn('[search] Gemini grounding quota exhausted — trying next backend for 15min');
      return null;
    }
    throw e;
  }
}

// `configured` = a key exists (drives the Settings readout). `ready` = it can
// actually serve a query right now — Gemini has a key but is useless while its
// grounding quota is blocked, and that distinction is what the Orbit banner
// needs to avoid promising live search it can't deliver.
const BACKENDS = [
  { name: 'gemini', run: gemini, configured: () => !!geminiKey(), ready: () => !!geminiKey() && !groundingBlocked() },
  { name: 'tavily', run: tavily, configured: () => !!tavilyKey(), ready: () => !!tavilyKey() },
];

// ---- public -----------------------------------------------------------------

// Which backends could serve a search right now — drives the Settings readout
// so "no live search" is visible before a chat turn tells you the hard way.
export const searchBackends = () =>
  BACKENDS.map((b) => ({ name: b.name, configured: b.configured(), ready: b.ready() }));

export const searchAvailable = () => BACKENDS.some((b) => b.ready());

// Run `queries` through the first backend that answers. Throws with
// `.searchUnavailable` when every backend is missing or exhausted; callers
// treat that as "answer from model knowledge and say so".
export async function search(queries) {
  const qs = [queries].flat().filter(Boolean).map(String).slice(0, 4);
  if (!qs.length) throw unavailable('no queries given');

  let lastErr = null;
  for (const b of BACKENDS) {
    if (!b.ready()) continue;
    try {
      const out = await b.run(qs);
      if (out && (out.summary || out.sources.length)) return out;
    } catch (e) {
      console.warn(`[search] ${b.name} failed: ${e.message}`);
      lastErr = e;
    }
  }
  throw unavailable(
    lastErr
      ? `every search backend failed (last: ${lastErr.message})`
      : 'no live search backend configured — add a Tavily key in Settings for 1,000 free searches/month'
  );
}
