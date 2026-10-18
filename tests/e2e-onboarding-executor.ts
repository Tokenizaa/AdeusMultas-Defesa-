/**
 * E2E Onboarding Flow Executor
 * Uses Playwright to execute the complete onboarding flow for each test case
 */

import { Page, expect, BrowserContext } from '@playwright/test';
import path from 'path';

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
  document: 'PASS' | 'FAIL';
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
function getStepTitle(step: number): string {
  const titles: Record<number, string> = {
    1: 'Qual situação você quer resolver?',
    2: 'Em que situação está sua multa?',
    3: 'Sobre o tipo da infração',
    4: 'Qual é o auto de infração e o condutor?',
    5: 'Detalhes técnicos da sua autuação',
    6: 'Processando Análise Jurídica',
    7: 'Diagnóstico Preliminar Concluído',
    8: 'Qualificação do Requerente para a Peça',
    9: 'Revisão dos Dados da Petição',
    10: 'Liberação da Petição & Checklist de Protocolo',
  };
  return titles[step] || `Etapa ${step}`;
}

async function waitForStep(page: Page, step: number, timeout = 30000) {
  const title = getStepTitle(step);
  await expect(
    page.locator(`h1:has-text("${title}"), h2:has-text("${title}"), h3:has-text("${title}")`)
  ).toBeVisible({ timeout });
}

async function fillInput(page: Page, id: string, value: string) {
  await page.fill(`#${id}`, value);
  await page.waitForTimeout(100);
}

function normalizeDateInput(value?: string): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
}

async function selectNativeOption(page: Page, id: string, value: string) {
  await page.waitForFunction(
    ([sel, val]) => {
      const el = document.querySelector(sel) as HTMLSelectElement | null;
      return !!el && Array.from(el.options).some((o) => o.value === val);
    },
    [`#${id}`, value]
  );
  await page.selectOption(`#${id}`, value);
  await page.waitForTimeout(100);
}

async function clickAndWait(page: Page, selector: string, nextStep: number) {
  await page.click(selector);
  await waitForStep(page, nextStep);
}

/**
 * Execute the complete onboarding flow for a test case
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
  await page.goto(`${BASE_URL}/novo-caso-rebuild`, { waitUntil: 'domcontentloaded', timeout: 15_000 });
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
  if (testCase.infraction.dateTime) {
    await page.getByLabel('Data e hora da infração').fill(String(testCase.infraction.dateTime).slice(0, 16));
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

function getServiceSelector(serviceType: string): string {
  const mapping: Record<string, string> = {
    'defesa_previa': '#service-option-multa_transito', // maps to multa_transito with primeira_notificacao
    'recurso_jari': '#service-option-multa_transito',
    'recurso_cetran': '#service-option-multa_transito',
    'suspensao': '#service-option-suspensao_cnh',
    'cassacao': '#service-option-cassacao_cnh',
    'indicacao_condutor': '#service-option-indicacao_condutor',
    'conversao_advertencia': '#service-option-conversao_advertencia',
  };
  return mapping[serviceType] || '#service-option-multa_transito';
}

function getStageSelector(procedureType: string): string {
  const mapping: Record<string, string> = {
    'defesa_previa': '#stage-option-primeira_notificacao',
    'recurso_jari': '#stage-option-notificacao_penalidade',
    'recurso_cetran': '#stage-option-recurso_jari_negado',
    'suspensao_cnh': '#stage-option-notificacao_penalidade',
    'cassacao_cnh': '#stage-option-notificacao_penalidade',
  };
  return mapping[procedureType] || '#stage-option-notificacao_penalidade';
}

function getCategorySelector(infractionCode: string): string {
  const mapping: Record<string, string> = {
    '745-50': '#category-card-excesso_velocidade',
    '747-10': '#category-card-excesso_velocidade',
    '516-91': '#category-card-lei_seca',
    '516-92': '#category-card-lei_seca',
    '757-90': '#category-card-lei_seca',
    '736-62': '#category-card-celular',
    '746-30': '#category-card-excesso_velocidade',
    '605-01': '#category-card-vermelho',
    '545-21': '#category-card-estacionamento',
  };
  return mapping[infractionCode] || '#category-card-excesso_velocidade';
}

async function fillTechnicalDetails(page: Page, infraction: any) {
  const code = infraction.infractionCode;
  if (infraction.serviceType === 'conversao_advertencia' || infraction.category === 'conversao_advertencia') {
    await page.locator('#chk-no-reoffense').check();
    return;
  }
  if (infraction.serviceType === 'indicacao_condutor' || infraction.category === 'indicacao_condutor') {
    await fillInput(page, 'input-real-driver-name', 'CONDUTOR INDICADO E2E');
    await fillInput(page, 'input-real-driver-cpf', '12345678909');
    await fillInput(page, 'input-real-driver-cnh', '98765432100');
    await selectNativeOption(page, 'select-indication-deadline', 'sim');
    return;
  }
  if (code === '745-50' || code === '746-30' || code === '747-10') {
    // Speed infraction
    await fillInput(page, 'input-speed-limit', String(infraction.speedLimit || 60));
    await fillInput(page, 'input-measured-speed', String(infraction.measuredSpeed || 73));
    // considered speed is auto-calculated
  } else if (code === '757-90') {
    // Art. 165-A: recusa sem sinais ou com apenas um sinal.
    await page.waitForSelector('#select-termo-sinais', { state: 'visible', timeout: 5000 });
    await selectNativeOption(page, 'select-termo-sinais', 'sem_sinais');
    await selectNativeOption(page, 'select-reteste', 'nao_oferecido');
  } else if (code === '516-91' || code === '516-92') {
    // Arts. 165 / 165: require a documented positive finding; the current
    // harness lacks a structured result field, so this remains an oracle gap.
    await page.waitForSelector('#select-termo-sinais', { state: 'visible', timeout: 5000 });
    await selectNativeOption(page, 'select-termo-sinais', 'entregue');
    await selectNativeOption(page, 'select-reteste', 'oferecido');
  } else if (code === '736-62') {
    // Celular
    await page.waitForSelector('#select-celular-circunstancia', { state: 'visible', timeout: 5000 });
    await selectNativeOption(page, 'select-celular-circunstancia', 'fone_conectado');
  } else if (code === '605-01') {
    // Sinal vermelho
    await page.waitForSelector('#select-vermelho-motivo', { state: 'visible', timeout: 5000 });
    await selectNativeOption(page, 'select-vermelho-motivo', 'amarelo_rapido');
    await selectNativeOption(page, 'select-photo-proof', 'nao');
  } else if (code === '666-10' || code === '545-21') {
    // Estacionamento
    await page.waitForSelector('#select-estacionamento', { state: 'visible', timeout: 5000 });
    await selectNativeOption(page, 'select-estacionamento', 'sinalizacao_irregular');
  }
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

async function forceLocalAuth(page: Page, user: Record<string, unknown>) {
  await page.addInitScript((mockUser) => {
    // Each matrix case must start as a new onboarding session. Cookies are
    // cleared by the runner, but sessionStorage survives across pages in the
    // same BrowserContext and can restore the previous wizard step/case.
    sessionStorage.clear();
    // The runner reuses a BrowserContext for speed. Remove any previous
    // Supabase session before installing the synthetic local fallback, or a
    // later case may authenticate as the first user and contaminate the run.
    for (const key of Object.keys(localStorage)) {
      if (key.includes('-auth-token') || key === 'supabase.auth.token') {
        localStorage.removeItem(key);
      }
    }
    localStorage.setItem('defesai_auth_session_v1', JSON.stringify(mockUser));
  }, user);
}

export { BASE_URL };
