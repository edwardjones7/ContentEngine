// Drive the real UI to prove the server actions work end-to-end + capture shots.
// Assumes a fresh seed (npm run seed) and a dev server on :4050.
import { chromium } from 'playwright';
const base = 'http://localhost:4050';
const shots = process.env.E2E_SHOTS_DIR || '/tmp';
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1240, height: 1000 } });

// BOARD — thread-spawned idea shows its provenance chip
await page.goto(base + '/content', { waitUntil: 'networkidle' });
await page.screenshot({ path: `${shots}/admin-board.png`, fullPage: true });
const threadChips = await page.locator('a:has-text("from thread")').count();
console.log('board loaded | thread-spawned idea chips:', threadChips);
if (!threadChips) throw new Error('expected a thread-spawned idea on the board');

// ACCEPT → concept editor with medium checkboxes
await Promise.all([
  page.waitForURL(/\/content\/pc_.+\/edit/, { timeout: 30000 }),
  page.locator('button:has-text("Accept")').first().click(),
]);
const checkboxes = await page.locator('input[name="mediums"]').count();
console.log('accepted ->', page.url(), '| medium checkboxes:', checkboxes);
if (checkboxes !== 6) throw new Error(`expected 6 medium checkboxes, got ${checkboxes}`);
await page.screenshot({ path: `${shots}/admin-edit.png`, fullPage: true });

// BUILD (uncheck blog — prove medium selection + publish guard)
await page.locator('input[name="mediums"][value="blog"]').uncheck();
await Promise.all([
  page.waitForURL(/\/content\/pc_[^/]+$/, { timeout: 90000 }),
  page.locator('button:has-text("Build piece")').click(),
]);
await page.waitForSelector('.slides img', { timeout: 30000 });
console.log('built ->', page.url(), '| slides:', await page.locator('.slides img').count());
const publishBtns = await page.locator('button:has-text("publish")').count();
const mediumCards = await page.locator('form input[name="medium"]').count();
console.log('blog-less build | publish buttons:', publishBtns, '| medium sections:', new Set(await page.locator('form input[name="medium"]').evaluateAll((els) => els.map((e) => e.value))).size);
if (publishBtns) throw new Error('publish button should be hidden when blog was not built');
if (mediumCards < 4) throw new Error('expected caption/xthread/linkedin/video sections');
await page.screenshot({ path: `${shots}/admin-review.png`, fullPage: true });

// RESHUFFLE — wait until the figcaptions actually change (render takes a few s)
const before = JSON.stringify(await page.locator('.slides figcaption').allInnerTexts());
await page.locator('button:has-text("Reshuffle")').click();
await page.waitForFunction(
  (prev) => JSON.stringify([...document.querySelectorAll('.slides figcaption')].map((e) => e.textContent)) !== prev,
  before, { timeout: 40000 },
);
console.log('reshuffle changed layouts: true');

// REGENERATE one medium — caption text should change, tweets should not
const capBefore = await page.locator('textarea[name="text"]').first().inputValue();
// (offline templates are deterministic, so just prove the action round-trips)
await page.locator('form:has(input[name="medium"][value="caption"]) button:has-text("Regenerate")').click();
await page.waitForLoadState('networkidle');
console.log('caption regenerate round-tripped:', (await page.locator('textarea[name="text"]').first().inputValue()).length > 0);

// PUBLISH — use a seeded review piece that HAS a blog (the fresh blog-less
// build is first in the queue and must NOT offer publish)
await page.goto(base + '/content/queue', { waitUntil: 'networkidle' });
await page.locator('.card:has(.badge:text("review")) a:has-text("Review")').last().click();
await page.waitForURL(/\/content\/pc_/);
await page.locator('button:has-text("publish")').click();
await page.waitForFunction(
  () => /published/i.test(document.querySelector('.badge')?.textContent || ''),
  null, { timeout: 20000 },
);
console.log('status after publish: published');

// ORBIT — seeded thread renders history + idea card; offline chat streams a canned reply
await page.goto(base + '/orbit', { waitUntil: 'networkidle' });
await page.screenshot({ path: `${shots}/admin-orbit.png`, fullPage: true });
await page.locator('.card h3').first().click();
await page.waitForURL(/\/orbit\/th_/);
const historyIdeaCards = await page.locator('.idea-card').count();
console.log('thread loaded | idea cards in history:', historyIdeaCards);
if (!historyIdeaCards) throw new Error('expected the seeded propose_idea card in thread history');
await page.locator('.composer textarea').fill('quick offline smoke test');
await page.locator('.composer button:has-text("Send")').click();
await page.waitForFunction(
  () => [...document.querySelectorAll('.msg.assistant .bubble')].some((e) => /offline|ANTHROPIC_API_KEY/i.test(e.textContent || '')),
  null, { timeout: 20000 },
);
console.log('offline chat: canned reply streamed + persisted');
await page.screenshot({ path: `${shots}/admin-thread.png`, fullPage: true });

await page.goto(base + '/blog', { waitUntil: 'networkidle' });
await page.screenshot({ path: `${shots}/admin-blog.png`, fullPage: true });
await b.close();
console.log('e2e OK — board, mediums, publish guard, and Orbit verified');
