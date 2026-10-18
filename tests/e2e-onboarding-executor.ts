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
    page.setDefaultTimeout(12_000);
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`console: ${message.text()}`);
    });
    page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
    page.on('response', (response) => {
      if (response.url().includes('/api/')) {
        const status = response.status();
        if (status >= 400) errors.push(`api:${status} ${response.request().method()} ${response.url()}`);
      }
      if (response.request().method() === 'POST' && /\/api\/cases(?:\/anonymous)?$/.test(new URL(response.url()).pathname)) {
        void response.json().then((payload) => {
          if (payload?.id) result.persistedCaseId = payload.id;
        }).catch(() => undefined);
      }
    });
    // Safe matrix mode: exercise the real public UI through the QR checkpoint
    // without creating a real VenoPag charge. The production endpoint is
    // covered separately by route-contract tests and explicit operator
    // confirmation is required before any live PIX request.
    if (process.env.E2E_ALLOW_REAL_PAYMENT !== 'true') {
      await page.route('**/api/payments/pix/create', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            simulated: true,
            gateway: 'e2e-mock',
            amount: 44.95,
            status: 'aguardando_pagamento',
            txId: `e2e-mock-${testCase.id}`,
            pixCopyPasteString: '000201E2E-MOCK-PIX',
            qrCodeDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
          }),
        });
      });
    }
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
    await page.goto(`${BASE_URL}/novo-caso`, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    await waitForStep(page, 1, 15_000);
    const cookieAccept = page.getByRole('button', { name: /Aceitar e Continuar/i });
    if (await cookieAccept.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await cookieAccept.click();
    }

    // Step 1: Service Selection
    timestamps.step1_start = new Date().toISOString();
    const serviceSelector = getServiceSelector(testCase.serviceType);
    await page.click(serviceSelector);
    const skipsStage = testCase.serviceType === 'conversao_advertencia' || testCase.serviceType === 'indicacao_condutor';
    if (!skipsStage) await waitForStep(page, 2);
    timestamps.step1_end = new Date().toISOString();

    // Step 2: Stage Selection (may be skipped for some services)
    timestamps.step2_start = new Date().toISOString();
    if (!skipsStage) {
      const stageSelector = getStageSelector(testCase.procedureType);
      await page.click(stageSelector);
      await waitForStep(page, 3);
    } else {
      // These services infer both stage and category from step 1.
      await waitForStep(page, 4);
    }
    timestamps.step2_end = new Date().toISOString();

    // Step 3: Category Selection
    timestamps.step3_start = new Date().toISOString();
    if (testCase.serviceType !== 'conversao_advertencia' && testCase.serviceType !== 'indicacao_condutor') {
      const categorySelector = getCategorySelector(testCase.infraction.infractionCode);
      await page.click(categorySelector);
      // A seleção do card já dispara onNext e avança automaticamente.
      await waitForStep(page, 4);
    }
    timestamps.step3_end = new Date().toISOString();

    // Step 4: Identification Form
    timestamps.step4_start = new Date().toISOString();
    await fillInput(page, 'input-lead-name', testCase.applicant.applicantName);
    await fillInput(page, 'input-lead-phone', testCase.applicant.applicantPhone);
    await fillInput(page, 'input-ait-number', testCase.infraction.aitNumber);
    await fillInput(page, 'input-vehicle-plate', testCase.vehicle.plate);
    await selectNativeOption(page, 'input-infraction-code', testCase.infraction.infractionCode);
    // Órgão é combobox/datalist, não um <select> nativo.
    await fillInput(page, 'input-autuador-body', testCase.infraction.autuadorBody);
    await fillInput(page, 'input-datetime', testCase.infraction.dateTime.split('T')[0]);
    await fillInput(page, 'input-location', testCase.infraction.location);
    await fillInput(page, 'input-notification-expedition-date', normalizeDateInput(testCase.infraction.notificationExpeditionDate));
    await fillInput(page, 'input-defense-deadline', normalizeDateInput(testCase.infraction.defenseDeadline));
    
    // Check if next button is enabled and click
    await page.waitForSelector('#btn-next-to-specifics', { state: 'visible' });
    await page.click('#btn-next-to-specifics');
    await waitForStep(page, 5);
    timestamps.step4_end = new Date().toISOString();

    // Step 5: Technical Details (varies by infraction type)
    timestamps.step5_start = new Date().toISOString();
    await fillTechnicalDetails(page, { ...testCase.infraction, serviceType: testCase.serviceType });
    timestamps.step5_end = new Date().toISOString();

    // Step 6: Run Analysis. Observe the write response before waiting for UI
    // transition so API failures and UI/backend divergence are distinguished.
    timestamps.analysis_start = new Date().toISOString();
    await page.waitForSelector('#btn-run-analysis', { state: 'visible', timeout: 10_000 });
    const analysisRequestStarted = Date.now();
    const anonymousSavePromise = page.waitForResponse(
      (response) => response.request().method() === 'POST'
        && new URL(response.url()).pathname.endsWith('/api/cases/anonymous'),
      { timeout: 45_000 },
    );
    await page.locator('#btn-run-analysis').click();
    let anonymousResponse;
    try {
      anonymousResponse = await anonymousSavePromise;
    } catch (error) {
      throw new Error(`ANALYSIS_API_TIMEOUT after ${Date.now() - analysisRequestStarted}ms: POST /api/cases/anonymous did not return; stopping without retry to avoid duplicate writes. ${error instanceof Error ? error.message : String(error)}`);
    }
    const anonymousBodyText = await anonymousResponse.text().catch(() => '');
    let anonymousPayload: any = {};
    try { anonymousPayload = JSON.parse(anonymousBodyText); } catch { /* preserve bounded response evidence below */ }
    if (!anonymousResponse.ok()) {
      throw new Error(`ANALYSIS_API_FAILED after ${Date.now() - analysisRequestStarted}ms: HTTP ${anonymousResponse.status()} ${anonymousBodyText.slice(0, 500)}`);
    }
    const canonicalCaseId = anonymousPayload?.id ?? anonymousPayload?.case?.id ?? anonymousPayload?.data?.id;
    if (typeof canonicalCaseId !== 'string' || !canonicalCaseId) {
      throw new Error(`ANALYSIS_API_INVALID_RESPONSE: HTTP ${anonymousResponse.status()} returned no canonical case ID; response=${anonymousBodyText.slice(0, 500)}`);
    }
    result.persistedCaseId = canonicalCaseId;
    timestamps.analysis_api_completed = new Date().toISOString();
    result.timestamps!.analysis_api_duration_ms = String(Date.now() - analysisRequestStarted);

    // API succeeded; if this checkpoint fails, report UI/backend divergence
    // explicitly and never submit the analysis request a second time.
    try {
      await waitForStep(page, 7, 45_000);
    } catch (error) {
      throw new Error(`ANALYSIS_UI_DIVERGENCE: API returned HTTP ${anonymousResponse.status()} and case ${canonicalCaseId} was persisted, but UI did not reach step 7 within 45000ms. ${error instanceof Error ? error.message : String(error)}`);
    }
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
        // Production validates Supabase authentication; the localStorage
        // fallback is intentionally not treated as a real session. Reuse the
        // synthetic account created for this case and complete the real login.
        await page.locator('button[role="tab"]').filter({ hasText: 'Já Tenho Conta' }).click({ force: true });
        const authEmail = page.locator('input[type="email"]');
        const authPassword = page.locator('input[type="password"]');
        await authEmail.last().fill(testCase.email);
        await authPassword.last().fill(testCase.password);
        await page.locator('button[type="submit"]').last().click({ force: true });
        await waitForStep(page, 8, 10000);
      }
    }

    // Step 8: Fill qualification data
    await fillInput(page, 'input-applicant-name', testCase.applicant.applicantName);
    await fillInput(page, 'input-applicant-cpf', testCase.applicant.applicantCpf);
    await fillInput(page, 'input-applicant-rg', testCase.applicant.applicantRg || '123456789');
    await fillInput(page, 'input-applicant-cnh', testCase.applicant.applicantCnh);
    await selectNativeOption(page, 'input-cnh-category', testCase.applicant.cnhCategory || 'B');
    await fillInput(page, 'input-applicant-email', testCase.applicant.applicantEmail);
    await fillInput(page, 'input-applicant-phone', testCase.applicant.applicantPhone);
    await fillInput(page, 'input-address-street', testCase.applicant.addressStreet);
    await fillInput(page, 'input-address-number', testCase.applicant.addressNumber);
    await fillInput(page, 'input-address-neighborhood', testCase.applicant.addressNeighborhood);
    await fillInput(page, 'input-address-zipcode', testCase.applicant.addressZipCode);
    await fillInput(page, 'input-address-citystate', testCase.applicant.addressCityState);
    if (testCase.procedureType === 'suspensao_cnh') {
      await fillInput(page, 'input-psdd-number', `PSDD-${testCase.infraction.aitNumber}`);
      await fillInput(page, 'input-suspension-months', '12');
    } else if (testCase.procedureType === 'cassacao_cnh') {
      await fillInput(page, 'input-pcdd-number', `PCDD-${testCase.infraction.aitNumber}`);
    }

    await page.click('#btn-next-to-review');
    await waitForStep(page, 9);
    
    // Step 9: Review
    await page.click('#btn-proceed-to-checkout');
    await waitForStep(page, 10);
    
    // Step 10: Checkout - verify document generated
    await expect(page.locator('text=Liberação da Petição')).toBeVisible({ timeout: 10000 });
    const generated = await page.evaluate(async ({ aitNumber, applicant }) => {
      const tokenKey = Object.keys(localStorage).find((key) => key.includes('-auth-token'));
      const tokenPayload = tokenKey ? JSON.parse(localStorage.getItem(tokenKey) || '{}') : {};
      const accessToken = tokenPayload.access_token;
      if (!accessToken) return { ok: false, status: 401, message: 'Sessão Supabase ausente no navegador' };
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` };
      const list = await fetch('/api/cases', { headers });
      const cases = await list.json();
      const target = Array.isArray(cases)
        ? cases.find((item: any) => item.infraction?.aitNumber === aitNumber || item.title?.includes(aitNumber))
        : null;
      if (!target?.id) return { ok: false, status: 404, message: 'Caso persistido não localizado após autenticação' };
      const response = await fetch(`/api/cases/${encodeURIComponent(target.id)}/generate-defense`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ applicantData: applicant }),
      });
      const rawBody = await response.text();
      let body: any = {};
      try { body = JSON.parse(rawBody); } catch { body = { raw: rawBody.slice(0, 1000) }; }
      return { ok: response.ok && Boolean(body.defenseDraft), status: response.status, caseId: target.id, body };
    }, {
      aitNumber: testCase.infraction.aitNumber,
      applicant: {
        name: testCase.applicant.applicantName,
        cpf: testCase.applicant.applicantCpf,
        rg: testCase.applicant.applicantRg || '123456789',
        cnh: testCase.applicant.applicantCnh,
        category: testCase.applicant.cnhCategory || 'B',
        address: `${testCase.applicant.addressStreet}, ${testCase.applicant.addressNumber}`,
        cityState: testCase.applicant.addressCityState,
        processNumbers: testCase.procedureType === 'suspensao_cnh'
          ? { psddNumber: `PSDD-${testCase.infraction.aitNumber}`, suspensionMonths: 12 }
          : testCase.procedureType === 'cassacao_cnh'
            ? { pcddNumber: `PCDD-${testCase.infraction.aitNumber}` }
            : undefined,
      },
    });
    if (!generated.ok) {
      errors.push(`document-generation:${generated.status} ${JSON.stringify(generated.body || generated.message)}`);
      result.document = 'FAIL';
    }
    await page.waitForTimeout(250);
    result.document = generated.ok ? 'PASS' : 'FAIL';
    timestamps.document_end = new Date().toISOString();

    if (process.env.E2E_STOP_AT_QR === '1' && generated.ok) {
      await expect(page.locator('img[alt*="QR Code PIX"]')).toBeVisible({ timeout: 30_000 });
      console.log(`[${testCase.testRunId}] Real PIX QR Code ready; waiting for operator payment.`);
      await new Promise<void>(() => undefined);
    }

    return result;
  } catch (error: any) {
    try {
      const safeId = testCase.id.replace(/[^a-zA-Z0-9-]/g, '');
      await page.screenshot({ path: `tests/e2e-results/${testCase.testRunId}/case-${safeId}-failure.png`, fullPage: true });
      errors.push(`body:${(await page.locator('body').innerText()).slice(-2000)}`);
    } catch {
      // Preserve the original failure if diagnostic capture is unavailable.
    }
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
    await selectNativeOption(page, 'select-celular-circunstancia', 'viva_voz');
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
