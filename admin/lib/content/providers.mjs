// PAID provider — Claude API transport. Prompts + post-processing live in
// prompts.mjs (shared with the free Gemini provider in gemini.mjs).
import { anthropicKey } from '../settings.mjs';
import { ideatePrompt, postIdeate, briefPrompt, postBrief, blogPrompt, postBlog, mediumPrompt, postMedium } from './prompts.mjs';

const TEXT_MODEL = 'claude-opus-4-8'; // best long-form on-brand writing (blog, brief)
const FAST_MODEL = 'claude-sonnet-4-6'; // cheaper fan-out (ideation, mediums)

async function callClaude({ system, user, tier = 'text', maxTokens = 4000 }) {
  const key = anthropicKey();
  if (!key) throw new Error('no Anthropic API key — add one in Settings');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: tier === 'fast' ? FAST_MODEL : TEXT_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.content || []).map((c) => c.text || '').join('');
}

export async function ping() {
  const out = await callClaude({ system: 'Reply with exactly: ok', user: 'ping', tier: 'fast', maxTokens: 16 });
  return `✓ Claude connected (${out.trim().slice(0, 20)})`;
}

export async function ideate(opts = {}) {
  return postIdeate(await callClaude(ideatePrompt(opts)));
}

export async function brief(idea) {
  return postBrief(await callClaude(briefPrompt(idea)), idea);
}

export async function blog(idea, spec) {
  return postBlog(await callClaude(blogPrompt(idea, spec)), idea);
}

export async function medium(kind, idea, spec) {
  return postMedium(await callClaude(mediumPrompt(kind, idea, spec)));
}
