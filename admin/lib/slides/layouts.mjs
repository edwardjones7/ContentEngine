// Layout variants per archetype + the rhythm-breaker archetypes (stat/quote/
// list/compare). renderLayout(slide) returns the content that fills `.content`
// (the region under the constant `NN / LABEL` index). The art-director picks the
// `layout` token; this module just renders whatever it's handed.
import { runs, esc, pad2 } from './util.mjs';
import { illustrationSVG } from './illustrations.mjs';

// Which layouts are valid for each archetype (art-director rotates within these).
export const LAYOUTS_FOR = {
  cover: ['headline-art', 'art-headline', 'centered', 'fullbleed', 'bottom-heavy'],
  body: ['left-text-right-art', 'right-text-left-art', 'art-watermark', 'stacked'],
  cta: ['cta-centered', 'cta-left'],
  stat: ['stat-center'],
  quote: ['quote-center'],
  list: ['list-rows'],
  compare: ['compare-cols'],
};

const illHTML = (slide) => {
  const ill = slide.illustration;
  if (!ill) return '';
  // {svg} = bespoke AI-generated wireframe, already sanitized (sanitize-svg.mjs)
  // and carrying the same theme-var stroke + glow as the stock kit
  if (typeof ill === 'object' && ill.svg) return ill.svg;
  if (typeof ill === 'object' && ill.img) return `<img src="${ill.img}"/>`;
  return illustrationSVG(ill, { overlay: slide.illustrationOverlay });
};

const headlineHTML = (slide, mode = 'grad') =>
  `${runs(slide.headline, mode)}${slide.arrow ? '<span class="arrow"> &rarr;</span>' : ''}`;

const blocksHTML = (slide) =>
  (slide.blocks || [])
    .map((b, i) => `${i ? '<div class="rule"></div>' : ''}<div class="block"><p>${runs(b.body, 'accent')}</p></div>`)
    .join('');

export function renderLayout(slide) {
  const L = slide.layout;

  // ---- statement layouts (cover / headline slides) ----
  if (L === 'headline-art') {
    return `<div class="L lay-headline-art">
      <h1 class="headline h-xl">${headlineHTML(slide)}</h1>
      ${slide.illustration ? `<div class="ill ill-br">${illHTML(slide)}</div>` : ''}
    </div>`;
  }
  if (L === 'art-headline') {
    return `<div class="L lay-art-headline">
      <div class="ill ill-side">${illHTML(slide)}</div>
      <h1 class="headline h-lg">${headlineHTML(slide)}</h1>
    </div>`;
  }
  if (L === 'centered') {
    return `<div class="L lay-centered">
      ${slide.illustration ? `<div class="ill ill-watermark">${illHTML(slide)}</div>` : ''}
      <h1 class="headline h-lg center">${headlineHTML(slide)}</h1>
    </div>`;
  }
  if (L === 'fullbleed') {
    return `<div class="L lay-fullbleed">
      <div class="ill ill-fill">${illHTML(slide)}</div>
      <div class="fb-scrim"></div>
      <h1 class="headline h-lg fb-head">${headlineHTML(slide)}</h1>
    </div>`;
  }
  if (L === 'bottom-heavy') {
    return `<div class="L lay-bottom-heavy">
      ${slide.illustration ? `<div class="ill ill-top">${illHTML(slide)}</div>` : ''}
      <h1 class="headline h-xl bh-head">${headlineHTML(slide)}</h1>
    </div>`;
  }

  // ---- body / explainer layouts ----
  if (L === 'right-text-left-art') {
    return `<div class="L lay-body lay-body-rtl">
      <div class="ill ill-mid-left">${illHTML(slide)}</div>
      <div class="body-col body-col-right">
        <h1 class="headline h-md">${headlineHTML(slide)}</h1>
        <div class="blocks-wrap"><div class="blocks">${blocksHTML(slide)}</div></div>
      </div>
    </div>`;
  }
  if (L === 'art-watermark') {
    return `<div class="L lay-body lay-body-wm">
      ${slide.illustration ? `<div class="ill ill-watermark wm-right">${illHTML(slide)}</div>` : ''}
      <h1 class="headline h-md">${headlineHTML(slide)}</h1>
      <div class="blocks-wrap wm-wrap"><div class="blocks wm-blocks">${blocksHTML(slide)}</div></div>
    </div>`;
  }
  if (L === 'stacked') {
    return `<div class="L lay-body-stacked">
      ${slide.illustration ? `<div class="ill ill-corner">${illHTML(slide)}</div>` : ''}
      <h1 class="headline h-md st-h">${headlineHTML(slide)}</h1>
      <div class="blocks blocks-2col">${blocksHTML(slide)}</div>
    </div>`;
  }
  if (L === 'left-text-right-art') {
    return `<div class="L lay-body lay-body-ltr">
      <div class="body-col body-col-left">
        <h1 class="headline h-md">${headlineHTML(slide)}</h1>
        <div class="blocks-wrap"><div class="blocks">${blocksHTML(slide)}</div></div>
      </div>
      <div class="ill ill-mid-right">${illHTML(slide)}</div>
    </div>`;
  }

  // ---- cta ----
  if (L === 'cta-centered' || L === 'cta-left') {
    return `<div class="L lay-cta ${L === 'cta-left' ? 'cta-left' : 'cta-center'}">
      <div class="ill cta-hex">${illustrationSVG('hex')}</div>
      <div class="cta-block">
        <h1 class="headline h-lg cta-h">${headlineHTML(slide, 'ink')}</h1>
        <div class="streak"></div>
        ${slide.sub ? `<div class="cta-sub">${esc(slide.sub)}</div>` : ''}
        ${slide.ctaBody ? `<div class="block cta-body"><p>${runs(slide.ctaBody, 'accent')}</p></div>` : ''}
      </div>
    </div>`;
  }

  // ---- rhythm-breakers ----
  if (L === 'stat-center') {
    return `<div class="L lay-stat">
      <div class="stat-num">${esc(slide.stat)}</div>
      <div class="stat-cap">${runs(slide.caption, 'accent')}</div>
    </div>`;
  }
  if (L === 'quote-center') {
    return `<div class="L lay-quote">
      <div class="q-mark">&ldquo;</div>
      <blockquote class="q-text">${runs(slide.quote, 'accent')}</blockquote>
      ${slide.cite ? `<div class="q-cite">${esc(slide.cite)}</div>` : ''}
    </div>`;
  }
  if (L === 'list-rows') {
    const items = (slide.items || [])
      .map((it, i) => {
        const t = Array.isArray(it) ? it : it.text || [{ t: String(it) }];
        return `<div class="list-row"><span class="li-n">${pad2(i + 1)}</span><span class="li-t">${runs(t, 'accent')}</span></div>`;
      })
      .join('');
    return `<div class="L lay-list">
      <h1 class="headline h-md list-h">${headlineHTML(slide)}</h1>
      <div class="list-rows">${items}</div>
    </div>`;
  }
  if (L === 'compare-cols') {
    const col = (c, kind) =>
      `<div class="cmp-col cmp-${kind}">
        <div class="cmp-tag">${esc(c.tag || (kind === 'old' ? 'Before' : 'After'))}</div>
        <p>${runs(c.body, kind === 'old' ? 'ink' : 'accent')}</p>
      </div>`;
    return `<div class="L lay-compare">
      ${slide.headline ? `<h1 class="headline h-sm cmp-h">${headlineHTML(slide)}</h1>` : ''}
      <div class="cmp-grid">${col(slide.left || {}, 'old')}<div class="cmp-vs">&rarr;</div>${col(slide.right || {}, 'new')}</div>
    </div>`;
  }

  // fallback
  return `<div class="L lay-headline-art"><h1 class="headline h-xl">${headlineHTML(slide)}</h1></div>`;
}

export const LAYOUT_CSS = `
  .L{ flex:1; width:100%; position:relative; }
  .headline.center{ text-align:center; }
  .h-xl{ font-size:104px; }
  .h-lg{ font-size:96px; }
  .h-md{ font-size:88px; }
  .h-sm{ font-size:64px; }
  .ill{ position:absolute; z-index:2; }
  .ill img{ width:100%; height:100%; object-fit:contain; }

  /* statement: headline-art (headline TL, art BR) */
  .lay-headline-art{ display:flex; align-items:flex-start; padding-top:6px; }
  .lay-headline-art .h-xl{ max-width:13ch; }
  .ill-br{ width:352px; height:384px; right:0; bottom:0; }

  /* statement: art-headline (art left, headline right) */
  .lay-art-headline{ display:flex; align-items:center; gap:34px; }
  .ill-side{ position:relative; width:38%; height:60%; flex:none; }
  .lay-art-headline .h-lg{ flex:1; max-width:11ch; }

  /* statement: centered (art watermark behind, headline centered) */
  .lay-centered{ display:flex; align-items:center; justify-content:center; }
  .ill-watermark{ position:absolute; inset:0; margin:auto; width:74%; height:74%;
    opacity:.16; display:flex; align-items:center; justify-content:center; z-index:0; }
  .lay-centered .h-lg{ position:relative; z-index:2; max-width:15ch; }

  /* statement: fullbleed (large art, headline overlaid bottom w/ scrim) */
  .lay-fullbleed{ }
  .ill-fill{ position:absolute; inset:-2% 0 6% 0; display:flex; align-items:center; justify-content:center; opacity:.92; z-index:0; }
  .ill-fill svg, .ill-fill .phone-wrap{ width:78%; height:88%; }
  .fb-scrim{ position:absolute; inset:0; z-index:1;
    background:linear-gradient(0deg, rgba(3,2,8,.96) 6%, rgba(3,2,8,.5) 34%, transparent 60%); }
  .fb-head{ position:absolute; left:0; right:0; bottom:0; z-index:2; max-width:14ch; }

  /* statement: bottom-heavy (art top, big headline bottom) */
  .lay-bottom-heavy{ display:flex; flex-direction:column; justify-content:space-between; }
  .ill-top{ position:relative; width:300px; height:300px; margin:6px 0 0 4px; }
  .bh-head{ max-width:13ch; }

  /* body shared */
  .lay-body{ display:flex; }
  .body-col{ width:60%; display:flex; flex-direction:column; padding-top:22px; }
  .body-col-right{ margin-left:auto; }
  .lay-body .h-md{ margin-bottom:10px; max-width:9ch; }
  .blocks-wrap{ flex:1; display:flex; align-items:center; }
  .blocks{ display:flex; flex-direction:column; gap:30px; max-width:520px; }
  .block{ border-left:2px solid var(--accent); padding-left:24px; }
  .block p{ font-size:31px; line-height:1.4; color:#e7e2f5; }
  .rule{ height:1px; background:linear-gradient(90deg, var(--accent-glow), transparent 62%); }
  .ill-mid-right{ width:44%; right:0; top:50%; transform:translateY(-50%); height:720px;
    display:flex; align-items:center; justify-content:center; }
  .ill-mid-left{ width:44%; left:0; top:50%; transform:translateY(-50%); height:720px;
    display:flex; align-items:center; justify-content:center; }

  /* body: art-watermark */
  .lay-body-wm{ display:block; padding-top:22px; }
  .wm-right{ inset:auto; right:-4%; top:18%; width:62%; height:62%; opacity:.13;
    display:flex; align-items:center; justify-content:center; }
  .lay-body-wm .h-md{ position:relative; z-index:2; max-width:12ch; margin-bottom:24px; }
  .wm-wrap{ position:relative; z-index:2; display:block; }
  .wm-blocks{ max-width:70%; }

  /* body: stacked (2-col blocks, small corner art) */
  .lay-body-stacked{ display:block; padding-top:18px; }
  .ill-corner{ width:150px; height:150px; right:0; top:0; }
  .st-h{ max-width:13ch; margin-bottom:34px; }
  .blocks-2col{ display:grid; grid-template-columns:1fr 1fr; gap:30px 40px; max-width:100%; }
  .blocks-2col .rule{ display:none; }

  /* cta */
  .lay-cta{ height:100%; display:flex; }
  .cta-hex{ width:82px; height:82px; right:0; top:0; }
  .cta-block{ flex:1; display:flex; flex-direction:column; gap:28px; justify-content:center; }
  .cta-center .cta-block{ align-items:center; text-align:center; }
  .cta-left .cta-block{ align-items:flex-start; text-align:left; }
  .cta-h{ line-height:1.0; }
  .arrow{ color:var(--accent-bright); font-style:normal; text-shadow:0 0 26px var(--accent-glow); }
  .streak{ width:60%; height:2px; box-shadow:0 0 22px var(--accent-glow);
    background:radial-gradient(closest-side, var(--accent-bright), transparent); }
  .cta-left .streak{ width:42%; }
  .cta-sub{ font-family:'Space Mono', monospace; font-size:31px; letter-spacing:.05em; color:var(--accent-soft); }
  .cta-body{ max-width:62%; }
  .cta-body p{ font-size:32px; line-height:1.4; color:#e7e2f5; }
  .cta-left .cta-body p{ text-align:left; }

  /* stat */
  .lay-stat{ display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:18px; }
  .stat-num{ font-family:'Playfair Display', serif; font-weight:600; font-size:300px; line-height:.86;
    background:linear-gradient(180deg, var(--em-hi), var(--em-mid) 52%, var(--em-lo));
    -webkit-background-clip:text; background-clip:text; color:transparent;
    filter:drop-shadow(0 0 40px var(--accent-glow)); letter-spacing:-.02em; }
  .stat-cap{ font-family:'Lora', serif; font-size:40px; line-height:1.34; color:#e7e2f5; max-width:17ch; }

  /* quote */
  .lay-quote{ display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; }
  .q-mark{ font-family:'Playfair Display', serif; font-size:200px; line-height:.5; height:96px;
    color:var(--accent); opacity:.9; text-shadow:0 0 40px var(--accent-glow); }
  .q-text{ font-family:'Playfair Display', serif; font-weight:500; font-size:74px; line-height:1.08;
    color:#f4f1fb; max-width:15ch; text-shadow:0 0 46px var(--accent-glow); }
  .q-cite{ font-family:'Space Mono', monospace; font-size:26px; letter-spacing:.08em;
    color:var(--accent-soft); margin-top:36px; }

  /* list */
  .lay-list{ display:flex; flex-direction:column; padding-top:16px; }
  .list-h{ max-width:14ch; margin-bottom:30px; }
  .list-rows{ flex:1; display:flex; flex-direction:column; justify-content:center; gap:4px; }
  .list-row{ display:flex; align-items:baseline; gap:26px; padding:24px 0; border-top:1px solid rgba(255,255,255,.10); }
  .list-row:last-child{ border-bottom:1px solid rgba(255,255,255,.10); }
  .li-n{ font-family:'Space Mono', monospace; font-size:32px; color:var(--accent-bright);
    text-shadow:0 0 18px var(--accent-glow); flex:none; width:54px; }
  .li-t{ font-family:'Lora', serif; font-size:36px; line-height:1.28; color:#ece8f7; }

  /* compare */
  .lay-compare{ display:flex; flex-direction:column; justify-content:center; gap:42px; }
  .cmp-h{ max-width:18ch; }
  .cmp-grid{ display:flex; align-items:stretch; gap:22px; }
  .cmp-col{ flex:1; border-radius:18px; padding:34px 30px; }
  .cmp-old{ border:1px dashed rgba(255,255,255,.22); background:rgba(255,255,255,.02); }
  .cmp-new{ border:1px solid var(--accent); background:rgba(255,255,255,.02);
    box-shadow:0 0 36px -8px var(--accent-glow); }
  .cmp-tag{ font-family:'Space Mono', monospace; font-size:24px; letter-spacing:.1em;
    text-transform:uppercase; margin-bottom:18px; }
  .cmp-old .cmp-tag{ color:#8a8499; }
  .cmp-new .cmp-tag{ color:var(--accent-soft); }
  .cmp-col p{ font-family:'Lora', serif; font-size:32px; line-height:1.34; }
  .cmp-old p{ color:#9c97aa; }
  .cmp-new p{ color:#f1edfb; }
  .cmp-vs{ align-self:center; font-family:'Playfair Display', serif; font-size:54px;
    color:var(--accent-bright); text-shadow:0 0 22px var(--accent-glow); flex:none; }
`;
