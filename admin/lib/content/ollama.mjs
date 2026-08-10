// LOCAL provider — Ollama on this machine. Free and unrated, so it's the
// backup tier when a cloud provider rate-limits mid-build: pipeline.mjs tries
// cloud → local → deterministic template.
//
// Mirrors the gemini.mjs / providers.mjs surface exactly, so the pipeline
// doesn't care which one answers. Two deliberate gaps:
//   • critique() — vision QA needs a VLM; a second model would fight Chromium
//     for the 16GB this Mac shares during a render. Returns null, which the
//     pipeline already treats as "no QA available".
//   • no web search — Orbit research chat stays on a cloud provider.
import {
  ideatePrompt, postIdeate, briefPrompt, postBrief, blogPrompt, postBlog,
  illustratePrompt, postIllustrate, editSlidePrompt, postEditSlide,
  mediumPrompt, postMedium,
} from './prompts.mjs';

export const OLLAMA_HOST = () => process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
// One mid-size model does every step. Override with OLLAMA_MODEL.
export const OLLAMA_MODEL = () => process.env.OLLAMA_MODEL || 'qwen3:8b';

// Generation is slow on a laptop and a build fires ~10 of these; keep the
// ceiling generous but bounded so a wedged model can't hang a build forever.
const TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 180000);

export async function isAvailable() {
  try {
    const r = await fetch(`${OLLAMA_HOST()}/api/tags`, { signal: AbortSignal.timeout(1500) });
    if (!r.ok) return false;
    const { models = [] } = await r.json();
    return models.some((m) => m.name === OLLAMA_MODEL() || m.model === OLLAMA_MODEL());
  } catch {
    return false;
  }
}

export async function callOllama({ system, user, json = false, images = [] }) {
  if (images.length) throw new Error('local model has no vision support');
  const res = await fetch(`${OLLAMA_HOST()}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      model: OLLAMA_MODEL(),
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      stream: false,
      // Ollama's structured-output mode constrains decoding to valid JSON,
      // which is what makes a small model usable for the carousel contract.
      ...(json ? { format: 'json' } : {}),
      options: { temperature: json ? 0.4 : 0.7, num_ctx: 8192 },
      think: false, // qwen3 et al. emit reasoning blocks otherwise
    }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const text = data?.message?.content || '';
  if (!text.trim()) throw new Error('empty response from local model');
  // strip any stray <think> block a reasoning model leaks despite think:false
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

export async function ping() {
  if (!(await isAvailable())) {
    return `✗ Ollama not reachable at ${OLLAMA_HOST()} — is it running, and is ${OLLAMA_MODEL()} pulled?`;
  }
  const out = await callOllama({ system: 'Reply with exactly: ok', user: 'ping' });
  return `✓ Local model connected (${OLLAMA_MODEL()}: ${out.trim().slice(0, 20)})`;
}

export async function ideate(opts = {}) {
  return postIdeate(await callOllama(ideatePrompt(opts)));
}

export async function brief(idea) {
  return postBrief(await callOllama(briefPrompt(idea)), idea);
}

export async function blog(idea, spec) {
  return postBlog(await callOllama(blogPrompt(idea, spec)), idea);
}

export async function medium(kind, idea, spec) {
  return postMedium(await callOllama(mediumPrompt(kind, idea, spec)));
}

export async function illustrate(spec, slots) {
  return postIllustrate(await callOllama(illustratePrompt(spec, slots)));
}

export async function editSlide(slide, instruction) {
  return postEditSlide(await callOllama(editSlidePrompt(slide, instruction)), slide);
}

// No vision — the pipeline keeps the plain render when QA is unavailable.
export async function critique() {
  return null;
}
