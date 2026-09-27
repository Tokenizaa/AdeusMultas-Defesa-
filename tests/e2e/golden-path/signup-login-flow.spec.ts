import { test, expect } from '@playwright/test';
import {
  generateE2EUser,
  signupViaForm,
  loginViaForm,
  logoutViaUI,
  navigateFromLanding,
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

test.describe('Golden Path: Signup → Login → Complete Flow', () => {
  let user: ReturnType<typeof generateE2EUser>;
  let caseId: string;

  test.beforeEach(async ({ page }) => {
    user = generateE2EUser();
    await page.goto('/');
  });

  test('complete signup → onboarding → upload → analysis → signup → login → claim → checkout → document', async ({ page }) => {
    await navigateFromLanding(page);

    await fillOnboardingStep1(page, {
      aitNumber: '12345678901',
      infractionCode: '61901',
      agency: 'DETRAN-SP',
      plate: 'ABC1D23',
      brandModel: 'Honda Civic',
    });

    await fillOnboardingStep2(page, {
      allowedSpeed: '60',
      measuredSpeed: '78',
    });

    await fillOnboardingStep4(page, {
      fullName: user.name,
      cpf: user.cpf,
      cnh: '12345678901',
      phone: '(11) 99999-9999',
      email: user.email,
      cep: '01310-100',
      street: 'Av. Paulista',
      number: '1000',
      neighborhood: 'Bela Vista',
      cityState: 'São Paulo - SP',
    });

    await proceedThroughReview(page);

    await uploadDocument(page, `${FIXTURES_DIR}/ait-sample.pdf`, 'AIT');
    await uploadDocument(page, `${FIXTURES_DIR}/cnh-sample.pdf`, 'CNH');
    await uploadDocument(page, `${FIXTURES_DIR}/crlv-sample.pdf`, 'CRLV');

    await waitForAnalysis(page, 'anonymous');

    await signupViaForm(page, user);

    await loginViaForm(page, user.email, user.password);

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /Meus casos|Dashboard/i })).toBeVisible({ timeout: 15000 });

    const caseLink = page.getByRole('link', { name: /Visualizar|Abrir/i }).first();
    await expect(caseLink).toBeVisible({ timeout: 10000 });
    await caseLink.click();

    await page.waitForURL(/\/cases\//);
    caseId = page.url().split('/cases/')[1]?.split('/')[0] || '';

    await checkoutSandbox(page);

    const docHref = await generateDocument(page);
    expect(docHref).toBeTruthy();

    await logoutViaUI(page);
    await loginViaForm(page, user.email, user.password);

    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: /Visualizar|Abrir/i }).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Golden Path: Email Confirmation Mechanism Discovery', () => {
  test('discover email confirmation flow without bypassing', async ({ page }) => {
    const user = generateE2EUser();
    await page.goto('/signup');

    await page.locator('input[type="email"]').fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await page.locator('input[name="name"], input[id*="name"]').first().fill(user.name);
    await page.locator('input[name="cpf"], input[id*="cpf"]').first().fill(user.cpf);

    await page.getByRole('button', { name: /Criar conta|Sign up|Registrar/i }).click();

    await page.waitForURL(/\/onboarding|\/login|\/dashboard|\/verify-email|\/confirm/, { timeout: 30000 });

    const currentUrl = page.url();
    await test.info().attach('post-signup-url.txt', {
      body: currentUrl,
      contentType: 'text/plain',
    });

    if (currentUrl.includes('/verify-email') || currentUrl.includes('/confirm')) {
      console.log('EMAIL CONFIRMATION REQUIRED - mechanism discovered');
    } else if (currentUrl.includes('/onboarding') || currentUrl.includes('/dashboard')) {
      console.log('NO EMAIL CONFIRMATION - direct access granted');
    }
  });
});