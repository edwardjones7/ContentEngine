// Slim assembler. Given a slide already art-directed (carries _theme + _bg +
// layout), it builds the full HTML document: constant base + theme vars +
// background treatment + grain/vignette + the `NN / LABEL` index + the chosen
// layout + optional footer. Becomes the `/internal/slide` route in the engine.
import { esc, pad2 } from './util.mjs';
import { themeStyleAttr, backgroundLayer, BG_CSS } from './themes.mjs';
import { renderLayout, LAYOUT_CSS } from './layouts.mjs';

const FONTS =
  "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=Lora:ital,wght@0,400;0,500;1,400;1,500&family=Space+Mono:wght@400;700&display=swap";

const BASE_CSS = `
  *{ margin:0; padding:0; box-sizing:border-box; }
  .stage{ position:relative; overflow:hidden; padding:64px 72px; display:flex; flex-direction:column;
    background:radial-gradient(125% 90% at 50% 46%, #0a0714 0%, #06040c 58%, #030208 100%);
    color:#f4f1fb; font-family:'Lora', Georgia, serif; }
  .vignette{ position:absolute; inset:0; z-index:1; pointer-events:none;
    background:radial-gradient(120% 100% at 50% 40%, transparent 52%, rgba(0,0,0,.58) 100%); }
  .grain{ position:absolute; inset:0; z-index:1; opacity:.07; mix-blend-mode:overlay; pointer-events:none; }
  .label{ position:relative; z-index:2; font-family:'Space Mono', monospace; font-size:27px;
    letter-spacing:.16em; text-transform:uppercase; color:var(--accent-soft);
    display:flex; align-items:center; gap:18px; }
  .dot{ width:15px; height:15px; border-radius:50%; background:var(--accent);
    box-shadow:0 0 16px var(--accent-glow); }
  .content{ position:relative; z-index:2; flex:1; display:flex; margin-top:30px; }
  .footer{ position:relative; z-index:2; font-family:'Space Mono', monospace; font-size:24px;
    letter-spacing:.08em; color:#8a7fb0; text-align:center; margin-top:14px; }
  .headline{ font-family:'Playfair Display', Georgia, serif; font-weight:500; color:#f4f1fb;
    line-height:1.02; letter-spacing:-.005em;
    text-shadow:0 0 46px var(--accent-glow), 0 0 16px rgba(255,255,255,.08); }
  .em-ink{ font-style:italic; font-weight:500; }
  .em-accent{ font-style:italic; color:var(--accent-soft); font-weight:500; }
  .em-grad{ font-style:italic; font-weight:600;
    background:linear-gradient(180deg, var(--em-hi), var(--em-mid) 55%, var(--em-lo));
    -webkit-background-clip:text; background-clip:text; color:transparent; }
  .phone-wrap{ position:relative; width:100%; height:100%; display:flex; align-items:center; justify-content:center; }
  .phone-pill{ position:absolute; top:54%; left:6%; transform:translateY(-50%);
    background:linear-gradient(180deg, var(--accent), var(--accent-deep)); color:#fff;
    font-family:'Space Mono', monospace; font-size:30px; letter-spacing:.02em;
    padding:18px 30px; border-radius:40px; display:flex; align-items:center; gap:14px;
    box-shadow:0 0 34px var(--accent-glow), 0 10px 30px rgba(0,0,0,.5); }
  .phone-ic{ font-size:26px; }
`;

export function renderSlideHTML(slide, { width = 1080, height = 1350 } = {}) {
  const themeName = slide._theme || 'violet';
  const bgKind = slide._bg || 'starfield';
  const seed = (slide.index || 1) * 101 + 7;
  const bg = backgroundLayer(bgKind, { width, height, seed });
  const label = `<div class="label"><span class="dot"></span>${pad2(slide.index)} / ${esc(slide.label || '')}</div>`;
  const footer = slide.footer ? `<div class="footer">${esc(slide.footer)}</div>` : '';
  const grain = `<svg class="grain"><filter id="g${slide.index}"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#g${slide.index})"/></svg>`;

  return `<!doctype html><html><head><meta charset="utf-8"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="${FONTS}" rel="stylesheet"/>
<style>
  html,body{ width:${width}px; height:${height}px; }
  .stage{ width:${width}px; height:${height}px; }
  ${BASE_CSS}
  ${BG_CSS}
  ${LAYOUT_CSS}
</style></head>
<body><div class="stage" style="${themeStyleAttr(themeName)}">
  ${bg}
  <div class="vignette"></div>
  ${grain}
  ${label}
  <div class="content">${renderLayout(slide)}</div>
  ${footer}
</div></body></html>`;
}
