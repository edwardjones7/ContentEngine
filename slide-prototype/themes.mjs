// Curated accent themes + background treatments. These are the "variables" that
// make each carousel look different while the constants (dark base, grain,
// vignette, serif headlines, mono index, footer) hold the Elenos identity.
import { mulberry32, hashStr } from './util.mjs';

// Each theme is a bag of CSS custom properties. White ink, fonts, grain and the
// `NN / LABEL` motif are constant elsewhere — only color/glow changes here.
export const THEMES = {
  violet: {
    '--accent': '#8b5cf6', '--accent-bright': '#a06bf5', '--accent-deep': '#6d28d9',
    '--accent-soft': '#b692f3', '--accent-glow': 'rgba(139,92,246,.55)',
    '--em-hi': '#efe7fd', '--em-mid': '#b692f3', '--em-lo': '#7c3aed',
    '--neb1': 'rgba(109,40,217,.34)', '--neb2': 'rgba(91,33,182,.26)',
    '--grid-line': 'rgba(139,92,246,.10)',
  },
  magenta: {
    '--accent': '#e0408f', '--accent-bright': '#ff5fb0', '--accent-deep': '#b21e6a',
    '--accent-soft': '#ff9ccb', '--accent-glow': 'rgba(224,64,143,.50)',
    '--em-hi': '#ffe3f1', '--em-mid': '#ff7ab6', '--em-lo': '#c11d6e',
    '--neb1': 'rgba(190,30,110,.32)', '--neb2': 'rgba(150,20,90,.24)',
    '--grid-line': 'rgba(224,64,143,.10)',
  },
  blue: {
    '--accent': '#3b82f6', '--accent-bright': '#4cc9ff', '--accent-deep': '#1e5fd0',
    '--accent-soft': '#8fd3ff', '--accent-glow': 'rgba(59,130,246,.50)',
    '--em-hi': '#e0f2ff', '--em-mid': '#5cc6ff', '--em-lo': '#1e6fe0',
    '--neb1': 'rgba(30,110,220,.32)', '--neb2': 'rgba(20,80,180,.24)',
    '--grid-line': 'rgba(59,130,246,.10)',
  },
  amber: {
    '--accent': '#f59e0b', '--accent-bright': '#ffc24d', '--accent-deep': '#c2770a',
    '--accent-soft': '#ffd98a', '--accent-glow': 'rgba(245,158,11,.45)',
    '--em-hi': '#fff2d6', '--em-mid': '#ffc24d', '--em-lo': '#d98309',
    '--neb1': 'rgba(180,110,20,.30)', '--neb2': 'rgba(150,90,15,.22)',
    '--grid-line': 'rgba(245,158,11,.10)',
  },
  emerald: {
    '--accent': '#10b981', '--accent-bright': '#34e0a8', '--accent-deep': '#0a8f66',
    '--accent-soft': '#7eecc4', '--accent-glow': 'rgba(16,185,129,.45)',
    '--em-hi': '#d8fff0', '--em-mid': '#4fe3b0', '--em-lo': '#0a9b6e',
    '--neb1': 'rgba(15,150,110,.30)', '--neb2': 'rgba(10,110,80,.22)',
    '--grid-line': 'rgba(16,185,129,.10)',
  },
};

export const THEME_NAMES = Object.keys(THEMES);
export const BACKGROUNDS = ['starfield', 'grid', 'aurora', 'solid-grain'];

// Deterministic theme/background pick from a carousel slug (only used when the
// carousel doesn't specify its own).
export function pickTheme(slug) {
  return THEME_NAMES[hashStr(slug) % THEME_NAMES.length];
}
export function pickBackground(slug) {
  return BACKGROUNDS[(hashStr(slug) >> 3) % BACKGROUNDS.length];
}

export function themeStyleAttr(themeName) {
  const t = THEMES[themeName] || THEMES.violet;
  return Object.entries(t).map(([k, v]) => `${k}:${v}`).join(';');
}

function starfield(width, height, seed) {
  const rnd = mulberry32(seed);
  const count = Math.round((width * height) / 7200);
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = (rnd() * width).toFixed(1);
    const y = (rnd() * height).toFixed(1);
    const r = rnd();
    const size = (r * r * 2.6 + 0.5).toFixed(2);
    const op = (0.22 + rnd() * 0.6).toFixed(2);
    const accent = rnd() > 0.84;
    const bg = accent ? 'var(--accent-soft)' : `rgba(255,255,255,${op})`;
    const glow = r > 0.88 ? `box-shadow:0 0 ${(size * 3).toFixed(1)}px var(--accent-glow);` : '';
    const elOp = accent ? `opacity:${op};` : '';
    out += `<i style="left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${bg};${elOp}${glow}"></i>`;
  }
  return `<div class="stars">${out}</div>`;
}

const neb = (style) => `<div class="neb" style="${style}"></div>`;

// Returns the HTML for the `.bgfx` layer (sits behind grain + content).
export function backgroundLayer(kind, { width, height, seed }) {
  if (kind === 'grid') {
    return `<div class="bgfx">
      ${neb('width:64%;height:48%;left:50%;top:-8%;background:radial-gradient(closest-side, var(--neb1), transparent 75%)')}
      <div class="bg-grid"></div>
    </div>`;
  }
  if (kind === 'aurora') {
    return `<div class="bgfx bg-aurora">
      ${neb('width:90%;height:60%;left:-20%;top:-18%;transform:rotate(-12deg);background:radial-gradient(closest-side, var(--neb1), transparent 72%)')}
      ${neb('width:85%;height:58%;left:30%;top:50%;transform:rotate(-12deg);background:radial-gradient(closest-side, var(--neb2), transparent 72%)')}
      ${neb('width:50%;height:40%;left:60%;top:8%;background:radial-gradient(closest-side, var(--accent-glow), transparent 72%)')}
    </div>`;
  }
  if (kind === 'solid-grain') {
    return `<div class="bgfx">
      ${neb('width:80%;height:55%;left:10%;top:24%;background:radial-gradient(closest-side, var(--neb2), transparent 78%)')}
    </div>`;
  }
  // starfield (default)
  return `<div class="bgfx">
    ${neb('width:60%;height:46%;left:52%;top:-6%;background:radial-gradient(closest-side, var(--neb1), transparent 75%)')}
    ${neb('width:55%;height:42%;left:-12%;top:64%;background:radial-gradient(closest-side, var(--neb2), transparent 75%)')}
    ${starfield(width, height, seed)}
  </div>`;
}

// CSS for the background layers (constant; uses theme vars).
export const BG_CSS = `
  .bgfx{ position:absolute; inset:0; z-index:0; overflow:hidden; }
  .neb{ position:absolute; border-radius:50%; }
  .bg-aurora .neb{ filter:blur(58px); }
  .stars{ position:absolute; inset:0; }
  .stars i{ position:absolute; border-radius:50%; display:block; }
  .bg-grid{ position:absolute; inset:-1px;
    background-image:
      linear-gradient(var(--grid-line) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
    background-size:74px 74px;
    -webkit-mask:radial-gradient(120% 95% at 50% 28%, #000 26%, transparent 82%);
            mask:radial-gradient(120% 95% at 50% 28%, #000 26%, transparent 82%); }
`;
