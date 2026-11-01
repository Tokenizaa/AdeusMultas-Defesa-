import 'dotenv/config';
import { expect, type Page } from '@playwright/test';
export type CanonicalService = { id: string; situationId: string; stageId?: string; categoryId: string; procedure: string };
const configuredBaseURL = process.env.PLAYWRIGHT_BASE_URL;
if (!configuredBaseURL) throw new Error('PLAYWRIGHT_BASE_URL ausente; localhost não é fallback.');
export const baseURL: string = configuredBaseURL;
export const runId = (process.env.E2E_TEST_RUN_ID || 'e2e') + '-' + new Date().toISOString().replace(/[^0-9TZ]/g, '');
if (!/^https?:\/\//i.test(baseURL)) throw new Error('PLAYWRIGHT_BASE_URL deve ser HTTP(S).');
export function synthetic(label: string) {
  const suffix = (runId + '-' + label + '-' + Date.now().toString(36)).replace(/[^a-z0-9-]/gi, '').slice(-24);
  return { name: 'E2E ' + suffix, phone: '11987654321', plate: 'BRA2E19', authority: 'DETRAN-SP', location: 'Av. Paulista, 1000 - São Paulo/SP (' + suffix + ')', aitNumber: 'AIT-' + suffix.toUpperCase() };
}
export async function openService(page: Page, service: CanonicalService) {
  await page.goto(new URL('/novo-caso', baseURL).toString());
  // Handle onboarding start screen - click "Começar" to proceed to service selection
  const startScreen = page.locator('[aria-labelledby="onboarding-start-title"]');
  const startScreenVisible = await startScreen.isVisible();
  if (startScreenVisible) {
    await startScreen.getByRole('button', { name: 'Começar' }).click();
    // Wait for the service option to be visible
    await expect(page.locator('#service-option-' + service.situationId)).toBeVisible({ timeout: 5000 });
  } else {
    await expect(page.locator('#service-option-' + service.situationId)).toBeVisible({ timeout: 10000 });
  }
  await page.locator('#service-option-' + service.situationId).click();
  if (service.stageId) {
    await expect(page.locator('#stage-option-' + service.stageId)).toBeVisible();
    await page.locator('#stage-option-' + service.stageId).click();
  }
  // Only wait for category card if category step is not skipped (no defaultInfractionCategory)
  // Services like indicacao_condutor and conversao_advertencia auto-select their category
  if (service.categoryId && service.situationId !== 'indicacao_condutor' && service.situationId !== 'conversao_advertencia') {
    await expect(page.locator('#category-card-' + service.categoryId)).toBeVisible();
    await page.locator('#category-card-' + service.categoryId).click();
  }
  await expect(page.locator('#input-lead-name')).toBeVisible({ timeout: 10000 });
}
export async function fillIdentification(page: Page, label: string, overrides: Partial<ReturnType<typeof synthetic>> = {}) {
  const data = { ...synthetic(label), ...overrides };
  await page.locator('#input-lead-name').fill(data.name);
  await page.locator('#input-ait-number').fill(data.aitNumber);
  await page.locator('#input-lead-phone').fill(data.phone);
  await page.locator('#input-vehicle-plate').fill(data.plate);
  await page.locator('#input-autuador-body').fill(data.authority);
  await page.locator('#input-location').fill(data.location);
  // Fill date time - required for form validation (isFormValid check)
  // Use Brazilian date format dd/mm/aaaa inside the input, but set ISO YYYY-MM-DD value
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const day = String(yesterday.getDate()).padStart(2, '0');
  const month = String(yesterday.getMonth() + 1).padStart(2, '0');
  const year = yesterday.getFullYear();
  const brazilianDate = `${day}/${month}/${year}`;
  await page.locator('#input-datetime').fill(brazilianDate);
  // Dispatch change event to update React state (BrazilianDateInput expects dd/mm/aaaa format)
  await page.evaluate((sel) => {
    const input = document.querySelector(sel);
    if (input) {
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, '#input-datetime');
  const code = page.locator('#input-infraction-code');
  const values = await code.locator('option').evaluateAll(items => items.map(item => (item as HTMLOptionElement).value).filter(value => value.length >= 3));
  if (!values.length) throw new Error('Catálogo de infrações sem opções selecionáveis.');
  await code.selectOption(values[0]);
  return data;
}
export async function createCaseThroughAnalysis(page: Page, label: string, service: CanonicalService) {
  if (process.env.E2E_ALLOW_PERSISTENT_WRITES !== 'true') throw new Error('BLOCKED: E2E_ALLOW_PERSISTENT_WRITES=true é obrigatório antes de criar casos persistentes.');
  const input = await fillIdentification(page, label);
  await expect(page.locator('#btn-next-to-specifics')).toBeEnabled();
  await page.locator('#btn-next-to-specifics').click();
  await expect(page.getByText('Perguntas configuradas para este tipo de autuação')).toBeVisible();
  const responsePromise = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/cases/anonymous', { timeout: 45_000 });
  await page.locator('#btn-run-analysis').click();
  await expect(page.getByText('Estamos conferindo a sua autuação')).toBeVisible({ timeout: 15_000 });
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  const body = await response.json();
  expect(body.id).toBeTruthy();
  expect(body.serviceType).toBe(service.procedure);
  expect(body.claimToken).toBeTruthy();
  expect(body.claimToken).not.toBe(body.id);
  await expect(page.getByText(/Diagnóstico Preliminar Concluído/)).toBeVisible({ timeout: 30_000 });
  return { id: String(body.id), body, input };
}
export async function continueAfterReload(page: Page) {
  // After page reload, React state resets. If sessionStorage has saved progress,
  // the OnboardingStartScreen shows with "Continuar de onde parei" button.
  const startScreen = page.locator('[aria-labelledby="onboarding-start-title"]');
  const startScreenVisible = await startScreen.isVisible({ timeout: 5000 });
  if (startScreenVisible) {
    await startScreen.getByRole('button', { name: 'Continuar de onde parei' }).click();
    await expect(page.getByText(/Diagnóstico Preliminar Concluído/)).toBeVisible({ timeout: 30_000 });
  }
}

export async function expectNoPiiInWizardStorage(page: Page) {
  const state = await page.evaluate(() => sessionStorage.getItem('defesai_wizard_state'));
  if (state) {
    expect(state).not.toContain('11987654321');
    expect(state).not.toContain('BRA2E19');
    expect(state).not.toContain('E2E ');
  }
}
