// Programmatic entry point for the slide system — used by the engine.
// (render.mjs is the CLI; this is the importable library surface.)
import { chromium } from 'playwright';
import { artDirect } from './art-director.mjs';
import { renderSlideHTML } from './template.mjs';

let _browser = null;
async function getBrowser() {
  if (!_browser) _browser = await chromium.launch();
  return _browser;
}
export async function closeBrowser() {
  if (_browser) { await _browser.close(); _browser = null; }
}

// Art-direct a raw carousel spec, then render every slide to a clean PNG buffer.
// Returns { carousel, slides:[{index,label,type,layout,png:Buffer}] }.
export async function renderCarousel(rawCarousel, { width = 1080, height = 1350, seed = 0 } = {}) {
  const carousel = artDirect(rawCarousel, seed);
  const browser = await getBrowser();
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const slides = [];
  try {
    for (const s of carousel.slides) {
      const html = renderSlideHTML(s, { width, height });
      await page.setContent(html, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const png = await page.screenshot({ type: 'png' });
      slides.push({ index: s.index, label: s.label, type: s.type, layout: s.layout, png });
    }
  } finally {
    await page.close();
  }
  return { carousel, slides };
}

export { artDirect } from './art-director.mjs';
export { validateCarousel } from './validate.mjs';
export { THEME_NAMES, BACKGROUNDS } from './themes.mjs';
