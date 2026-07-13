import { getSettings, activeProvider } from '@/lib/settings.mjs';
import { saveSettingsAction, testProviderAction } from './actions';

export const dynamic = 'force-dynamic';

const mask = (k: string) => (k ? `saved · ends in …${k.slice(-4)}` : 'not set');

export default async function SettingsPage() {
  const s: any = getSettings();
  const active = activeProvider();

  return (
    <>
      <h1>Settings</h1>
      <p className="lead">Pick Orbit's engine. Free runs on Google Gemini's free tier (no card needed); Paid runs on the Claude API. Either way, no key = offline mode with deterministic templates.</p>
      <div className="row" style={{ marginBottom: 18 }}>
        <span className="mode">{active.label}</span>
        {active.kind === 'offline' && s.provider !== 'offline' ? (
          <span className="src" style={{ color: '#ffc24d' }}>selected provider has no API key — running offline until one is saved</span>
        ) : null}
      </div>

      <form action={saveSettingsAction} className="grid" style={{ maxWidth: 720 }}>
        <div className="card">
          <div className="mediums-pick" style={{ gridTemplateColumns: '1fr' }}>
            <label className="pick">
              <input type="radio" name="provider" value="free" defaultChecked={s.provider === 'free'} />
              <span>Free — Google Gemini</span>
              <span className="src">gemini-3.5-flash · free tokens · 5k grounded searches/mo</span>
            </label>
            <label className="pick">
              <input type="radio" name="provider" value="paid" defaultChecked={s.provider === 'paid'} />
              <span>Paid — Claude API</span>
              <span className="src">sonnet chat + opus builds · pay-as-you-go</span>
            </label>
            <label className="pick">
              <input type="radio" name="provider" value="offline" defaultChecked={s.provider === 'offline'} />
              <span>Offline</span>
              <span className="src">deterministic templates, no AI calls</span>
            </label>
          </div>
          <div className="meta" style={{ marginTop: 12, marginBottom: 0 }}>
            Free-tier note: Google may use free-tier prompts to improve its products, and rate limits apply (~10 requests/min). Fine for research; switch to Paid if that ever matters.
          </div>
        </div>

        <div className="card">
          <div className="row"><span className="label">Gemini API key</span><span className="sp" /><span className="src">{mask(s.geminiKey)}</span></div>
          <div className="meta">Free from aistudio.google.com → “Get API key”. No credit card required.</div>
          <input className="title" style={{ fontSize: 13, marginBottom: 6 }} name="geminiKey" type="password" placeholder={s.geminiKey ? 'leave blank to keep current key' : 'AIza…'} autoComplete="off" />
          {s.geminiKey ? <label className="src" style={{ display: 'block' }}><input type="checkbox" name="clearGemini" /> clear saved key</label> : null}
        </div>

        <div className="card">
          <div className="row"><span className="label">Anthropic API key</span><span className="sp" /><span className="src">{mask(s.anthropicKey)}</span></div>
          <div className="meta">From platform.claude.com → API keys. Pay-as-you-go.</div>
          <input className="title" style={{ fontSize: 13, marginBottom: 6 }} name="anthropicKey" type="password" placeholder={s.anthropicKey ? 'leave blank to keep current key' : 'sk-ant-…'} autoComplete="off" />
          {s.anthropicKey ? <label className="src" style={{ display: 'block' }}><input type="checkbox" name="clearAnthropic" /> clear saved key</label> : null}
        </div>

        <div className="row">
          <button className="primary" type="submit">Save settings</button>
          <span className="src">keys are stored in admin/settings.local.json (gitignored) — never committed</span>
        </div>
      </form>

      <form action={testProviderAction} className="row" style={{ marginTop: 14, maxWidth: 720 }}>
        <button type="submit">Test connection</button>
        {s.lastTest ? <span className="src">{s.lastTest}</span> : null}
      </form>
    </>
  );
}
