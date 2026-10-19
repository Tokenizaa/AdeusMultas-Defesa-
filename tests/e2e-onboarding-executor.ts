/**
 * E2E Onboarding Flow Executor
 * Uses Playwright to execute the complete onboarding flow for each test case
 */

import { Page, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

export interface TestCaseData {
  id: string;
  userId: string;
  email: string;
  password: string;
  serviceType: string;
  scenario: string;
  procedureType: string;
  infraction: any;
  vehicle: any;
  applicant: any;
  testRunId: string;
}

export interface ExecutionResult {
  caseId: string;
  persistedCaseId?: string;
  userId: string;
  serviceType: string;
  scenario: string;
  procedureType: string;
  uf: string;
  autuador: string;
  onboarding: 'PASS' | 'FAIL';
  analysis: 'PASS' | 'FAIL';
  document: 'PASS' | 'FAIL' | 'SKIP';
  pdf: 'PASS' | 'FAIL' | 'SKIP';
  contamination: 'PASS' | 'FAIL' | 'SKIP';
  errors: string[];
  timestamps: Record<string, string>;
  analysisData?: any;
  documentData?: any;
}

/**
 * Step titles from actual UI components
 */
export async function executeOnboardingFlow(page: Page, testCase: TestCaseData): Promise<Partial<ExecutionResult>> {
  const result: Partial<ExecutionResult> = {
    caseId: testCase.id,
    userId: testCase.userId,
    serviceType: testCase.serviceType,
    scenario: testCase.scenario,
    procedureType: testCase.procedureType,
    uf: extractUF(testCase.applicant.addressCityState),
    autuador: testCase.infraction.autuadorBody,
    onboarding: 'FAIL',
    analysis: 'FAIL',
    document: 'SKIP',
    pdf: 'SKIP',
    contamination: 'SKIP',
    errors: [],
    timestamps: {},
  };
  const timestamps = result.timestamps!;
  const errors = result.errors!;

  page.setDefaultTimeout(12_000);
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

  timestamps.navigation = new Date().toISOString();
  await page.goto(`${BASE_URL}/novo-caso`, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'Informe os dados da autuação' })).toBeVisible({ timeout: 10_000 });

  // This harness certifies the actual new manual intake and stops at the
  // authentication/payment boundary. It never creates a PIX or tries to
  // bypass the authoritative paid-state gate.
  const intakeFields = [
    { label: /Número do auto de infração/, value: String(testCase.infraction.aitNumber).slice(0, 80) },
    { label: 'Código da infração', value: String(testCase.infraction.infractionCode).slice(0, 20) },
    { label: 'Local da infração', value: String(testCase.infraction.location || 'Local sintético de teste').slice(0, 240) },
    { label: 'Placa do veículo', value: String(testCase.vehicle.plate).replace(/\s+/g, '').toUpperCase().slice(0, 8) },
  ];
  timestamps.validation_start = new Date().toISOString();
  await page.getByRole('button', { name: 'Registrar dados' }).click();
  await expect(page.getByText('Informe o número do auto de infração.')).toBeVisible();
  await expect(page.getByText('Informe o código da infração.')).toBeVisible();
  await expect(page.getByText('Informe o local da infração com pelo menos 5 caracteres.')).toBeVisible();
  await expect(page.getByText('Informe uma placa válida com 7 ou 8 caracteres.')).toBeVisible();
  timestamps.validation_end = new Date().toISOString();

  for (const field of intakeFields) {
    await page.getByLabel(field.label).fill(field.value);
  }
  const autuador = page.getByLabel('Órgão autuador');
  if (testCase.infraction.autuadorBody) await autuador.fill(String(testCase.infraction.autuadorBody).slice(0, 120));
  if (typeof testCase.infraction.dateTime === 'string'
    && /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}/.test(testCase.infraction.dateTime)) {
    await page.getByLabel('Data e hora da infração').fill(testCase.infraction.dateTime.slice(0, 16));
  }
  if (testCase.vehicle.model) {
    await page.getByLabel('Marca e modelo').fill(String(testCase.vehicle.model).slice(0, 120));
  }
  await page.locator('#serviceType').selectOption(testCase.procedureType);

  const responseStartedAt = Date.now();
  const responsePromise = page.waitForResponse(
    (response) => response.request().method() === 'POST'
      && new URL(response.url()).pathname.endsWith('/api/cases/anonymous'),
    { timeout: 45_000 },
  );
  timestamps.submit_start = new Date().toISOString();
  await page.getByRole('button', { name: 'Registrar dados' }).click();

  let response;
  try {
    response = await responsePromise;
  } catch (error) {
    throw new Error(`INTAKE_API_TIMEOUT after ${Date.now() - responseStartedAt}ms: POST /api/cases/anonymous did not return. No retry was attempted to avoid duplicate writes. ${error instanceof Error ? error.message : String(error)}`);
  }
  const responseText = await response.text().catch(() => '');
  if (!response.ok()) {
    throw new Error(`INTAKE_API_FAILED after ${Date.now() - responseStartedAt}ms: HTTP ${response.status()} ${responseText.slice(0, 500)}`);
  }
  let payload: any;
  try { payload = JSON.parse(responseText); } catch {
    throw new Error(`INTAKE_API_INVALID_JSON: HTTP ${response.status()} body=${responseText.slice(0, 500)}`);
  }
  if (typeof payload?.id !== 'string' || !payload.id) {
    throw new Error(`INTAKE_API_INVALID_RESPONSE: missing canonical case ID. body=${responseText.slice(0, 500)}`);
  }
  result.persistedCaseId = payload.id;
  result.timestamps!.intake_api_duration_ms = String(Date.now() - responseStartedAt);
  timestamps.submit_end = new Date().toISOString();

  await expect(page.getByRole('heading', { name: 'Seu caso foi registrado' })).toBeVisible({ timeout: 8_000 });
  await expect(page.getByText(payload.id)).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('defesai_manual_onboarding_case_id'))).toBe(payload.id);
  expect(await page.evaluate(() => sessionStorage.getItem('defesai_manual_onboarding_claim_token'))).toMatch(/^[a-f0-9]{64}$/);
  await expect(page.getByRole('heading', { name: 'Próxima etapa: vincular à sua conta' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entrar para vincular' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Criar conta' })).toBeVisible();

  const analysis = payload.analysis;
  if (!analysis || analysis.recommendedProcedure !== testCase.procedureType) {
    throw new Error(`ANALYSIS_PROCEDURE_MISMATCH: expected ${testCase.procedureType}, got ${analysis?.recommendedProcedure ?? 'missing'}`);
  }
  result.analysisData = analysis;
  result.onboarding = 'PASS';
  result.analysis = 'PASS';
  result.document = 'SKIP';
  timestamps.completed = new Date().toISOString();
  return result;
}

function extractUF(cityState: string): string {
  if (cityState.includes('/')) {
    return cityState.split('/')[1].trim();
  }
  if (cityState.includes('-')) {
    const parts = cityState.split('-');
    if (parts.length === 2 && parts[1].trim().length === 2) {
      return parts[1].trim();
    }
  }
  return 'SP';
}

export { BASE_URL };
