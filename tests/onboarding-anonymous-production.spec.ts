import { test, expect, type APIRequestContext } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RUN_ID = process.env.E2E_RUN_ID || `anonymous-${Date.now()}`;
let generatedAit: string | undefined;
let generatedCaseId: string | undefined;
let anonymousSaveResult = 'request not observed';
let saveResponseObserved = false;

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function supabaseRows(request: APIRequestContext, table: string, filter: string) {
  const url = `${required('SUPABASE_URL', SUPABASE_URL)}/rest/v1/${table}?select=*&${filter}`;
  const response = await request.get(url, {
    headers: {
      apikey: required('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY),
      Authorization: `Bearer ${required('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY)}`,
      'User-Agent': 'AdeusMultas-E2E/1.0 (server-side reconciliation)',
    },
  });
  expect(response.ok(), `${table} reconciliation failed: HTTP ${response.status()}`).toBeTruthy();
  return response.json() as Promise<Record<string, unknown>[]>;
}

test.describe.configure({ retries: 0 });

test.afterEach(async ({ request }) => {
  if (!generatedAit) return;
  if (!generatedCaseId) {
    const possibleResidue = await supabaseRows(request, 'cases', `ait_number=eq.${encodeURIComponent(generatedAit)}`);
    if (possibleResidue.length === 0) {
      console.log(`[E2E cleanup] verified no case residue for run AIT=${generatedAit}`);
      generatedAit = undefined;
      saveResponseObserved = false;
      anonymousSaveResult = 'request not observed';
      return;
    }
    throw new Error(`E2E cleanup pending: ${possibleResidue.length} row(s) exist for AIT=${generatedAit}, but no canonical case ID was captured. Refusing broad deletion; manual reconciliation required.`);
  }
  const key = required('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY);
  const identityCheck = await supabaseRows(request, 'cases', `id=eq.${encodeURIComponent(generatedCaseId)}&ait_number=eq.${encodeURIComponent(generatedAit)}`);
  if (identityCheck.length !== 1 || identityCheck[0].id !== generatedCaseId || identityCheck[0].ait_number !== generatedAit) {
    throw new Error(`E2E cleanup refused: canonical case identity mismatch for id=${generatedCaseId}, AIT=${generatedAit}.`);
  }
  const response = await request.delete(
    `${required('SUPABASE_URL', SUPABASE_URL)}/rest/v1/cases?id=eq.${encodeURIComponent(generatedCaseId)}&ait_number=eq.${encodeURIComponent(generatedAit)}`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: 'return=representation',
        'User-Agent': 'AdeusMultas-E2E/1.0 (server-side cleanup)',
      },
    },
  );
  expect(response.ok(), `E2E cleanup for generated case failed: HTTP ${response.status()}`).toBeTruthy();
  const deletedRows = await response.json() as Record<string, unknown>[];
  if (anonymousSaveResult.startsWith('HTTP 201')) {
    expect(deletedRows.length, 'E2E cleanup must remove the exact generated case').toBe(1);
  }
  generatedAit = undefined;
  generatedCaseId = undefined;
  saveResponseObserved = false;
  anonymousSaveResult = 'request not observed';
});

test('anonymous onboarding → authentication gate → safe stop before payment', async ({ page, request, context }) => {
  test.setTimeout(4 * 60_000);
  const baseUrl = required('PLAYWRIGHT_BASE_URL', BASE_URL);
  expect(baseUrl).toMatch(/^https:\/\//);

  await context.clearCookies();
  await page.goto('/novo-caso', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
  await page.reload({ waitUntil: 'domcontentloaded' });

  const ait = `ANON-${RUN_ID}`.replace(/[^A-Za-z0-9-]/g, '-').slice(0, 45);
  generatedAit = ait;
  const plate = `AN${String(Date.now()).slice(-5)}`.slice(0, 7);
  anonymousSaveResult = 'request not observed';
  page.on('response', async (response) => {
    if (!response.url().includes('/api/cases/anonymous')) return;
    saveResponseObserved = true;
    const bodyText = await response.text().catch(() => '');
    anonymousSaveResult = `HTTP ${response.status()} ${bodyText.slice(0, 300)}`;
    if (response.ok()) {
      try {
        const body = JSON.parse(bodyText);
        const id = body?.id ?? body?.case?.id ?? body?.data?.id;
        if (typeof id === 'string' && id.length > 0) generatedCaseId = id;
      } catch {
        // Keep the response evidence; cleanup must not guess a record by AIT.
      }
    }
  });

  await expect(page.getByRole('heading', { name: /Qual situação você quer resolver/i })).toBeVisible();
  await page.locator('#service-option-multa_transito').click();
  await expect(page.getByRole('heading', { name: /Em que situação está sua multa/i })).toBeVisible();
  await page.locator('#stage-option-primeira_notificacao').click();
  await expect(page.getByRole('heading', { name: /Sobre o tipo da infração/i })).toBeVisible();
  await page.locator('#category-card-excesso_velocidade').click();

  await expect(page.getByRole('heading', { name: /Qual é o auto de infração e o condutor/i })).toBeVisible();
  await page.locator('#input-lead-name').fill('Anonymous Golden Path');
  await page.locator('#input-lead-phone').fill('11999999999');
  await page.locator('#input-ait-number').fill(ait);
  await page.locator('#input-vehicle-plate').fill(plate);
  await page.locator('#input-infraction-code').selectOption('745-50');
  await page.locator('#input-location').fill('Av. Paulista, 1000 - São Paulo/SP');
  await page.locator('#btn-next-to-specifics').click();

  await expect(page.getByRole('heading', { name: /Detalhes técnicos da sua autuação/i })).toBeVisible();
  await page.locator('#input-speed-limit').fill('60');
  await page.locator('#input-measured-speed').fill('68');
  const analysisStartedAt = Date.now();
  const analysisResponsePromise = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().includes('/api/cases/anonymous'),
    { timeout: 45_000 },
  );
  await page.locator('#btn-run-analysis').click();
  await expect(page.getByRole('heading', { name: /Analisando sua autuação/i })).toBeVisible({ timeout: 8_000 });
  const analysisResponse = await analysisResponsePromise;
  anonymousSaveResult = `HTTP ${analysisResponse.status()} ${(await analysisResponse.text().catch(() => '')).slice(0, 300)}`;
  expect(analysisResponse.ok(), `anonymous analysis/save failed after ${Date.now() - analysisStartedAt}ms: ${anonymousSaveResult}`).toBeTruthy();
  const analysisPayload = await analysisResponse.json().catch(() => null) as Record<string, any> | null;
  const responseCaseId = analysisPayload?.id ?? analysisPayload?.case?.id ?? analysisPayload?.data?.id;
  expect(typeof responseCaseId, `analysis response must include persisted case ID: ${anonymousSaveResult}`).toBe('string');
  generatedCaseId = responseCaseId;
  await expect(page.getByRole('button', { name: /Gerar Minha Defesa/i })).toBeVisible({ timeout: 45_000 });
  await page.locator('#btn-proceed-to-document-generation').click();

  // Critical assertion: anonymous visitor must register before document/payment flow.
  await expect(page.getByRole('heading', { name: /Acesso à Sua Defesa Jurídica/i })).toBeVisible();
  await expect(page.getByText(/100% dos Dados Coletados Preservados/i)).toBeVisible();

  // Server reconciliation: case exists, remains unclaimed, and no payment order exists.
  const cases = await supabaseRows(request, 'cases', `ait_number=eq.${encodeURIComponent(ait)}`);
  expect(anonymousSaveResult, 'anonymous save HTTP response must be observed').not.toBe('request not observed');
  expect(anonymousSaveResult, 'anonymous save must succeed before UI advances').toMatch(/^HTTP 20[01]/);
  expect(cases.length, `exactly one anonymous case must exist in Supabase (${anonymousSaveResult})`).toBe(1);
  const caseId = String(cases[0].id);
  expect(generatedCaseId, 'save response must return the canonical persisted case ID').toBe(caseId);
  expect(cases[0].user_id, 'case must remain unclaimed before authentication').toBeFalsy();

  // The recovery token and case identifier must survive auth/reload before claim.
  const wizardState = await page.evaluate(() => JSON.parse(sessionStorage.getItem('defesai_wizard_state') || 'null'));
  expect(wizardState?.savedCaseId, `anonymous case ID must be retained (${anonymousSaveResult})`).toBeTruthy();
  expect(wizardState?.savedClaimToken, 'server claim token must survive the authentication gate').toBeTruthy();

  const orders = await supabaseRows(request, 'payment_orders', `case_id=eq.${encodeURIComponent(caseId)}`);
  expect(orders.length, 'authentication gate test must not create a payment order').toBe(0);
});
