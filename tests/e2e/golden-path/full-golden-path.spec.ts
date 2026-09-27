import { test, expect } from '@playwright/test';
import {
  generateE2EUser,
  loginViaForm,
  fillOnboardingStep1,
  fillOnboardingStep2,
  fillOnboardingStep4,
  proceedThroughReview,
  uploadDocument,
  waitForAnalysis,
  checkoutSandbox,
  generateDocument,
} from './helpers/real-flow-helpers';

const FIXTURES_DIR = 'tests/e2e/golden-path/fixtures/real-documents';

test.describe('Golden Path: Full Flow - Authenticated User', () => {
  let user: ReturnType<typeof generateE2EUser>;
  let caseId: string;

  test.beforeAll(async ({ request }) => {
    user = generateE2EUser();
  });

  test('logged user → new case → facts → upload → AI analysis → review → checkout sandbox → document → Supabase reconciliation', async ({ page, request }) => {
    await loginViaForm(page, user.email, user.password);

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /Meus casos|Dashboard/i })).toBeVisible({ timeout: 15000 });

    const newCaseButton = page.getByRole('button', { name: /Novo caso|Nova defesa|Iniciar/i }).first();
    await expect(newCaseButton).toBeVisible({ timeout: 10000 });
    await newCaseButton.click();

    await page.waitForURL(/\/onboarding|\/novo-caso/, { timeout: 15000 });

    await fillOnboardingStep1(page, {
      aitNumber: '55566677788',
      infractionCode: '51601',
      agency: 'DETRAN-RJ',
      plate: 'GHI7J89',
      brandModel: 'Volkswagen Golf',
    });

    await fillOnboardingStep2(page, {
      allowedSpeed: '80',
      measuredSpeed: '105',
    });

    await fillOnboardingStep4(page, {
      fullName: user.name,
      cpf: user.cpf,
      cnh: '55566677788',
      phone: '(11) 96666-5555',
      email: user.email,
      cep: '04538-132',
      street: 'Av. Faria Lima',
      number: '1500',
      neighborhood: 'Vila Olímpia',
      cityState: 'São Paulo - SP',
    });

    await proceedThroughReview(page);

    await uploadDocument(page, `${FIXTURES_DIR}/ait-sample.pdf`, 'AIT');
    await uploadDocument(page, `${FIXTURES_DIR}/cnh-sample.pdf`, 'CNH');
    await uploadDocument(page, `${FIXTURES_DIR}/crlv-sample.pdf`, 'CRLV');

    await waitForAnalysis(page, 'authenticated');

    await checkoutSandbox(page);

    const docHref = await generateDocument(page);
    expect(docHref).toBeTruthy();

    const caseUrl = page.url();
    caseId = caseUrl.split('/cases/')[1]?.split('/')[0] || '';
    expect(caseId).toBeTruthy();

    const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (supabaseKey) {
      const response = await request.get(`${supabaseUrl}/rest/v1/cases?id=eq.${caseId}`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      });

      expect(response.ok()).toBeTruthy();

      const cases = await response.json();
      expect(cases.length).toBeGreaterThan(0);
      expect(cases[0].id).toBe(caseId);
      expect(cases[0].user_id).toBeTruthy();
      expect(cases[0].status).toBeTruthy();
    } else {
      console.warn('Supabase credentials not configured - skipping DB reconciliation');
      await test.info().attach('supabase-reconciliation-skipped.txt', {
        body: 'SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY not set',
        contentType: 'text/plain',
      });
    }

    const pdfResponse = await page.request.get(docHref);
    expect(pdfResponse.ok()).toBeTruthy();
    const pdfBuffer = await pdfResponse.body();
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    expect(pdfBuffer.slice(0, 4).toString()).toBe('%PDF');
  });
});

test.describe('Golden Path: Supabase Reconciliation Only', () => {
  test('verify case persisted in database after complete flow', async ({ request }) => {
    const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseKey) {
      console.log('Supabase credentials not configured - skipping');
      return;
    }

    const response = await request.get(`${supabaseUrl}/rest/v1/cases?order=created_at.desc&limit=1`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    expect(response.ok()).toBeTruthy();

    const cases = await response.json();
    expect(cases.length).toBeGreaterThan(0);

    const latestCase = cases[0];
    expect(latestCase.id).toBeTruthy();
    expect(latestCase.user_id).toBeTruthy();
    expect(latestCase.ait_number).toBeTruthy();
    expect(latestCase.status).toBeTruthy();
    expect(['draft', 'analyzing', 'analyzed', 'paid', 'document_generated']).toContain(latestCase.status);
  });
});