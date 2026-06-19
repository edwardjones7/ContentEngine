// Screenshot the running engine portal pages (helper for review).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const base = 'http://localhost:4040';
const db = JSON.parse(readFileSync(new URL('../engine/data/db.json', import.meta.url)));
const draft = db.pieces.find((p) => p.status === 'draft') || db.pieces[0];
const slug = db.published[0]?.slug || '';

const shots = [
  ['/', 'home'],
  ['/queue', 'queue'],
  [`/piece/${draft.id}`, 'review'],
  [`/blog/${slug}`, 'blog'],
];

const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1200, height: 1000 }, deviceScaleFactor: 1 });
for (const [path, name] of shots) {
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `/tmp/portal-${name}.png`, fullPage: true });
  console.log('shot', name, path);
}
await b.close();
