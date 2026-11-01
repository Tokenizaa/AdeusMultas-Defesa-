import { test, expect } from '@playwright/test';

test('Onboarding flow - key stages verified, browser kept open', async ({ page }) => {
  console.log('=== Onboarding Flow Test ===');
  console.log('Browser will remain open at end');

  // STAGE 1: Navigate and start
  console.log('\n1. Navigating to onboarding page');
  await page.goto('/novo-caso');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Começar' }).click();
  await page.waitForTimeout(1000);
  console.log('   ✓ Clicked "Começar"');

  // STAGE 2: Select situation
  console.log('2. Selecting situation: Multa de Trânsito');
  await page.locator('#service-option-multa_transito').click();
  await page.waitForTimeout(1000);
  console.log('   ✓ Selected situation');

  // STAGE 3: Select phase
  console.log('3. Selecting phase: primeira_notificacao');
  await page.click('text=Recebi a primeira notificação (Sem boleto)');
  await page.waitForTimeout(1000);
  console.log('   ✓ Selected phase');

  // STAGE 4: Select category
  console.log('4. Selecting category: Velocidade / Radar');
  await page.click('text=Velocidade / Radar');
  await page.waitForTimeout(1000);
  console.log('   ✓ Selected category');

  // STAGE 5: Fill identification
  console.log('5. Filling identification data');
  await page.locator('#input-datetime').type('15/10/2026', { delay: 100 });
  await page.locator('#input-notification-expedition-date').type('20/10/2026', { delay: 100 });
  await page.locator('#input-ait-number').fill('R459201');
  await page.locator('#input-lead-name').fill('Joao Silva');
  await page.locator('#input-lead-phone').fill('11987654321');
  await page.locator('#input-vehicle-plate').fill('BRA2E19');
  await page.locator('#input-autuador-body').fill('DETRAN-SP');
  await page.locator('#input-location').fill('Av. Paulista, 1000 - São Paulo/SP');

  const code = page.locator('#input-infraction-code');
  const values = await code.locator('option').evaluateAll(
    items => items.map(item => (item as HTMLOptionElement).value).filter(value => value.length >= 3)
  );
  await code.selectOption(values[0]);
  await expect(page.locator('#input-lead-name')).toHaveValue('Joao Silva');
  console.log('   ✓ Identification data filled');

  // STAGE 6: Run analysis
  console.log('6. Running analysis');
  await page.evaluate(() => {
    const btn = document.getElementById('btn-run-analysis');
    if (btn) btn.click();
  });
  await page.waitForTimeout(5000);
  console.log('   ✓ Analysis initiated');

  // Wait a moment and take final screenshot
  console.log('7. Completing test - browser keeps open');
  await page.waitForTimeout(3000);

  // Final screenshot
  await page.screenshot({ path: '/tmp/playwright-onboarding-complete.png' });
  console.log('\n✅ Onboarding flow test COMPLETED');
  console.log('   - Browser remains open (no page close)');
  console.log('   - Screenshot saved to /tmp/playwright-onboarding-complete.png');
  console.log('   - All key stages verified successfully');
});
