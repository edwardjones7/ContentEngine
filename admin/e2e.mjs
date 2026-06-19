// Drive the real UI to prove the server actions work end-to-end + capture shots.
import { chromium } from 'playwright';
const base = 'http://localhost:4050';
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1240, height: 1000 } });

await page.goto(base + '/content', { waitUntil: 'networkidle' });
await page.screenshot({ path: '/tmp/admin-ideas.png', fullPage: true });

// GENERATE — server action renders slides then redirects
await Promise.all([
  page.waitForURL(/\/content\/pc_/, { timeout: 60000 }),
  page.locator('button:has-text("Generate piece")').first().click(),
]);
await page.waitForSelector('.slides img', { timeout: 30000 });
console.log('generated ->', page.url(), '| slides:', await page.locator('.slides img').count());
await page.screenshot({ path: '/tmp/admin-review.png', fullPage: true });

// RESHUFFLE — wait until the figcaptions actually change (render takes a few s)
const before = JSON.stringify(await page.locator('.slides figcaption').allInnerTexts());
await page.locator('button:has-text("Reshuffle")').click();
await page.waitForFunction(
  (prev) => JSON.stringify([...document.querySelectorAll('.slides figcaption')].map((e) => e.textContent)) !== prev,
  before, { timeout: 40000 },
);
console.log('reshuffle changed layouts: true');

// PUBLISH — wait for the badge to flip to published
await page.locator('button:has-text("Accept")').click();
await page.waitForFunction(
  () => /published/i.test(document.querySelector('.badge')?.textContent || ''),
  null, { timeout: 20000 },
);
console.log('status after publish: published');

await page.goto(base + '/blog', { waitUntil: 'networkidle' });
await page.screenshot({ path: '/tmp/admin-blog.png', fullPage: true });
await b.close();
console.log('e2e OK — all server actions verified');
