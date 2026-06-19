// Wireframe line-art illustrations. They draw with the *theme* accent via CSS
// custom properties (--accent-bright / --accent-glow), so the same icon recolors
// per carousel. In the production engine, the same slot accepts a composited
// OpenAI raster instead of these vectors.

const STROKE = 'var(--accent-bright)';
const GLOW = 'filter:drop-shadow(0 0 10px var(--accent-glow));';

export const ILLUSTRATIONS = [
  'magnifier', 'phone', 'bubble', 'card', 'clock', 'bolt', 'nodes', 'hex',
];

export function illustrationSVG(kind, { overlay } = {}) {
  if (kind === 'magnifier') {
    return `<svg viewBox="0 0 360 380" style="width:100%;height:100%;${GLOW}" fill="none" stroke="${STROKE}" stroke-width="2">
      <circle cx="150" cy="150" r="118"/>
      <ellipse cx="150" cy="150" rx="118" ry="44"/>
      <ellipse cx="150" cy="150" rx="78" ry="118"/>
      <ellipse cx="150" cy="150" rx="40" ry="118"/>
      <line x1="32" y1="150" x2="268" y2="150"/>
      <line x1="150" y1="32" x2="150" y2="268"/>
      <path d="M233 233 L330 340" stroke-width="14" stroke-linecap="round"/>
      <path d="M226 240 L322 348" stroke-width="22" stroke-linecap="round" opacity="0.5"/>
    </svg>`;
  }
  if (kind === 'phone') {
    const pill = overlay
      ? `<div class="phone-pill"><span class="phone-ic">☎</span>${overlay}</div>`
      : '';
    return `<div class="phone-wrap">
      <svg viewBox="0 0 300 600" style="width:100%;height:100%;${GLOW}" fill="none" stroke="${STROKE}" stroke-width="2">
        <rect x="20" y="10" width="260" height="580" rx="44"/>
        <rect x="34" y="26" width="232" height="548" rx="32" opacity="0.6"/>
        <rect x="112" y="22" width="76" height="14" rx="7"/>
        <line x1="20" y1="150" x2="280" y2="150" opacity="0.25"/>
        <line x1="20" y1="300" x2="280" y2="300" opacity="0.25"/>
        <line x1="20" y1="450" x2="280" y2="450" opacity="0.25"/>
      </svg>${pill}
    </div>`;
  }
  if (kind === 'bubble') {
    return `<svg viewBox="0 0 360 320" style="width:100%;height:100%;${GLOW}" fill="none" stroke="${STROKE}" stroke-width="2">
      <path d="M40 30 H320 a20 20 0 0 1 20 20 V210 a20 20 0 0 1 -20 20 H150 L92 286 V230 H40 a20 20 0 0 1 -20 -20 V50 a20 20 0 0 1 20 -20 Z"/>
      <line x1="70" y1="92" x2="290" y2="92" opacity="0.6"/>
      <line x1="70" y1="132" x2="290" y2="132" opacity="0.6"/>
      <line x1="70" y1="172" x2="220" y2="172" opacity="0.6"/>
    </svg>`;
  }
  if (kind === 'card') {
    const star = (cx) =>
      `<path transform="translate(${cx} 96)" d="M0 -16 L4.7 -4.9 L16.6 -4.9 L7 2.6 L10.5 14.3 L0 7 L-10.5 14.3 L-7 2.6 L-16.6 -4.9 L-4.7 -4.9 Z" fill="${STROKE}" stroke="none"/>`;
    return `<svg viewBox="0 0 360 300" style="width:100%;height:100%;${GLOW}" fill="none" stroke="${STROKE}" stroke-width="2">
      <rect x="30" y="40" width="300" height="220" rx="22"/>
      <circle cx="78" cy="92" r="20"/>
      <line x1="116" y1="84" x2="250" y2="84" opacity="0.6"/>
      <line x1="116" y1="104" x2="210" y2="104" opacity="0.6"/>
      ${[140, 178, 216, 254, 292].map(star).join('')}
      <line x1="58" y1="150" x2="300" y2="150" opacity="0.45"/>
      <line x1="58" y1="186" x2="300" y2="186" opacity="0.3"/>
      <line x1="58" y1="216" x2="240" y2="216" opacity="0.3"/>
    </svg>`;
  }
  if (kind === 'clock') {
    const ticks = Array.from({ length: 12 }, (_, i) => {
      const a = (i * Math.PI) / 6;
      const x1 = 160 + Math.sin(a) * 122, y1 = 160 - Math.cos(a) * 122;
      const x2 = 160 + Math.sin(a) * 132, y2 = 160 - Math.cos(a) * 132;
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
    }).join('');
    return `<svg viewBox="0 0 320 320" style="width:100%;height:100%;${GLOW}" fill="none" stroke="${STROKE}" stroke-width="2">
      <circle cx="160" cy="160" r="132"/>
      <circle cx="160" cy="160" r="110" opacity="0.4"/>
      ${ticks}
      <line x1="160" y1="160" x2="160" y2="86" stroke-width="3" stroke-linecap="round"/>
      <line x1="160" y1="160" x2="214" y2="186" stroke-width="3" stroke-linecap="round"/>
      <circle cx="160" cy="160" r="6" fill="${STROKE}" stroke="none"/>
    </svg>`;
  }
  if (kind === 'bolt') {
    return `<svg viewBox="0 0 220 340" style="width:100%;height:100%;${GLOW}" fill="none" stroke="${STROKE}" stroke-width="2.5" stroke-linejoin="round">
      <polygon points="124,20 40,184 104,184 92,320 188,150 120,150"/>
      <polygon points="124,20 40,184 104,184 92,320 188,150 120,150" opacity="0.25" stroke-width="10"/>
    </svg>`;
  }
  if (kind === 'nodes') {
    return `<svg viewBox="0 0 340 340" style="width:100%;height:100%;${GLOW}" fill="none" stroke="${STROKE}" stroke-width="2">
      <line x1="60" y1="80" x2="170" y2="170" opacity="0.55"/>
      <line x1="280" y1="70" x2="170" y2="170" opacity="0.55"/>
      <line x1="70" y1="270" x2="170" y2="170" opacity="0.55"/>
      <line x1="278" y1="262" x2="170" y2="170" opacity="0.55"/>
      <line x1="60" y1="80" x2="280" y2="70" opacity="0.3"/>
      <line x1="70" y1="270" x2="278" y2="262" opacity="0.3"/>
      <circle cx="170" cy="170" r="26" fill="#160d2b"/>
      <circle cx="60" cy="80" r="15" fill="#120a24"/>
      <circle cx="280" cy="70" r="15" fill="#120a24"/>
      <circle cx="70" cy="270" r="15" fill="#120a24"/>
      <circle cx="278" cy="262" r="15" fill="#120a24"/>
    </svg>`;
  }
  if (kind === 'hex') {
    return `<svg viewBox="0 0 100 100" style="width:100%;height:100%;${GLOW}" fill="none" stroke="${STROKE}" stroke-width="3">
      <polygon points="50,8 88,29 88,71 50,92 12,71 12,29"/>
      <polygon points="50,24 74,38 74,62 50,76 26,62 26,38" opacity="0.7"/>
      <line x1="50" y1="8" x2="50" y2="24"/>
      <line x1="88" y1="29" x2="74" y2="38"/>
      <line x1="12" y1="71" x2="26" y2="62"/>
    </svg>`;
  }
  return '';
}
