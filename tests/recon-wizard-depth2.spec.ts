/**
 * @file tests/recon-wizard-depth2.spec.ts
 * Continue: mapping steps after identification (specifics → analysis → checkout).
 */
import { test, Page } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

async function dumpState(page: Page, label: string) {
  const heading = await page.locator('h1, h2, h3').first().textContent().catch(() => 'n/a');
  console.log(`\n=== ${label} | heading: ${heading?.trim()} | url: ${page.url()} ===`);
  const btns = await page.locator('button').all();
  const btnInfo: string[] = [];
  for (const b of btns) {
    if (await b.isVisible().catch(() => false)) {
      const id = await b.getAttribute('id').catch(() => null);
      const txt = ((await b.textContent().catch(() => '')) || '').trim().split('\n')[0].slice(0, 45);
      if (txt) btnInfo.push(`${id ? '#' + id : ''} "${txt}"`);
    }
  }
  console.log('BUTTONS:', btnInfo.filter(b => !b.includes('A-') && !b.includes('A"') && !b.includes('A+')).slice(0, 30).join(' | '));
  const inputs = await page.locator('input, textarea, select').all();
  const inInfo: string[] = [];
  for (const i of inputs) {
    if (await i.isVisible().catch(() => false)) {
      const id = await i.getAttribute('id').catch(() => null);
      const ph = await i.getAttribute('placeholder').catch(() => null);
      inInfo.push(`${id ? '#' + id : ''}${ph ? ' ph="' + ph.slice(0, 30) + '"' : ''}`);
    }
  }
  console.log('INPUTS:', inInfo.slice(0, 25).join(' | '));
}

test('recon: wizard after identification', async ({ page }) => {
  page.on('response', async resp => {
    if (resp.url().includes('/api/') && !resp.url().includes('.tsx')) {
      console.log(`[api] ${resp.status()} ${resp.url().split('?')[0].replace('http://localhost:3000','')}`);
    }
  });

  await page.goto(`${BASE_URL}/novo-caso`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(800);
  await page.locator('#service-option-multa_transito').click();
  await page.waitForTimeout(800);
  await page.locator('#stage-option-primeira_notificacao').click();
  await page.waitForTimeout(800);
  await page.locator('#category-card-excesso_velocidade').click();
  await page.waitForTimeout(800);

  // Step 4: identification — fill fields
  await page.locator('#input-lead-name').fill('Maria Silva Pereira');
  await page.locator('#input-ait-number').fill('AUD7894561');
  await page.locator('#input-vehicle-plate').fill('XYZ9F20');
  await page.locator('#input-infraction-code').selectOption({ label: /745-50|velocidade/i }).catch(async () => {
    // fallback: select by first option containing 745
    const opts = await page.locator('#input-infraction-code option').allTextContents();
    console.log('[debug] infraction-code options:', opts.slice(0, 10));
    const target = opts.find(o => o.includes('745-50') || o.includes('745'));
    if (target) await page.locator('#input-infraction-code').selectOption({ label: target });
  });
  await page.locator('#input-datetime').fill('2024-06-15T10:30');
  await page.locator('#input-location').fill('Av. Paulista, 1000 - São Paulo/SP');
  await dumpState(page, 'IDENTIFICATION filled');
  await page.locator('#btn-next-to-specifics').click();
  await page.waitForTimeout(1200);
  await dumpState(page, 'SPECIFICS/QUESTIONS');

  // Try next buttons
  for (let i = 0; i < 6; i++) {
    const next = page.locator('[id*="btn-next"], [id*="continue"], [id*="proceed"], [id*="analyze"], [id*="analysis"]').first();
    if (await next.isVisible().catch(() => false)) {
      const id = await next.getAttribute('id');
      const txt = ((await next.textContent()).trim() || '').split('\n')[0].slice(0, 40);
      console.log(`\n>>> clicking ${id} "${txt}"`);
      await next.click();
      await page.waitForTimeout(2500);
      await dumpState(page, `AFTER ${id}`);
    } else {
      console.log(`\n>>> no more next buttons (iter ${i})`);
      break;
    }
  }
});