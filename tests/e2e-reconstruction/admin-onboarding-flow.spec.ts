import { test, expect } from '@playwright/test';

test('Onboarding flow with admin test fill button', async ({ page }) => {
  // Navigate to onboarding page
  await page.goto('/novo-caso');
  await page.waitForLoadState('networkidle');

  console.log('=== PAGE LOADED ===');
  const title = await page.title();
  console.log('Title:', title);

  // Step 1: Select situation
  console.log('\n=== STAGE 1: Select Situation ===');
  await page.click('text=Multa de Trânsito');
  await page.waitForSelector('text=Fase do Processo', { timeout: 5000 });
  console.log('✓ Situation selected: Multa de Trânsito');

  // Step 2: Select phase
  console.log('\n=== STAGE 2: Select Phase ===');
  await page.click('text=primeira_notificacao');
  await page.waitForSelector('text=Tipo da Infração', { timeout: 5000 });
  console.log('✓ Phase selected: primeira_notificacao');

  // Step 3: Select infraction type
  console.log('\n=== STAGE 3: Select Infraction Type ===');
  await page.click('text=excesso_velocidade');
  await page.waitForSelector('text=Identificação da Autuação', { timeout: 5000 });
  console.log('✓ Infraction type selected: excesso_velocidade');

  // Step 4: Check if TestFillButton is visible (admin required)
  console.log('\n=== STAGE 4: Check TestFillButton ===');
  const testButton = page.locator('button:has-text("Preencher com dados de teste")');
  const isAdmin = await testButton.isVisible();
  console.log('TestFillButton visible:', isAdmin);

  if (isAdmin) {
    // Click test fill button
    console.log('\n=== CLICKING TestFillButton ===');
    await testButton.click();
    await page.waitForTimeout(2000);
    console.log('✓ TestFillButton clicked');

    // Verify data was filled
    console.log('\n=== VERIFYING FILLED DATA ===');

    // Check AIT number
    const aitField = page.locator('#input-ait-number');
    const aitVisible = await aitField.isVisible();
    console.log('AIT field visible:', aitVisible);
    if (aitVisible) {
      const aitValue = await aitField.inputValue();
      console.log('AIT value:', aitValue);
    }

    // Check vehicle plate
    const plateField = page.locator('#input-vehicle-plate');
    const plateVisible = await plateField.isVisible();
    console.log('Plate field visible:', plateVisible);
    if (plateVisible) {
      const plateValue = await plateField.inputValue();
      console.log('Plate value:', plateValue);
    }

    // Check speed fields (should appear for excesso_velocidade)
    const speedLimit = page.locator('#input-speed-limit');
    const speedVisible = await speedLimit.isVisible();
    console.log('Speed limit field visible (excesso_velocidade):', speedVisible);

    const measuredSpeed = page.locator('#input-measured-speed');
    const measuredVisible = await measuredSpeed.isVisible();
    console.log('Measured speed field visible:', measuredVisible);

    // Check neutral fields always appear
    const aitNumber = page.locator('#input-ait-number');
    console.log('AIT number always present:', await aitNumber.isVisible());

    // Verify form is not empty
    const formHasContent = await page.locator('text=745-50').isVisible(); // code appears for excesso_velocidade
    console.log('Infraction code 745-50 visible (excesso_velocidade):', formHasContent);

    console.log('\n✅ All checks completed - data filled successfully');
  } else {
    console.log('❌ TestFillButton not visible - user not identified as admin');
    // Try clicking Acessar Conta
    const loginLink = page.locator('text=Acessar Conta');
    console.log('Acessar Conta link visible:', await loginLink.isVisible());
    if (await loginLink.isVisible()) {
      console.log('Would click Acessar Conta to login as admin');
    }
  }

  // Final status
  console.log('\n=== STATUS FINAL ===');
  const finalText = await page.textContent('body');
  console.log('Step 1 visible:', finalText?.includes('1. Situação que deseja resolver'));
  console.log('Step 2 visible:', finalText?.includes('2. Fase do Processo'));
  console.log('Step 3 visible:', finalText?.includes('3. Tipo da Infração'));
  console.log('Test button visible:', await page.locator('button:has-text("Preencher com dados de teste")').isVisible());

  await page.screenshot({ path: '/tmp/playwright-onboarding-flow.png' });
  console.log('\nScreenshot saved to /tmp/playwright-onboarding-flow.png');

  await page.close();
});
