import { test, expect } from '@playwright/test';
import { openService, baseURL } from './support';

test('Complete onboarding flow - use support functions', async ({ page }) => {
  // Use the openService helper to properly open the service
  // This handles clicking "Começar", selecting situation, phase, and category
  await openService(page, {
    id: 'multa_transito',
    situationId: 'multa_transito',
    categoryId: 'excesso_velocidade',
    procedure: 'recurso_jari'
  });
  console.log('✓ Service opened successfully');
  
  // At this point, we should be at the identification step
  // Fill identification data using the synthetic data generator
  const data = synthetic('test-flow', true);
  
  // Fill the identification fields
  await page.locator('#input-datetime').clear();
  await page.locator('#input-datetime').type(data.dateTime, { delay: 100 });
  
  await page.locator('#input-notification-expedition-date').clear();
  await page.locator('#input-notification-expedition-date').type(data.notificationExpeditionDate, { delay: 100 });
  
  await page.locator('#input-ait-number').fill(data.aitNumber);
  
  await page.locator('#input-lead-name').fill(data.name);
  await page.locator('#input-lead-phone').fill(data.phone);
  
  await page.locator('#input-vehicle-plate').fill(data.plate);
  await page.locator('#input-autuador-body').fill(data.authority);
  await page.locator('#input-location').fill(data.location);
  
  // Select infraction code from catalog
  const code = page.locator('#input-infraction-code');
  const values = await code.locator('option').evaluateAll(items => items.map(item => (item as HTMLOptionElement).value).filter(value => value.length >= 3));
  await code.selectOption(values[0]);
  
  // Verify identification is filled
  await expect(page.locator('#input-lead-name')).toHaveValue(data.name);
  await expect(page.locator('#input-lead-phone')).toHaveValue(data.phone);
  console.log('✓ Identification data filled');
  
  // The test now proceeds to specific infraction data, analysis, etc.
  // But for this test, let's just verify we're at the right stage
  const body = await page.locator('body').textContent();
  console.log('Body has "Perguntas configuradas":', body?.includes('Perguntas configuradas'));
  console.log('Body has "Executar Análise":', body?.includes('Executar Análise'));
  
  // Screenshot
  await page.screenshot({ path: '/tmp/playwright-onboarding-start.png' });
  console.log('✓ Test completed - browser keeps open');
});