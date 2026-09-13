import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

const EMAIL = process.env.E2E_TEST_EMAIL || process.env.USER_TEST_LOGIN;
const PASSWORD = process.env.E2E_TEST_PASSWORD || process.env.USER_TEST_PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RUN_ID = process.env.E2E_RUN_ID || `local-golden-${Date.now()}`;
const PAYMENT_CONFIRMED = process.env.LOCAL_E2E_PAYMENT_CONFIRMED === 'true';

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function login(page: Page) {
  await page.goto('/login?redirect=/novo-caso', { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/E-mail do Condutor ou Administrador/i).fill(required('E2E_TEST_EMAIL/USER_TEST_LOGIN', EMAIL));
  await page.getByLabel(/Senha de Acesso/i).fill(required('E2E_TEST_PASSWORD/USER_TEST_PASSWORD', PASSWORD));
  await page.getByRole('button', { name: /Entrar no DefesAi/i }).click();
  await expect(page).toHaveURL(/\/(?:novo-caso|onboarding)(?:\?|$)/, { timeout: 30_000 });
}

async function supabaseRows(request: APIRequestContext, table: string, filter: string) {
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

test.describe('Phase 4 — Local Golden Path', () => {
  test('local case → analysis → sandbox PIX → paid → document → Supabase reconciliation', async ({ page, request }) => {
    test.setTimeout(8 * 60_000);

    const baseUrl = page.url().startsWith('http') ? new URL(page.url()).origin : '';
    expect(baseUrl || 'http://127.0.0.1:3000').toMatch(/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/);

    await login(page);

    const ait = `LOCAL-${RUN_ID}`.replace(/[^A-Za-z0-9-]/g, '-').slice(0, 45);
    const plate = `LCL${String(Date.now()).slice(-4)}`.slice(0, 7);

    // CASE
    await page.getByLabel(/Número do AIT/i).fill(ait);
    await page.getByLabel(/Código da infração/i).fill('74550');
    await page.getByLabel(/Órgão autuador/i).fill('DETRAN-SP');
    await page.getByLabel(/Placa/i).fill(plate);
    await page.getByLabel(/Marca\/modelo/i).fill('Teste E2E - Local');
    await page.getByRole('button', { name: /^Continuar$/i }).click();

    // FACTS
    await expect(page.getByRole('heading', { name: /O que aconteceu\?/i })).toBeVisible();
    await page.getByLabel(/Velocidade permitida/i).fill('60');
    await page.getByLabel(/Velocidade medida/i).fill('68');
    await page.getByRole('button', { name: /^Continuar$/i }).click();

    // EVIDENCE — real local Storage/backend path.
    await expect(page.getByRole('heading', { name: /Documentos e evidências/i })).toBeVisible();
    const input = page.locator('input[type="file"]');
    const png1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
    await input.setInputFiles({ name: `local-${RUN_ID}.png`, mimeType: 'image/png', buffer: png1x1 });
    await expect(page.getByText(/O documento foi enviado e processado pelo OCR/i)).toBeVisible({ timeout: 60_000 });
    await page.getByRole('button', { name: /^Continuar$/i }).click();

    // ANALYSIS — local backend, real services/configuration.
    await expect(page.getByRole('heading', { name: /Diagnóstico preliminar/i })).toBeVisible({ timeout: 120_000 });
    await expect(page.getByText(/Score determinístico do caso/i)).toBeVisible();
    await page.getByRole('button', { name: /^Continuar$/i }).click();

    // QUALIFICATION
    await expect(page.getByRole('heading', { name: /Dados para a defesa/i })).toBeVisible();
    await page.getByLabel(/Nome completo/i).fill('E2E Golden Path Local');
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

    // REVIEW
    await expect(page.getByRole('heading', { name: /Revise seu caso/i })).toBeVisible();
    await page.getByRole('button', { name: /^Continuar$/i }).click();

    // PAYMENT — MUST be sandbox/local. Never run this suite with PAYMENT_MODE=production.
    await expect(page.getByRole('heading', { name: /Pagamento PIX/i })).toBeVisible();
    await page.getByRole('button', { name: /^Continuar$/i }).click();
    await expect(page.getByText(/Status:/i)).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('img[alt="QR Code PIX"]')).toBeVisible({ timeout: 30_000 });

    const cases = await supabaseRows(request, 'cases', `ait_number=eq.${encodeURIComponent(ait)}`);
    expect(cases.length, 'local E2E case must be persisted').toBeGreaterThan(0);
    const caseId = String(cases[0].id);
    const orders = await supabaseRows(request, 'payment_orders', `case_id=eq.${encodeURIComponent(caseId)}`);
    expect(orders.length, 'sandbox PIX order must be persisted').toBeGreaterThan(0);

    // Payment confirmation is intentionally explicit. The local runner may use the project's
    // documented sandbox simulation mechanism, but the test never mutates payment_orders directly.
    if (!PAYMENT_CONFIRMED) {
      throw new Error(
        'LOCAL_E2E_PAYMENT_CONFIRMED=true is required after confirming the sandbox PIX through the project\'s documented local simulation/test mechanism. Never set PAYMENT_MODE=production.'
      );
    }

    // The application must observe the backend-paid state and advance normally.
    const paymentDeadline = Date.now() + 180_000;
    let paid = false;
    while (Date.now() < paymentDeadline) {
      const status = await page.locator('text=/Status:\s*/i').last().innerText().catch(() => '');
      if (/PAID|APPROVED|COMPLETED|paid|approved|completed/i.test(status)) {
        paid = true;
        break;
      }
      const buttons = page.getByRole('button', { name: /^Continuar$/i });
      if (await buttons.count()) await buttons.last().click().catch(() => undefined);
      await page.waitForTimeout(5_000);
    }
    expect(paid, 'local sandbox payment did not reach a paid state').toBeTruthy();

    await expect(page.getByRole('heading', { name: /^Documento$/i })).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: /Gerar documento/i }).click();
    await expect(page.getByText(/Status:/i).last()).toBeVisible({ timeout: 180_000 });
    await expect(page.getByRole('link', { name: /Abrir documento/i })).toHaveAttribute('href', /.+/);

    const documents = await supabaseRows(request, 'documents', `case_id=eq.${encodeURIComponent(caseId)}`);
    expect(documents.length, 'generated document must be persisted in Supabase').toBeGreaterThan(0);
    expect(documents[documents.length - 1].case_id).toBe(caseId);
    expect(orders[orders.length - 1].case_id).toBe(caseId);
  });
});
