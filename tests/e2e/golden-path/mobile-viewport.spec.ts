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

test.describe.configure({ retries: 0 });

test.use({
  viewport: { width: 375, height: 667 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

test.describe('Golden Path: Mobile Viewport (375x667)', () => {
  let user: ReturnType<typeof generateE2EUser>;

  test.beforeEach(async () => {
    user = generateE2EUser();
  });

  test('mobile: signup → onboarding → upload → analysis → login → checkout → document', async ({ page }) => {
    await navigateFromLanding(page);

    const viewport = page.viewportSize();
    expect(viewport?.width).toBe(375);
    expect(viewport?.height).toBe(667);

    await fillOnboardingStep1(page, {
      aitNumber: 'MOB12345678',
      infractionCode: '61901',
      agency: 'DETRAN-SP',
      plate: 'MOB1A23',
      brandModel: 'Honda Fit',
    });

    await fillOnboardingStep2(page, {
      allowedSpeed: '60',
      measuredSpeed: '78',
    });

    await fillOnboardingStep4(page, {
      fullName: user.name,
      cpf: user.cpf,
      cnh: 'MOB12345678',
      phone: '(11) 93333-4444',
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

    await waitForAnalysis(page, 'mobile-anonymous');

    await signupViaForm(page, user);

    await loginViaForm(page, user.email, user.password);

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /Meus casos|Dashboard/i })).toBeVisible({ timeout: 15000 });

    const caseLink = page.getByRole('link', { name: /Visualizar|Abrir/i }).first();
    await expect(caseLink).toBeVisible({ timeout: 10000 });
    await caseLink.click();

    await page.waitForURL(/\/cases\//);

    await checkoutSandbox(page);

    const docHref = await generateDocument(page);
    expect(docHref).toBeTruthy();

    await logoutViaUI(page);
    await loginViaForm(page, user.email, user.password);

    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: /Visualizar|Abrir/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('mobile: touch targets are functional - buttons and inputs', async ({ page }) => {
    await page.goto('/');

    const ctaButton = page.getByRole('button', { name: /Começar|Iniciar|Fazer defesa|Simular/i }).first();
    await expect(ctaButton).toBeVisible();

    const box = await ctaButton.boundingBox();
    expect(box).toBeTruthy();
    expect((box?.height || 0) >= 44).toBeTruthy();
    expect((box?.width || 0) >= 44).toBeTruthy();

    await ctaButton.click();

    await page.waitForURL(/\/onboarding|\/novo-caso/, { timeout: 15000 });

    const aitInput = page.getByLabel(/Número do AIT/i);
    await expect(aitInput).toBeVisible();

    const inputBox = await aitInput.boundingBox();
    expect(inputBox).toBeTruthy();
    expect((inputBox?.height || 0) >= 44).toBeTruthy();

    await aitInput.tap();
    await aitInput.fill('TAP123456');

    await page.getByRole('button', { name: /^Continuar$/i }).tap();
  });

  test('mobile: upload works on mobile viewport', async ({ page }) => {
    const user = generateE2EUser();
    await signupViaForm(page, user);

    await navigateFromLanding(page);

    await fillOnboardingStep1(page, {
      aitNumber: 'UPL98765432',
      infractionCode: '61901',
      agency: 'DETRAN-SP',
      plate: 'UPL1B23',
      brandModel: 'Chevrolet Onix',
    });

    await fillOnboardingStep2(page, {
      allowedSpeed: '60',
      measuredSpeed: '75',
    });

    await fillOnboardingStep4(page, {
      fullName: user.name,
      cpf: user.cpf,
      cnh: 'UPL98765432',
      phone: '(11) 94444-5555',
      email: user.email,
      cep: '01310-100',
      street: 'Av. Paulista',
      number: '1000',
      neighborhood: 'Bela Vista',
      cityState: 'São Paulo - SP',
    });

    await proceedThroughReview(page);

    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeVisible({ timeout: 10000 });

    await fileInput.setInputFiles(`${FIXTURES_DIR}/ait-sample.pdf`);

    await page.waitForLoadState('networkidle', { timeout: 60000 });

    const successIndicator = page.getByText(/enviado|processado|upload.*concluído|OCR.*concluído/i);
    await expect(successIndicator.first()).toBeVisible({ timeout: 60000 });

    await fileInput.setInputFiles(`${FIXTURES_DIR}/cnh-sample.pdf`);
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    await expect(successIndicator.first()).toBeVisible({ timeout: 60000 });

    await fileInput.setInputFiles(`${FIXTURES_DIR}/crlv-sample.pdf`);
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    await expect(successIndicator.first()).toBeVisible({ timeout: 60000 });
  });

  test('mobile: checkout sandbox functional', async ({ page }) => {
    const user = generateE2EUser();
    await signupViaForm(page, user);

    await navigateFromLanding(page);

    await fillOnboardingStep1(page, {
      aitNumber: 'CHK11122233',
      infractionCode: '51601',
      agency: 'PRF',
      plate: 'CHK1C23',
      brandModel: 'Hyundai HB20',
    });

    await fillOnboardingStep2(page, {
      allowedSpeed: '80',
      measuredSpeed: '100',
    });

    await fillOnboardingStep4(page, {
      fullName: user.name,
      cpf: user.cpf,
      cnh: 'CHK11122233',
      phone: '(11) 95555-6666',
      email: user.email,
      cep: '20010-010',
      street: 'Rua da Assembleia',
      number: '10',
      neighborhood: 'Centro',
      cityState: 'Rio de Janeiro - RJ',
    });

    await proceedThroughReview(page);

    await uploadDocument(page, `${FIXTURES_DIR}/ait-sample.pdf`, 'AIT');
    await uploadDocument(page, `${FIXTURES_DIR}/cnh-sample.pdf`, 'CNH');
    await uploadDocument(page, `${FIXTURES_DIR}/crlv-sample.pdf`, 'CRLV');

    await waitForAnalysis(page, 'mobile-checkout');

    await checkoutSandbox(page);

    const docHref = await generateDocument(page);
    expect(docHref).toBeTruthy();

    const pdfResponse = await page.request.get(docHref);
    expect(pdfResponse.ok()).toBeTruthy();
    const pdfBuffer = await pdfResponse.body();
    expect(pdfBuffer.slice(0, 4).toString()).toBe('%PDF');
  });
});