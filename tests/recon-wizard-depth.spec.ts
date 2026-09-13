/**
 * @file tests/recon-wizard-depth.spec.ts
 * Exploratory: map the full wizard step flow from service selection to checkout.
 * Logs step titles + visible buttons/inputs at each stage.
 */
import { test, Page } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

async function dumpState(page: Page, label: string) {
  const heading = await page.locator('h1, h2, h3').first().textContent().catch(() => 'n/a');
  console.log(`\n=== ${label} | heading: ${heading?.trim()} | url: ${page.url()} ===`);

  // visible buttons
  const btns = await page.locator('button').all();
  const btnInfo: string[] = [];
  for (const b of btns) {
    if (await b.isVisible().catch(() => false)) {
      const id = await b.getAttribute('id').catch(() => null);
      const txt = ((await b.textContent().catch(() => '')) || '').trim().split('\n')[0].slice(0, 40);
      btnInfo.push(`${id ? '#' + id : ''} "${txt}"`);
    }
  }
  console.log('BUTTONS:', btnInfo.slice(0, 25).join(' | '));

  // visible inputs
  const inputs = await page.locator('input, textarea, select').all();
  const inInfo: string[] = [];
  for (const i of inputs) {
    if (await i.isVisible().catch(() => false)) {
      const id = await i.getAttribute('id').catch(() => null);
      const ph = await i.getAttribute('placeholder').catch(() => null);
      inInfo.push(`${id ? '#' + id : ''}${ph ? ' ph="' + ph.slice(0, 25) + '"' : ''}`);
    }
  }
  console.log('INPUTS:', inInfo.slice(0, 20).join(' | '));
}

test('recon: map full wizard flow', async ({ page }) => {
  page.on('console', msg => console.log(`[console] ${msg.type()}: ${msg.text().slice(0, 150)}`));
  page.on('response', async resp => {
    if (resp.url().includes('/api/')) {
      console.log(`[api] ${resp.status()} ${resp.url().includes('/api/cases') ? '/api/cases' : resp.url().split('?')[0]}`);
    }
  });

  await page.goto(`${BASE_URL}/novo-caso`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1000);
  await dumpState(page, 'STEP1 service');

  // service multa_transito
  await page.locator('#service-option-multa_transito').click();
  await page.waitForTimeout(1200);
  await dumpState(page, 'STEP2 after service');

  // stage primeira_notificacao if visible
  const stage = page.locator('#stage-option-primeira_notificacao');
  if (await stage.isVisible().catch(() => false)) { await stage.click(); await page.waitForTimeout(1200); }
  await dumpState(page, 'STEP3 after stage');

  // category excesso_velocidade
  const cat = page.locator('[id*="categor"], [data-category], [id*="excesso"]').first();
  if (await cat.isVisible().catch(() => false)) { await cat.click(); await page.waitForTimeout(1200); }
  await dumpState(page, 'STEP4 after category');

  // Try clicking every primary next button repeatedly
  for (let i = 0; i < 8; i++) {
    const next = page.locator('[id*="btn-next"], [id*="continue"], [id*="proceed"], text=Continuar, text=Avançar, text=Próximo').first();
    if (await next.isVisible().catch(() => false)) {
      console.log(`\n>>> clicking next #${i}`);
      await next.click();
      await page.waitForTimeout(1500);
      await dumpState(page, `STEP after next#${i}`);
    } else {
      console.log(`\n>>> no next button at iter ${i}`);
      break;
    }
  }
});
