import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

async function blockSupabaseRequests(page: Page) {
  await page.route('**/*', (route) => {
    const url = route.request().url();
    try {
      const hostname = new URL(url).hostname;
      if (hostname.endsWith('supabase.co') || hostname.includes('.supabase.co')) {
        return route.abort();
      }
    } catch (_) {}
    return route.continue();
  });
}

async function forceLocalAuth(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('defesai_auth_session_v1', JSON.stringify({ name: 'Test Admin', phone: '11990000001', role: 'admin' }));
    localStorage.removeItem('defesai_wizard_state');
  });
}

async function navigateToOnboarding(page: Page) {
  await page.goto(`${BASE_URL}/novo-caso`, { waitUntil: 'networkidle' });
}

test('debug wizard flow', async ({ page }) => {
  await forceLocalAuth(page);
  await blockSupabaseRequests(page);
  await navigateToOnboarding(page);
  
  console.log('At step 1');
  
  // Step 1
  await page.click('#service-option-multa_transito');
  await page.waitForTimeout(500);
  console.log('Clicked service');
  
  // Step 2
  await page.click('#stage-option-primeira_notificacao');
  await page.waitForTimeout(500);
  console.log('Clicked stage');
  
  // Step 3
  await page.click('#category-card-excesso_velocidade');
  await page.waitForTimeout(500);
  console.log('Clicked category');
  
  await page.click('#btn-next-to-identification');
  await page.waitForTimeout(1000);
  console.log('Clicked next to identification');
  
  // Check step 4 state
  const nameInput = page.locator('#input-lead-name');
  await nameInput.waitFor({ state: 'visible', timeout: 10000 });
  console.log('Step 4 visible, filling form');
  
  // Fill identification
  await nameInput.fill('Carlos Eduardo Silva');
  await page.waitForTimeout(200);
  
  const phoneInput = page.locator('#input-lead-phone');
  await phoneInput.fill('11987654321');
  await page.waitForTimeout(200);
  
  const aitInput = page.locator('#input-ait-number');
  await aitInput.fill('1B892014');
  await page.waitForTimeout(200);
  
  const plateInput = page.locator('#input-vehicle-plate');
  await plateInput.fill('BRA2E19');
  await page.waitForTimeout(200);
  
  // Wait for infraction code options to load
  await page.waitForFunction(() => {
    const sel = document.querySelector('#input-infraction-code') as HTMLSelectElement | null;
    return sel && Array.from(sel.options).some(o => o.value === '745-50');
  }, { timeout: 10000 });
  await page.selectOption('#input-infraction-code', '745-50');
  await page.waitForTimeout(200);
  
  const dateInput = page.locator('#input-datetime');
  await dateInput.fill('2024-01-15');
  await page.waitForTimeout(200);
  
  const locationInput = page.locator('#input-location');
  await locationInput.fill('Av. Paulista, 1000 - São Paulo/SP');
  await page.waitForTimeout(200);
  
  // Check button state
  const nextBtn = page.locator('#btn-next-to-specifics');
  await nextBtn.waitFor({ state: 'visible', timeout: 5000 });
  const isDisabled = await nextBtn.isDisabled();
  console.log('Next button disabled?', isDisabled);
  
  // Check test fill button
  const testFillBtn = page.locator('button:has-text("Preencher com dados de teste")');
  const testFillCount = await testFillBtn.count();
  console.log('TestFillButton count:', testFillCount);
  
  if (testFillCount > 0) {
    console.log('Clicking TestFillButton');
    await testFillBtn.click();
    await page.waitForTimeout(1000);
    const isDisabledAfter = await nextBtn.isDisabled();
    console.log('Next button disabled after TestFill?', isDisabledAfter);
  }
  
  console.log('Done - form filled');
});
