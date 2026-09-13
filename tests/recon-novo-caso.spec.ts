/**
 * @file tests/recon-novo-caso.spec.ts
 * RECON PILOT — exploratory Playwright run against the real /novo-caso flow.
 * NOT part of the audit suite; used to discover real selectors.
 */
import { test, Page } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test('recon: novo-caso step 1 selectors', async ({ page }) => {
  await page.goto(`${BASE_URL}/novo-caso`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);
  console.log('[recon] URL:', page.url());
  console.log('[recon] title:', await page.title());

  const h1 = page.locator('h1, h2, h3').first();
  console.log('[recon] first heading:', await h1.textContent().catch(() => 'n/a'));

  // service option buttons
  const serviceBtns = page.locator('[id^="service-option-"]');
  console.log('[recon] service buttons:', await serviceBtns.count());
  for (let i = 0; i < Math.min(await serviceBtns.count(), 6); i++) {
    const id = await serviceBtns.nth(i).getAttribute('id');
    const text = (await serviceBtns.nth(i).textContent() || '').trim().split('\n')[0];
    console.log(`[recon]   #${id} → ${text.slice(0, 50)}`);
  }
});