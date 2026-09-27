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

test.describe('Golden Path: Multi-User Isolation', () => {
  let userA: ReturnType<typeof generateE2EUser>;
  let userB: ReturnType<typeof generateE2EUser>;
  let caseIdA: string;
  let caseIdB: string;

  test.beforeAll(async () => {
    userA = generateE2EUser();
    userB = generateE2EUser();
  });

  test('User A creates case A (speeding)', async ({ page }) => {
    await signupViaForm(page, userA);

    await navigateFromLanding(page);

    await fillOnboardingStep1(page, {
      aitNumber: 'AAA111BBB22',
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
      fullName: userA.name,
      cpf: userA.cpf,
      cnh: 'AAA111BBB22',
      phone: '(11) 91111-1111',
      email: userA.email,
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

    await waitForAnalysis(page, 'userA');

    await checkoutSandbox(page);

    await generateDocument(page);

    const caseUrl = page.url();
    caseIdA = caseUrl.split('/cases/')[1]?.split('/')[0] || '';
    expect(caseIdA).toBeTruthy();

    await logoutViaUI(page);
  });

  test('User B creates case B (red light)', async ({ page }) => {
    await signupViaForm(page, userB);

    await navigateFromLanding(page);

    await fillOnboardingStep1(page, {
      aitNumber: 'CCC333DDD44',
      infractionCode: '51601',
      agency: 'CET-SP',
      plate: 'XYZ9W87',
      brandModel: 'Toyota Corolla',
    });

    await fillOnboardingStep2(page, {
      allowedSpeed: '80',
      measuredSpeed: '102',
    });

    await fillOnboardingStep4(page, {
      fullName: userB.name,
      cpf: userB.cpf,
      cnh: 'CCC333DDD44',
      phone: '(11) 92222-2222',
      email: userB.email,
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

    await waitForAnalysis(page, 'userB');

    await checkoutSandbox(page);

    await generateDocument(page);

    const caseUrl = page.url();
    caseIdB = caseUrl.split('/cases/')[1]?.split('/')[0] || '';
    expect(caseIdB).toBeTruthy();

    await logoutViaUI(page);
  });

  test('User A sees only Case A in dashboard', async ({ page }) => {
    await loginViaForm(page, userA.email, userA.password);

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /Meus casos|Dashboard/i })).toBeVisible({ timeout: 15000 });

    const caseLinks = page.getByRole('link', { name: /Visualizar|Abrir/i });
    const count = await caseLinks.count();

    for (let i = 0; i < count; i++) {
      const href = await caseLinks.nth(i).getAttribute('href');
      expect(href).toContain(caseIdA);
      expect(href).not.toContain(caseIdB);
    }

    const pageContent = await page.textContent('body');
    expect(pageContent).toContain(caseIdA);
    expect(pageContent).not.toContain(caseIdB);

    await logoutViaUI(page);
  });

  test('User B sees only Case B in dashboard', async ({ page }) => {
    await loginViaForm(page, userB.email, userB.password);

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /Meus casos|Dashboard/i })).toBeVisible({ timeout: 15000 });

    const caseLinks = page.getByRole('link', { name: /Visualizar|Abrir/i });
    const count = await caseLinks.count();

    for (let i = 0; i < count; i++) {
      const href = await caseLinks.nth(i).getAttribute('href');
      expect(href).toContain(caseIdB);
      expect(href).not.toContain(caseIdA);
    }

    const pageContent = await page.textContent('body');
    expect(pageContent).toContain(caseIdB);
    expect(pageContent).not.toContain(caseIdA);

    await logoutViaUI(page);
  });

  test('User A CANNOT access Case B URL', async ({ page }) => {
    await loginViaForm(page, userA.email, userA.password);

    await page.goto(`/cases/${caseIdB}`);

    const is403 = page.url().includes('/403') || page.url().includes('/unauthorized');
    const is404 = page.url().includes('/404') || page.url().includes('/not-found');
    const isDashboard = page.url().includes('/dashboard');
    const hasError = await page.getByText(/Acesso negado|Não autorizado|Não encontrado|Acesso restrito/i).count() > 0;

    expect(is403 || is404 || isDashboard || hasError).toBeTruthy();

    const pageContent = await page.textContent('body');
    expect(pageContent).not.toContain('CCC333DDD44');

    await logoutViaUI(page);
  });

  test('User B CANNOT access Case A URL', async ({ page }) => {
    await loginViaForm(page, userB.email, userB.password);

    await page.goto(`/cases/${caseIdA}`);

    const is403 = page.url().includes('/403') || page.url().includes('/unauthorized');
    const is404 = page.url().includes('/404') || page.url().includes('/not-found');
    const isDashboard = page.url().includes('/dashboard');
    const hasError = await page.getByText(/Acesso negado|Não autorizado|Não encontrado|Acesso restrito/i).count() > 0;

    expect(is403 || is404 || isDashboard || hasError).toBeTruthy();

    const pageContent = await page.textContent('body');
    expect(pageContent).not.toContain('AAA111BBB22');

    await logoutViaUI(page);
  });

  test('Logout/Login preserves isolation for User A', async ({ page }) => {
    await loginViaForm(page, userA.email, userA.password);

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /Meus casos|Dashboard/i })).toBeVisible({ timeout: 15000 });

    await logoutViaUI(page);
    await loginViaForm(page, userA.email, userA.password);

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /Meus casos|Dashboard/i })).toBeVisible({ timeout: 15000 });

    const caseLinks = page.getByRole('link', { name: /Visualizar|Abrir/i });
    const count = await caseLinks.count();

    for (let i = 0; i < count; i++) {
      const href = await caseLinks.nth(i).getAttribute('href');
      expect(href).toContain(caseIdA);
      expect(href).not.toContain(caseIdB);
    }

    await logoutViaUI(page);
  });

  test('Logout/Login preserves isolation for User B', async ({ page }) => {
    await loginViaForm(page, userB.email, userB.password);

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /Meus casos|Dashboard/i })).toBeVisible({ timeout: 15000 });

    await logoutViaUI(page);
    await loginViaForm(page, userB.email, userB.password);

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /Meus casos|Dashboard/i })).toBeVisible({ timeout: 15000 });

    const caseLinks = page.getByRole('link', { name: /Visualizar|Abrir/i });
    const count = await caseLinks.count();

    for (let i = 0; i < count; i++) {
      const href = await caseLinks.nth(i).getAttribute('href');
      expect(href).toContain(caseIdB);
      expect(href).not.toContain(caseIdA);
    }

    await logoutViaUI(page);
  });
});