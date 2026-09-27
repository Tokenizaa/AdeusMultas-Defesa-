import { test, expect } from '@playwright/test';
import {
  generateE2EUser,
  signupViaForm,
  loginViaForm,
  navigateFromLanding,
  fillOnboardingStep1,
  fillOnboardingStep2,
  fillOnboardingStep4,
  proceedThroughReview,
  uploadDocument,
  waitForAnalysis,
  claimAnonymousCase,
  checkoutSandbox,
  generateDocument,
} from './helpers/real-flow-helpers';

const FIXTURES_DIR = 'tests/e2e/golden-path/fixtures/real-documents';
const UTM_PARAMS = {
  utm_source: 'facebook',
  utm_medium: 'cpc',
  utm_campaign: 'e2e',
};

test.describe.configure({ retries: 0 });

test.describe('Golden Path: Anonymous → Claim → Checkout (Mobile)', () => {
  test.use({ viewport: { width: 393, height: 851 } });

  let user: ReturnType<typeof generateE2EUser>;

  test.beforeEach(async () => {
    user = generateE2EUser();
  });

  test('anonymous onboarding with UTM → claim → login → checkout → document', async ({ page }) => {
    await navigateFromLanding(page, UTM_PARAMS);

    const urlAfterLanding = page.url();
    expect(urlAfterLanding).toContain('utm_source=facebook');
    expect(urlAfterLanding).toContain('utm_medium=cpc');
    expect(urlAfterLanding).toContain('utm_campaign=e2e');

    await fillOnboardingStep1(page, {
      aitNumber: '98765432109',
      infractionCode: '51601',
      agency: 'PRF',
      plate: 'XYZ9W87',
      brandModel: 'Toyota Corolla',
    });

    const urlAfterStep1 = page.url();
    expect(urlAfterStep1).toContain('utm_source=facebook');

    await fillOnboardingStep2(page, {
      allowedSpeed: '80',
      measuredSpeed: '102',
    });

    const urlAfterStep2 = page.url();
    expect(urlAfterStep2).toContain('utm_source=facebook');

    await fillOnboardingStep4(page, {
      fullName: user.name,
      cpf: user.cpf,
      cnh: '98765432109',
      phone: '(21) 98888-7777',
      email: user.email,
      cep: '20010-010',
      street: 'Rua da Assembleia',
      number: '10',
      neighborhood: 'Centro',
      cityState: 'Rio de Janeiro - RJ',
    });

    const urlAfterStep4 = page.url();
    expect(urlAfterStep4).toContain('utm_source=facebook');

    await proceedThroughReview(page);

    await uploadDocument(page, `${FIXTURES_DIR}/ait-sample.pdf`, 'AIT');
    await uploadDocument(page, `${FIXTURES_DIR}/cnh-sample.pdf`, 'CNH');
    await uploadDocument(page, `${FIXTURES_DIR}/crlv-sample.pdf`, 'CRLV');

    await waitForAnalysis(page, 'anonymous');

    const urlBeforeClaim = page.url();
    expect(urlBeforeClaim).toContain('utm_source=facebook');

    await claimAnonymousCase(page);

    await loginViaForm(page, user.email, user.password);

    const urlAfterLogin = page.url();
    expect(urlAfterLogin).toContain('utm_source=facebook');

    await page.waitForURL(/\/dashboard|\/cases/, { timeout: 15000 });

    const caseLink = page.getByRole('link', { name: /Visualizar|Abrir/i }).first();
    await expect(caseLink).toBeVisible({ timeout: 10000 });
    await caseLink.click();

    await page.waitForURL(/\/cases\//);

    await checkoutSandbox(page);

    const docHref = await generateDocument(page);
    expect(docHref).toBeTruthy();

    const finalUrl = page.url();
    expect(finalUrl).toContain('utm_source=facebook');
  });
});

test.describe('Golden Path: Anonymous Claim Desktop', () => {
  let user: ReturnType<typeof generateE2EUser>;

  test.beforeEach(async () => {
    user = generateE2EUser();
  });

  test('anonymous onboarding → claim via UI → authenticated flow', async ({ page }) => {
    await navigateFromLanding(page, UTM_PARAMS);

    await fillOnboardingStep1(page, {
      aitNumber: '11122233344',
      infractionCode: '70101',
      agency: 'DNIT',
      plate: 'DEF4G56',
      brandModel: 'Ford Ka',
    });

    await fillOnboardingStep2(page, {
      allowedSpeed: '40',
      measuredSpeed: '58',
    });

    await fillOnboardingStep4(page, {
      fullName: user.name,
      cpf: user.cpf,
      cnh: '11122233344',
      phone: '(31) 97777-6666',
      email: user.email,
      cep: '30110-000',
      street: 'Av. Afonso Pena',
      number: '500',
      neighborhood: 'Funcionários',
      cityState: 'Belo Horizonte - MG',
    });

    await proceedThroughReview(page);

    await uploadDocument(page, `${FIXTURES_DIR}/ait-sample.pdf`, 'AIT');
    await uploadDocument(page, `${FIXTURES_DIR}/cnh-sample.pdf`, 'CNH');
    await uploadDocument(page, `${FIXTURES_DIR}/crlv-sample.pdf`, 'CRLV');

    await waitForAnalysis(page, 'anonymous');

    await claimAnonymousCase(page);

    await signupViaForm(page, user);

    await page.waitForURL(/\/dashboard|\/cases/, { timeout: 15000 });

    await expect(page.getByRole('heading', { name: /Meus casos|Dashboard/i })).toBeVisible({ timeout: 10000 });
  });
});