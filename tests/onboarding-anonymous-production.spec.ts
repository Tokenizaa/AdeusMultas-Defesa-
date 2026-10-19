import { test, expect, type APIRequestContext } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://adeusmulta.defesai.com.br';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RUN_ID = (process.env.E2E_RUN_ID || `manual-intake-${Date.now()}`).replace(/[^A-Za-z0-9-]/g, '-').slice(0, 35);
const AIT = `E2E-MANUAL-${RUN_ID}`.slice(0, 80);
let createdCaseId: string | undefined;
let cleanupReport: Record<string, unknown> = { status: 'NOT_STARTED' };

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function supabaseRows(request: APIRequestContext, table: string, filter: string) {
  const response = await request.get(
    `${required('SUPABASE_URL', SUPABASE_URL)}/rest/v1/${table}?select=*&${filter}`,
    { headers: {
      apikey: required('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY),
      Authorization: `Bearer ${required('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY)}`,
      'User-Agent': 'AdeusMultas-E2E/1.0 (manual onboarding reconciliation)',
    } },
  );
  expect(response.ok(), `${table} query failed: HTTP ${response.status()}`).toBeTruthy();
  return response.json() as Promise<Record<string, any>[]>;
}

test.describe.configure({ retries: 0 });

test.afterEach(async ({ request }) => {
  const byAit = await supabaseRows(request, 'cases', `ait_number=eq.${encodeURIComponent(AIT)}`);
  if (byAit.length === 0) {
    cleanupReport = { status: 'NO_RESIDUE_VERIFIED', runId: RUN_ID, ait: AIT };
    console.log(`[E2E cleanup] ${JSON.stringify(cleanupReport)}`);
    createdCaseId = undefined;
    return;
  }
  if (byAit.length !== 1) {
    cleanupReport = { status: 'REFUSED_MULTIPLE_MATCHES', runId: RUN_ID, ait: AIT, matches: byAit.length };
    console.error(`[E2E cleanup] ${JSON.stringify(cleanupReport)}`);
    throw new Error(`Cleanup refused: expected at most one run-owned AIT ${AIT}, found ${byAit.length} rows.`);
  }

  const row = byAit[0];
  const canonicalId = typeof row.id === 'string' ? row.id : '';
  const key = required('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY);
  if (!canonicalId
    || (createdCaseId && row.id !== createdCaseId)
    || row.ait_number !== AIT
    || row.user_id != null
    || row.is_anonymous !== true
    || row.is_paid === true) {
    cleanupReport = { status: 'REFUSED_IDENTITY_OR_STATE_MISMATCH', runId: RUN_ID, caseId: row.id, expectedCaseId: createdCaseId, ait: AIT, row };
    console.error(`[E2E cleanup] ${JSON.stringify(cleanupReport)}`);
    throw new Error(`Cleanup refused: AIT ${AIT} no longer matches this run's anonymous, unpaid case identity.`);
  }

  const response = await request.delete(
    `${required('SUPABASE_URL', SUPABASE_URL)}/rest/v1/cases?id=eq.${encodeURIComponent(canonicalId)}&ait_number=eq.${encodeURIComponent(AIT)}&is_anonymous=eq.true&user_id=is.null&is_paid=eq.false`,
    { headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'return=representation',
      'User-Agent': 'AdeusMultas-E2E/1.0 (identity-checked cleanup)',
    } },
  );
  expect(response.ok(), `Cleanup failed: HTTP ${response.status()}`).toBeTruthy();
  const deleted = await response.json() as Record<string, unknown>[];
  expect(deleted.length, 'cleanup must delete exactly the case created by this run').toBe(1);

  const remaining = await supabaseRows(request, 'cases', `id=eq.${encodeURIComponent(canonicalId)}`);
  expect(remaining, 'deleted case must be absent after cleanup').toHaveLength(0);
  cleanupReport = { status: 'DELETED_AND_VERIFIED', runId: RUN_ID, caseId: canonicalId, deletedRows: deleted.length, remainingRows: 0 };
  console.log(`[E2E cleanup] ${JSON.stringify(cleanupReport)}`);
  createdCaseId = undefined;
});

test('novo onboarding manual em produção → persistência reconciliada → parada segura antes de autenticação/pagamento', async ({ page, request, context }) => {
  test.setTimeout(90_000);
  const baseUrl = required('PLAYWRIGHT_BASE_URL', BASE_URL);
  expect(baseUrl).toBe('https://adeusmulta.defesai.com.br');

  await context.clearCookies();
  await page.goto('/novo-caso', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });

  // This checkpoint fails before any write if the new onboarding has not yet
  // reached production. Do not fall back to the legacy /novo-caso wizard.
  await expect(
    page.getByRole('heading', { name: 'Informe os dados da autuação' }),
    'Production does not serve the new manual onboarding at /novo-caso; no case was created.',
  ).toBeVisible({ timeout: 10_000 });

  const requiredFields = [
    page.getByLabel(/Número do auto de infração \(AIT\)/),
    page.getByLabel('Código da infração'),
    page.getByLabel('Local da infração'),
    page.getByLabel('Placa do veículo'),
  ];
  await page.getByRole('button', { name: 'Registrar dados' }).click();
  await expect(page.getByText('Informe o número do auto de infração.')).toBeVisible();
  await expect(page.getByText('Informe o código da infração.')).toBeVisible();
  await expect(page.getByText('Informe o local da infração com pelo menos 5 caracteres.')).toBeVisible();
  await expect(page.getByText('Informe uma placa válida com 7 ou 8 caracteres.')).toBeVisible();

  const serviceOptions = [
    'defesa_previa', 'recurso_jari', 'recurso_cetran', 'suspensao_cnh',
    'cassacao_cnh', 'indicacao_condutor', 'conversao_advertencia',
  ];
  const actualOptions = await page.locator('#serviceType option').evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value),
  );
  expect(actualOptions).toEqual(serviceOptions);

  await requiredFields[0].fill(AIT);
  await requiredFields[1].fill('745-5');
  await page.getByLabel('Local da infração').fill('Av. Paulista, 1000 - São Paulo/SP');
  await page.getByLabel('Placa do veículo').fill('E2E1A23');
  await page.getByLabel('Órgão autuador').fill('Órgão de teste E2E');
  await page.locator('#serviceType').selectOption('defesa_previa');

  const responsePromise = page.waitForResponse(
    (response) => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/api/cases/anonymous'),
    { timeout: 20_000 },
  );
  const requestStartedAt = Date.now();
  await page.getByRole('button', { name: 'Registrar dados' }).click();
  let response;
  try {
    response = await responsePromise;
  } catch (error) {
    throw new Error(`INTAKE_API_TIMEOUT after ${Date.now() - requestStartedAt}ms: POST /api/cases/anonymous did not respond; not retrying to avoid duplicate writes. ${error instanceof Error ? error.message : String(error)}`);
  }
  const responseText = await response.text().catch(() => '');
  expect(response.ok(), `INTAKE_API_FAILED after ${Date.now() - requestStartedAt}ms: HTTP ${response.status()} ${responseText.slice(0, 500)}`).toBeTruthy();
  let payload: any;
  try { payload = JSON.parse(responseText); } catch {
    throw new Error(`INTAKE_API_INVALID_JSON: HTTP ${response.status()} body=${responseText.slice(0, 500)}`);
  }
  expect(typeof payload?.id, `INTAKE_API_INVALID_RESPONSE: no canonical case ID in ${responseText.slice(0, 500)}`).toBe('string');
  createdCaseId = payload.id;

  await expect(page.getByRole('heading', { name: 'Seu caso foi registrado' })).toBeVisible({ timeout: 8_000 });
  await expect(page.getByText(createdCaseId)).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('defesai_manual_onboarding_case_id'))).toBe(createdCaseId);
  expect(await page.evaluate(() => sessionStorage.getItem('defesai_manual_onboarding_claim_token'))).toMatch(/^[a-f0-9]{64}$/);

  const rows = await supabaseRows(request, 'cases', `id=eq.${encodeURIComponent(createdCaseId)}&ait_number=eq.${encodeURIComponent(AIT)}`);
  expect(rows, 'exactly one row matching the response ID and synthetic AIT must exist').toHaveLength(1);
  expect(rows[0].id).toBe(createdCaseId);
  expect(rows[0].ait_number).toBe(AIT);
  expect(rows[0].user_id).toBeFalsy();
  expect(rows[0].is_anonymous).toBe(true);
  expect(rows[0].is_paid).toBe(false);
  expect(rows[0].service_type).toBe('defesa_previa');
  expect(rows[0].vehicle_plate).toBe('E2E1A23');

  const orders = await supabaseRows(request, 'payment_orders', `case_id=eq.${encodeURIComponent(createdCaseId)}`);
  expect(orders, 'no payment order may be created before authentication and explicit purchase').toHaveLength(0);
  await expect(page.getByRole('heading', { name: 'Próxima etapa: vincular à sua conta' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entrar para vincular' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Criar conta' })).toBeVisible();
});
