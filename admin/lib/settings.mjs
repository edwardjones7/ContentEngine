// Local-only settings (server-only). Stored OUTSIDE data/ so `npm run seed`
// (which wipes data/) never deletes API keys, and gitignored so keys are never
// committed. Env vars act as fallbacks when a key isn't saved in settings.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const FILE = resolve(here, '..', 'settings.local.json');

const DEFAULTS = {
  provider: 'free', // 'free' (Gemini free tier) | 'paid' (Claude API) | 'offline'
  geminiKey: '',
  anthropicKey: '',
};

export function getSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(readFileSync(FILE, 'utf8')) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch };
  writeFileSync(FILE, JSON.stringify(next, null, 2));
  return next;
}

export const geminiKey = () => getSettings().geminiKey || process.env.GEMINI_API_KEY || '';
export const anthropicKey = () => getSettings().anthropicKey || process.env.ANTHROPIC_API_KEY || '';

// The single source of truth for which engine is live. A chosen provider
// without its key resolves to offline (deterministic templates + canned chat).
export function activeProvider() {
  const s = getSettings();
  if (s.provider === 'paid' && anthropicKey()) return { kind: 'paid', key: anthropicKey(), label: '● paid · claude' };
  if (s.provider === 'free' && geminiKey()) return { kind: 'free', key: geminiKey(), label: '● free · gemini' };
  return { kind: 'offline', key: '', label: '○ offline' };
}
