// Render every carousel in carousels/*.json to clean PNGs at Instagram 4:5.
//   node render.mjs                       -> renders all carousels
//   node render.mjs speed-to-lead         -> renders one (by slug / filename)
//
// Output: out/<slug>/<NN>-<label>.png   (single set — reuse for IG, TikTok, etc.)
import { chromium } from 'playwright';
import { readFileSync, readdirSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderSlideHTML } from './template.mjs';
import { artDirect } from './art-director.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const SIZE = { width: 1080, height: 1350 }; // Instagram 4:5 portrait — most feed real estate
const carouselDir = resolve(here, 'carousels');

const only = process.argv[2];
const files = readdirSync(carouselDir)
  .filter((f) => f.endsWith('.json'))
  .filter((f) => !only || basename(f, '.json') === only || f.includes(only))
  .sort();

if (!files.length) {
  console.error(only ? `No carousel matched "${only}".` : 'No carousels in carousels/.');
  process.exit(1);
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const browser = await chromium.launch();
let made = 0;
try {
  const page = await browser.newPage({ viewport: SIZE, deviceScaleFactor: 1 });
  for (const file of files) {
    const raw = JSON.parse(readFileSync(resolve(carouselDir, file), 'utf8'));
    const carousel = artDirect({ ...raw, slug: raw.slug || basename(file, '.json') });
    const { slug: dirSlug, title, theme, bg, slides } = carousel;
    const outDir = resolve(here, 'out', dirSlug);
    if (existsSync(outDir)) rmSync(outDir, { recursive: true }); // redo cleanly
    mkdirSync(outDir, { recursive: true });
    console.log(`\n▸ ${dirSlug}  [${theme} · ${bg}]${title ? `  — ${title}` : ''}`);
    for (const s2 of slides) {
      const html = renderSlideHTML(s2, SIZE);
      await page.setContent(html, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const n = String(s2.index).padStart(2, '0');
      const file2 = resolve(outDir, `${n}-${slug(s2.label)}.png`);
      const buf = await page.screenshot({ type: 'png' });
      writeFileSync(file2, buf);
      made++;
      console.log(`  ✓ ${n}-${(s2.label || s2.type).padEnd(12)} ${(s2.type + '/' + s2.layout).padEnd(28)} (${(buf.length / 1024).toFixed(0)} KB)`);
    }
  }
  await page.close();
} finally {
  await browser.close();
}
console.log(`\nRendered ${made} PNG(s) into out/. Verify:  node verify-metadata.mjs`);
