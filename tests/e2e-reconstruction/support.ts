import 'dotenv/config';
import { expect, type Page } from '@playwright/test';
export type CanonicalService = { id: string; situationId: string; stageId?: string; categoryId: string; procedure: string };
export const baseURL = process.env.PLAYWRIGHT_BASE_URL;
export const runId = (process.env.E2E_TEST_RUN_ID || 'e2e') + '-' + new Date().toISOString().replace(/[^0-9TZ]/g, '');
if (!baseURL) throw new Error('PLAYWRIGHT_BASE_URL ausente; localhost não é fallback.');
if (!/^https?:\/\//i.test(baseURL)) throw new Error('PLAYWRIGHT_BASE_URL deve ser HTTP(S).');
export function synthetic(label: string) {
  const suffix = (runId + '-' + label + '-' + Date.now().toString(36)).replace(/[^a-z0-9-]/gi, '').slice(-24);
  return { name: 'E2E ' + suffix, phone: '11987654321', plate: 'BRA2E19', authority: 'DETRAN-SP', location: 'Av. Paulista, 1000 - São Paulo/SP (' + suffix + ')', aitNumber: 'AIT-' + suffix.toUpperCase() };
}
export async function openService(page: Page, service: CanonicalService) {
  await page.goto(new URL('/novo-caso', baseURL).toString());
  await expect(page.locator('#service-option-' + service.situationId)).toBeVisible();
  await page.locator('#service-option-' + service.situationId).click();
  if (service.stageId) {
    await expect(page.locator('#stage-option-' + service.stageId)).toBeVisible();
    await page.locator('#stage-option-' + service.stageId).click();
    await expect(page.locator('#category-card-' + service.categoryId)).toBeVisible();
    await page.locator('#category-card-' + service.categoryId).click();
  }
  await expect(page.locator('#input-lead-name')).toBeVisible();
}
export async function fillIdentification(page: Page, label: string, overrides: Partial<ReturnType<typeof synthetic>> = {}) {
  const data = { ...synthetic(label), ...overrides };
  await page.locator('#input-lead-name').fill(data.name);
  await page.locator('#input-ait-number').fill(data.aitNumber);
  await page.locator('#input-lead-phone').fill(data.phone);
  await page.locator('#input-vehicle-plate').fill(data.plate);
  await page.locator('#input-autuador-body').fill(data.authority);
  await page.locator('#input-location').fill(data.location);
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
  await expect(page.getByText('Analisando sua autuação com Inteligência Jurídica')).toBeVisible();
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
export async function expectNoPiiInWizardStorage(page: Page) {
  const state = await page.evaluate(() => sessionStorage.getItem('defesai_wizard_state'));
  if (state) {
    expect(state).not.toContain('11987654321');
    expect(state).not.toContain('BRA2E19');
    expect(state).not.toContain('E2E ');
  }
}
