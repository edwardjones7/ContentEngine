// FREE provider — Google Gemini transport (free tier: gemini-3.5-flash, no
// card required; free-tier rate limits ~10 req/min). Same prompt builders and
// post-processors as the Claude path, so both engines produce identical shapes.
import { geminiKey } from '../settings.mjs';
import {
  ideatePrompt, postIdeate, briefPrompt, postBrief, blogPrompt, postBlog, mediumPrompt, postMedium,
  critiquePrompt, postCritique, illustratePrompt, postIllustrate, editSlidePrompt, postEditSlide,
} from './prompts.mjs';

export const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Free-tier fallback chain — the flagship is frequently slammed on free tier
// (429 RESOURCE_EXHAUSTED / 503 UNAVAILABLE), so we step down instead of
// failing. All entries are Gemini 3 family, which supports combining Google
// Search grounding with function calling — chat keeps full capability on any
// of them. (gemini-2.5-* are 404 "no longer available to new users".)
export const GEMINI_CHAIN = [
  { model: 'gemini-3.5-flash', family: 3 },
  { model: 'gemini-3-flash-preview', family: 3 },
  { model: 'gemini-3.1-flash-lite', family: 3 },
  { model: 'gemini-flash-lite-latest', family: 3 },
];

export const isRetryable = (status, body = '') =>
  status === 429 || status === 503 || status >= 500 || /RESOURCE_EXHAUSTED|UNAVAILABLE|overloaded/i.test(body);

export const friendlyGeminiError = (lastErr) => {
  const e = new Error(`All free-tier Gemini models are busy or rate-limited right now (${lastErr}). Wait a minute and try again — or add a Claude key in Settings. Free-tier limits: ~10 requests/min.`);
  e.rateLimited = true; // callers may wait out the per-minute window and retry
  return e;
};

export async function callGemini({ system, user, maxTokens = 4000, json = false, images = [] }) {
  const key = geminiKey();
  if (!key) throw new Error('no Gemini API key — add one in Settings');
  let lastErr = 'unknown';
  const parts = [
    ...images.map((png) => ({ inlineData: { mimeType: 'image/png', data: png.toString('base64') } })),
    { text: user },
  ];
  for (const { model } of GEMINI_CHAIN) {
    const res = await fetch(`${BASE}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts }],
        generationConfig: {
          // Gemini 3 models think before answering and thinking tokens count
          // against maxOutputTokens — so cap thinking LOW for structured
          // generation (it doesn't need deep reasoning) and leave headroom
          // above the Claude-tuned budgets to avoid mid-JSON truncation.
          maxOutputTokens: Math.max(maxTokens * 2, 8000),
          thinkingConfig: { thinkingLevel: 'low' },
          ...(json ? { responseMimeType: 'application/json' } : {}),
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      if (isRetryable(res.status, body)) {
        console.warn(`[gemini] ${model} unavailable (${res.status}), trying next model`);
        lastErr = `${model}: ${res.status}`;
        continue;
      }
      throw new Error(`Gemini ${res.status}: ${body}`);
    }
    const data = await res.json();
    const outParts = data.candidates?.[0]?.content?.parts || [];
    const text = outParts.filter((p) => p.text && !p.thought).map((p) => p.text).join('');
    if (!text) throw new Error(`Gemini returned no text (finishReason: ${data.candidates?.[0]?.finishReason || 'unknown'})`);
    return text;
  }
  throw friendlyGeminiError(lastErr);
}

// One-shot grounded search: ask a Gemini model (with google_search only) to
// run the queries and report findings. Returns the findings text plus the
// grounding sources, for callers that expose search as an explicit tool.
export async function searchGrounded(queries) {
  const key = geminiKey();
  if (!key) throw new Error('no Gemini API key — add one in Settings');
  let lastErr = 'unknown';
  for (const { model } of GEMINI_CHAIN) {
    const res = await fetch(`${BASE}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: 'You are a research assistant. Search the web for the given queries and report the concrete findings — numbers, names, dates, quotes — tersely, grouped by query. No preamble, no advice.' }] },
        contents: [{ role: 'user', parts: [{ text: `Search queries:\n${queries.map((q) => `- ${q}`).join('\n')}` }] }],
        tools: [{ google_search: {} }],
        generationConfig: { maxOutputTokens: 8000, thinkingConfig: { thinkingLevel: 'low' } },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      if (isRetryable(res.status, body)) {
        console.warn(`[gemini search] ${model} unavailable (${res.status}), trying next model`);
        lastErr = `${model}: ${res.status}`;
        continue;
      }
      throw new Error(`Gemini ${res.status}: ${body}`);
    }
    const cand = (await res.json()).candidates?.[0];
    const summary = (cand?.content?.parts || []).filter((p) => p.text && !p.thought).map((p) => p.text).join('');
    const sources = (cand?.groundingMetadata?.groundingChunks || [])
      .map((c) => ({ url: c.web?.uri, title: c.web?.title || c.web?.uri }))
      .filter((s) => s.url);
    return { summary, sources };
  }
  throw friendlyGeminiError(lastErr);
}

export async function ping() {
  const out = await callGemini({ system: 'Reply with exactly: ok', user: 'ping', maxTokens: 2000 });
  return `✓ Gemini connected (${out.trim().slice(0, 20)})`;
}

export async function ideate(opts = {}) {
  return postIdeate(await callGemini(ideatePrompt(opts)));
}

export async function brief(idea) {
  return postBrief(await callGemini(briefPrompt(idea)), idea);
}

export async function blog(idea, spec) {
  return postBlog(await callGemini(blogPrompt(idea, spec)), idea);
}

export async function medium(kind, idea, spec) {
  return postMedium(await callGemini(mediumPrompt(kind, idea, spec)));
}

export async function critique(pngs, slidesMeta) {
  return postCritique(await callGemini({ ...critiquePrompt(slidesMeta), images: pngs }));
}

export async function illustrate(spec, slots) {
  return postIllustrate(await callGemini(illustratePrompt(spec, slots)));
}

export async function editSlide(slide, instruction) {
  return postEditSlide(await callGemini(editSlidePrompt(slide, instruction)), slide);
}
