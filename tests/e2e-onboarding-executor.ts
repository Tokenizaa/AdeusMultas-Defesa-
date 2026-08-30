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
    7: 'Diagnóstico Jurídico Gratuito Concluído',
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
    onboarding: 'PASS',
    analysis: 'FAIL',
    document: 'FAIL',
    pdf: 'SKIP',
    contamination: 'SKIP',
    errors: [],
    timestamps: {},
  };

  const timestamps = result.timestamps!;
  const errors = result.errors!;

  try {
    // Login via localStorage (dev auth fallback)
    await forceLocalAuth(page, {
      id: testCase.userId,
      name: testCase.applicant.applicantName,
      email: testCase.email,
      cpf: testCase.applicant.applicantCpf,
      phone: testCase.applicant.applicantPhone,
      role: 'user',
    });

    // Navigate to onboarding
    timestamps.navigation = new Date().toISOString();
    await page.goto(`${BASE_URL}/novo-caso`, { waitUntil: 'networkidle' });
    await waitForStep(page, 1);

    // Step 1: Service Selection
    timestamps.step1_start = new Date().toISOString();
    const serviceSelector = getServiceSelector(testCase.serviceType);
    await page.click(serviceSelector);
    await waitForStep(page, 2);
    timestamps.step1_end = new Date().toISOString();

    // Step 2: Stage Selection (may be skipped for some services)
    timestamps.step2_start = new Date().toISOString();
    if (testCase.serviceType !== 'conversao_advertencia' && testCase.serviceType !== 'indicacao_condutor') {
      const stageSelector = getStageSelector(testCase.procedureType);
      await page.click(stageSelector);
      await waitForStep(page, 3);
    } else {
      // These services skip stage selection
      await waitForStep(page, 3);
    }
    timestamps.step2_end = new Date().toISOString();

    // Step 3: Category Selection
    timestamps.step3_start = new Date().toISOString();
    const categorySelector = getCategorySelector(testCase.infraction.infractionCode);
    await page.click(categorySelector);
    
    // Some categories auto-advance, some need next button
    if (testCase.infraction.infractionCode === '745-50' || testCase.infraction.infractionCode === '747-10') {
      await page.click('#btn-next-to-identification');
    }
    await waitForStep(page, 4);
    timestamps.step3_end = new Date().toISOString();

    // Step 4: Identification Form
    timestamps.step4_start = new Date().toISOString();
    await fillInput(page, 'input-lead-name', testCase.applicant.applicantName);
    await fillInput(page, 'input-lead-phone', testCase.applicant.applicantPhone);
    await fillInput(page, 'input-ait-number', testCase.infraction.aitNumber);
    await fillInput(page, 'input-vehicle-plate', testCase.vehicle.plate);
    await selectNativeOption(page, 'input-infraction-code', testCase.infraction.infractionCode);
    await selectNativeOption(page, 'input-autuador-body', testCase.infraction.autuadorBody);
    await fillInput(page, 'input-datetime', testCase.infraction.dateTime.split('T')[0]);
    
    // Check if next button is enabled and click
    await page.waitForSelector('#btn-next-to-specifics', { state: 'visible' });
    await page.click('#btn-next-to-specifics');
    await waitForStep(page, 5);
    timestamps.step4_end = new Date().toISOString();

    // Step 5: Technical Details (varies by infraction type)
    timestamps.step5_start = new Date().toISOString();
    await fillTechnicalDetails(page, testCase.infraction);
    timestamps.step5_end = new Date().toISOString();

    // Step 6: Run Analysis
    timestamps.analysis_start = new Date().toISOString();
    await page.waitForSelector('#btn-run-analysis', { state: 'visible', timeout: 10000 });
    await page.click('#btn-run-analysis', { force: true });
    
    // Wait for analysis to complete (step 6 -> step 7)
    await waitForStep(page, 7, 60000);
    timestamps.analysis_end = new Date().toISOString();

    // Verify analysis results
    await expect(page.locator('text=Probabilidade de Êxito')).toBeVisible({ timeout: 10000 });
    result.analysis = 'PASS';

    // Step 7 -> Step 8: Proceed to document generation
    timestamps.document_start = new Date().toISOString();
    await page.click('#btn-proceed-to-document-generation');
    
    // Wait for step 8 (qualification step) - may have auth gate
    try {
      await waitForStep(page, 8, 30000);
    } catch {
      // Check for auth gate
      const authGate = page.locator('h2:has-text("Acesso à Sua Defesa Jurídica")');
      if (await authGate.isVisible({ timeout: 5000 })) {
        // Already logged in via localStorage, should auto-proceed
        await page.waitForTimeout(2000);
        await waitForStep(page, 8, 10000);
      }
    }

    // Step 8: Fill qualification data
    await fillInput(page, 'input-applicant-name', testCase.applicant.applicantName);
    await fillInput(page, 'input-applicant-cpf', testCase.applicant.applicantCpf);
    await fillInput(page, 'input-applicant-cnh', testCase.applicant.applicantCnh);
    await selectNativeOption(page, 'input-cnh-category', testCase.applicant.cnhCategory || 'B');
    await fillInput(page, 'input-applicant-email', testCase.applicant.applicantEmail);
    await fillInput(page, 'input-applicant-phone', testCase.applicant.applicantPhone);
    await fillInput(page, 'input-address-street', testCase.applicant.addressStreet);
    await fillInput(page, 'input-address-number', testCase.applicant.addressNumber);
    await fillInput(page, 'input-address-neighborhood', testCase.applicant.addressNeighborhood);
    await fillInput(page, 'input-address-zipcode', testCase.applicant.addressZipCode);
    await fillInput(page, 'input-address-citystate', testCase.applicant.addressCityState);

    await page.click('#btn-next-to-review');
    await waitForStep(page, 9);
    
    // Step 9: Review
    await page.click('#btn-proceed-to-checkout');
    await waitForStep(page, 10);
    
    // Step 10: Checkout - verify document generated
    await expect(page.locator('text=Liberação da Petição')).toBeVisible({ timeout: 10000 });
    result.document = 'PASS';
    timestamps.document_end = new Date().toISOString();

    return result;
  } catch (error: any) {
    errors.push(`Onboarding failed: ${error.message}`);
    result.onboarding = 'FAIL';
    return result;
  }
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
    '736-62': '#category-card-celular',
    '746-30': '#category-card-vermelho',
    '735-80': '#category-card-excesso_velocidade',
    '666-10': '#category-card-estacionamento',
  };
  return mapping[infractionCode] || '#category-card-excesso_velocidade';
}

async function fillTechnicalDetails(page: Page, infraction: any) {
  const code = infraction.infractionCode;
  
  if (code === '745-50' || code === '747-10' || code === '735-80') {
    // Speed infraction
    await fillInput(page, 'input-speed-limit', String(infraction.speedLimit || 60));
    await fillInput(page, 'input-measured-speed', String(infraction.measuredSpeed || 73));
    // considered speed is auto-calculated
  } else if (code === '516-91' || code === '516-92') {
    // Lei Seca
    await page.waitForSelector('#select-termo-sinais', { state: 'visible', timeout: 5000 });
    await selectNativeOption(page, 'select-termo-sinais', 'nao');
    await selectNativeOption(page, 'select-reteste', 'nao_oferecido');
  } else if (code === '736-62') {
    // Celular
    await page.waitForSelector('#select-celular-circunstancia', { state: 'visible', timeout: 5000 });
    await selectNativeOption(page, 'select-celular-circunstancia', 'mao_livre');
    await selectNativeOption(page, 'select-abordagem', 'sem_abordagem');
  } else if (code === '746-30') {
    // Sinal vermelho
    await page.waitForSelector('#select-amarelo', { state: 'visible', timeout: 5000 });
    await selectNativeOption(page, 'select-amarelo', 'nao');
    await selectNativeOption(page, 'select-emergencia', 'nao');
  } else if (code === '666-10') {
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
    localStorage.setItem('defesai_auth_session_v1', JSON.stringify(mockUser));
  }, user);
}

export { BASE_URL };