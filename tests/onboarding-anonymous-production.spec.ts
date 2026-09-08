import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL;
const EMAIL = process.env.E2E_TEST_EMAIL || process.env.USER_TEST_LOGIN;
const PASSWORD = process.env.E2E_TEST_PASSWORD || process.env.USER_TEST_PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RUN_ID = process.env.E2E_RUN_ID || `anonymous-${Date.now()}`;

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function supabaseRows(request: Parameters<typeof test>[0] extends never ? never : any, table: string, filter: string) {
  const url = `${required('SUPABASE_URL', SUPABASE_URL)}/rest/v1/${table}?select=*&${filter}`;
  const response = await request.get(url, {
    headers: {
      apikey: required('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY),
      Authorization: `Bearer ${required('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY)}`,
    },
  });
  expect(response.ok(), `${table} reconciliation failed: HTTP ${response.status()}`).toBeTruthy();
  return response.json() as Promise<Record<string, unknown>[]>;
}

test('anonymous onboarding → authentication gate → claim, without creating payment', async ({ page, request, context }) => {
  test.setTimeout(4 * 60_000);
  const baseUrl = required('PLAYWRIGHT_BASE_URL', BASE_URL);
  expect(baseUrl).toMatch(/^https:\/\//);

  await context.clearCookies();
  await page.goto('/novo-caso', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
  await page.reload({ waitUntil: 'domcontentloaded' });

  const ait = `ANON-${RUN_ID}`.replace(/[^A-Za-z0-9-]/g, '-').slice(0, 45);
  const plate = `AN${String(Date.now()).slice(-5)}`.slice(0, 7);

  // CASE — deliberately unauthenticated.
  await expect(page.getByRole('heading', { name: /Identifique a infração/i })).toBeVisible();
  await page.getByLabel(/Número do AIT/i).fill(ait);
  await page.getByLabel(/Código da infração/i).fill('74550');
  await page.getByLabel(/Órgão autuador/i).fill('DETRAN-SP');
  await page.getByLabel(/Placa/i).fill(plate);
  await page.getByLabel(/Marca\/modelo/i).fill('Teste E2E Anonymous');
  await page.getByRole('button', { name: /^Continuar$/i }).click();

  // FACTS
  await expect(page.getByRole('heading', { name: /O que aconteceu\?/i })).toBeVisible();
  await page.getByLabel(/Velocidade permitida/i).fill('60');
  await page.getByLabel(/Velocidade medida/i).fill('68');
  await page.getByRole('button', { name: /^Continuar$/i }).click();

  // EVIDENCE — real production upload path.
  await expect(page.getByRole('heading', { name: /Documentos e evidências/i })).toBeVisible();
  const input = page.locator('input[type="file"]');
  const png1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  await input.setInputFiles({ name: `anonymous-${RUN_ID}.png`, mimeType: 'image/png', buffer: png1x1 });
  await expect(page.getByText(/O documento foi enviado e processado pelo OCR/i)).toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: /^Continuar$/i }).click();

  // ANALYSIS — real backend.
  await expect(page.getByRole('heading', { name: /Diagnóstico preliminar/i })).toBeVisible({ timeout: 120_000 });
  await page.getByRole('button', { name: /^Continuar$/i }).click();

  // QUALIFICATION.
  await expect(page.getByRole('heading', { name: /Dados para a defesa/i })).toBeVisible();
  await page.getByLabel(/Nome completo/i).fill('Anonymous Golden Path');
  await page.getByLabel(/CPF/i).fill('52998224725');
  await page.getByLabel(/CNH/i).fill('01234567890');
  await page.getByLabel(/Telefone/i).fill('11999999999');
  await page.getByLabel(/E-mail/i).fill(required('E2E_TEST_EMAIL/USER_TEST_LOGIN', EMAIL));
  await page.getByLabel(/CEP/i).fill('01001000');
  await page.getByLabel(/^Rua$/i).fill('Praça da Sé');
  await page.getByLabel(/^Número$/i).fill('1');
  await page.getByLabel(/Bairro/i).fill('Sé');
  await page.getByLabel(/Cidade\/UF/i).fill('São Paulo/SP');
  await page.getByRole('button', { name: /^Continuar$/i }).click();

  // REVIEW → PAYMENT BOUNDARY.
  await expect(page.getByRole('heading', { name: /Revise seu caso/i })).toBeVisible();
  await page.getByRole('button', { name: /^Continuar$/i }).click();
  await expect(page.getByRole('heading', { name: /Pagamento PIX/i })).toBeVisible();

  // Critical assertion: anonymous user must be stopped by AccountVerificationGate BEFORE payment creation.
  await page.getByRole('button', { name: /^Continuar$/i }).click();
  await expect(page.getByRole('heading', { name: /Acesso à Sua Defesa Jurídica/i })).toBeVisible();
  await expect(page.getByText(/100% dos Dados Coletados Preservados/i)).toBeVisible();

  // Use the existing E2E account only to make the claim path deterministic.
  // This test intentionally stops before requestPayment; no financial mutation is allowed here.
  await page.getByRole('tab', { name: /Já Tenho Conta/i }).click();
  await page.getByLabel(/E-mail Cadastrado/i).fill(required('E2E_TEST_EMAIL/USER_TEST_LOGIN', EMAIL));
  await page.getByLabel(/Senha de Acesso/i).fill(required('E2E_TEST_PASSWORD/USER_TEST_PASSWORD', PASSWORD));
  await page.getByRole('button', { name: /Entrar/i }).last().click();

  await expect(page.getByRole('heading', { name: /Pagamento PIX/i })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('heading', { name: /Acesso à Sua Defesa Jurídica/i })).toHaveCount(0);

  // Server reconciliation: the anonymous case must now be owned by an authenticated user.
  const cases = await supabaseRows(request, 'cases', `ait_number=eq.${encodeURIComponent(ait)}`);
  expect(cases.length, 'anonymous case must exist in Supabase').toBeGreaterThan(0);
  expect(cases[0].user_id, 'claimed case must have authenticated owner').toBeTruthy();

  // Payment must not have been created by this focused authentication test.
  const caseId = String(cases[0].id);
  const orders = await supabaseRows(request, 'payment_orders', `case_id=eq.${encodeURIComponent(caseId)}`);
  expect(orders.length, 'authentication gate test must not create a payment order').toBe(0);
});
