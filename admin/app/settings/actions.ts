'use server';
import { revalidatePath } from 'next/cache';
import { saveSettings, getSettings } from '@/lib/settings.mjs';

export async function saveSettingsAction(formData: FormData) {
  const patch: any = { provider: String(formData.get('provider') || 'free') };
  // blank input = keep the stored key; "clear" checkbox wipes it
  const gemini = String(formData.get('geminiKey') || '').trim();
  const anthropic = String(formData.get('anthropicKey') || '').trim();
  if (gemini) patch.geminiKey = gemini;
  if (anthropic) patch.anthropicKey = anthropic;
  if (formData.get('clearGemini')) patch.geminiKey = '';
  if (formData.get('clearAnthropic')) patch.anthropicKey = '';
  saveSettings(patch);
  revalidatePath('/', 'layout');
  revalidatePath('/settings');
}

export async function testProviderAction() {
  const s = getSettings();
  let result = '';
  try {
    if (s.provider === 'free') {
      const { ping } = await import('@/lib/content/gemini.mjs');
      result = await ping();
    } else if (s.provider === 'paid') {
      const { ping } = await import('@/lib/content/providers.mjs');
      result = await ping();
    } else {
      result = 'Offline mode — nothing to test.';
    }
  } catch (e: any) {
    result = `✗ ${e?.message || 'connection failed'}`;
  }
  saveSettings({ lastTest: `${new Date().toLocaleString()} — ${result}` } as any);
  revalidatePath('/settings');
}
