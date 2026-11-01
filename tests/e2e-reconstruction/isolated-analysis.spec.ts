import { test, expect } from '@playwright/test';

test('Isolated analysis click', async ({ page }) => {
  await page.goto('/novo-caso');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Começar' }).click();
  await page.waitForTimeout(1000);
  await page.locator('#service-option-multa_transito').click();
  await page.waitForTimeout(1000);
  await page.click('text=Recebi a primeira notificação (Sem boleto)');
  await page.waitForTimeout(1000);
  await page.click('text=Velocidade / Radar');
  await page.waitForTimeout(1000);
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
  await page.getByRole('button', { name: 'Continuar para Perguntas do Caso' }).click();
  await page.waitForTimeout(1000);
  
  // Try clicking #btn-run-analysis
  console.log('Trying #btn-run-analysis...');
  await page.locator('#btn-run-analysis').click();
  console.log('✓ Clicked #btn-run-analysis');
  
  await page.waitForSelector('text=Processando análise', { timeout: 5000 });
  await page.waitForTimeout(5000);
  console.log('✓ Analysis started');
});
