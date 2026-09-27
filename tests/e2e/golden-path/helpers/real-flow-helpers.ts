import { Page, expect, APIRequestContext, test } from '@playwright/test';

export interface E2EUser {
  email: string;
  password: string;
  name: string;
  cpf: string;
}

const createdE2EUsers: E2EUser[] = [];

export function generateE2EUser(): E2EUser {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const email = `e2e-${timestamp}-${random}@test.local`;
  const password = `E2E_Test_${timestamp}_${random}!`;
  const name = `E2E User ${timestamp}`;
  const cpf = generateValidCPF();

  const user = { email, password, name, cpf };
  createdE2EUsers.push(user);
  return user;
}

function generateValidCPF(): string {
  const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += digits[i] * (10 - i);
  let check1 = (sum * 10) % 11;
  check1 = check1 === 10 ? 0 : check1;
  digits.push(check1);
  sum = 0;
  for (let i = 0; i < 10; i++) sum += digits[i] * (11 - i);
  let check2 = (sum * 10) % 11;
  check2 = check2 === 10 ? 0 : check2;
  digits.push(check2);
  return `${digits.slice(0, 3).join('')}.${digits.slice(3, 6).join('')}.${digits.slice(6, 9).join('')}-${digits.slice(9).join('')}`;
}

export function getCreatedE2EUsers(): E2EUser[] {
  return [...createdE2EUsers];
}

export function clearCreatedE2EUsers(): void {
  createdE2EUsers.length = 0;
}

async function attachScreenshot(page: Page, name: string): Promise<void> {
  await test.info().attach(`${name}-${Date.now()}.png`, {
    body: await page.screenshot({ fullPage: true, type: 'png' }),
    contentType: 'image/png',
  });
}

function captureConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`${msg.type().toUpperCase()}: ${msg.text()}`);
    }
  });
  return errors;
}

function captureNetworkFailures(page: Page): string[] {
  const failures: string[] = [];
  page.on('requestfailed', (request) => {
    failures.push(`REQUEST_FAILED: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
  });
  return failures;
}

async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');
}

export async function signupViaForm(page: Page, userData: E2EUser): Promise<void> {
  const errors = captureConsoleErrors(page);
  const networkFailures = captureNetworkFailures(page);

  await page.goto('/signup');
  await waitForPageReady(page);

  await attachScreenshot(page, 'signup-form-loaded');

  await page.locator('input[type="email"]').fill(userData.email);
  await page.locator('input[type="password"]').fill(userData.password);
  await page.locator('input[name="name"], input[id*="name"]').first().fill(userData.name);
  await page.locator('input[name="cpf"], input[id*="cpf"]').first().fill(userData.cpf);

  await attachScreenshot(page, 'signup-form-filled');

  await page.getByRole('button', { name: /Criar conta|Sign up|Registrar/i }).click();

  await page.waitForURL(/\/onboarding|\/login|\/dashboard/, { timeout: 30000 });
  await waitForPageReady(page);

  await attachScreenshot(page, 'signup-completed');

  const consoleErrors = errors.filter(e => e.includes('ERROR'));
  if (consoleErrors.length > 0) {
    await test.info().attach('console-errors.txt', {
      body: consoleErrors.join('\n'),
      contentType: 'text/plain',
    });
  }
  if (networkFailures.length > 0) {
    await test.info().attach('network-failures.txt', {
      body: networkFailures.join('\n'),
      contentType: 'text/plain',
    });
  }
}

export async function loginViaForm(page: Page, email: string, password: string): Promise<void> {
  const errors = captureConsoleErrors(page);
  const networkFailures = captureNetworkFailures(page);

  await page.goto('/login');
  await waitForPageReady(page);

  await attachScreenshot(page, 'login-form-loaded');

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);

  await attachScreenshot(page, 'login-form-filled');

  await page.getByRole('button', { name: /Entrar|Login|Sign in/i }).click();

  await page.waitForURL(/\/onboarding|\/dashboard|\/cases/, { timeout: 30000 });
  await waitForPageReady(page);

  await attachScreenshot(page, 'login-completed');

  const consoleErrors = errors.filter(e => e.includes('ERROR'));
  if (consoleErrors.length > 0) {
    await test.info().attach('console-errors.txt', {
      body: consoleErrors.join('\n'),
      contentType: 'text/plain',
    });
  }
  if (networkFailures.length > 0) {
    await test.info().attach('network-failures.txt', {
      body: networkFailures.join('\n'),
      contentType: 'text/plain',
    });
  }
}

export async function logoutViaUI(page: Page): Promise<void> {
  const errors = captureConsoleErrors(page);
  const networkFailures = captureNetworkFailures(page);

  await attachScreenshot(page, 'pre-logout');

  const userMenu = page.getByRole('button', { name: /Menu do usuário|Perfil|User menu/i });
  if (await userMenu.count() > 0) {
    await userMenu.click();
    await page.getByRole('menuitem', { name: /Sair|Logout|Sign out/i }).click();
  } else {
    await page.goto('/logout');
  }

  await page.waitForURL(/\/login|\//, { timeout: 15000 });
  await waitForPageReady(page);

  await attachScreenshot(page, 'logout-completed');
}

export async function waitForAnalysis(page: Page, caseId: string, timeoutMs = 180_000): Promise<void> {
  const startTime = Date.now();
  const errors = captureConsoleErrors(page);
  const networkFailures = captureNetworkFailures(page);

  while (Date.now() - startTime < timeoutMs) {
    await attachScreenshot(page, `analysis-polling-${Date.now()}`);

    const analysisHeading = page.getByRole('heading', { name: /Diagnóstico|Análise|Resultado/i });
    if (await analysisHeading.count() > 0) {
      const isVisible = await analysisHeading.first().isVisible().catch(() => false);
      if (isVisible) {
        const scoreElement = page.getByText(/Score|score/i);
        if (await scoreElement.count() > 0) {
          await expect(scoreElement.first()).toBeVisible({ timeout: 5000 });
          break;
        }
      }
    }

    const continueBtn = page.getByRole('button', { name: /Continuar|Próximo/i });
    if (await continueBtn.count() > 0) {
      const isEnabled = await continueBtn.first().isEnabled().catch(() => false);
      if (isEnabled) break;
    }

    await page.waitForTimeout(3000);
  }

  const consoleErrors = errors.filter(e => e.includes('ERROR'));
  if (consoleErrors.length > 0) {
    await test.info().attach('analysis-console-errors.txt', {
      body: consoleErrors.join('\n'),
      contentType: 'text/plain',
    });
  }
  if (networkFailures.length > 0) {
    await test.info().attach('analysis-network-failures.txt', {
      body: networkFailures.join('\n'),
      contentType: 'text/plain',
    });
  }
}

export async function uploadDocument(page: Page, filePath: string, docType: string): Promise<void> {
  const errors = captureConsoleErrors(page);
  const networkFailures = captureNetworkFailures(page);

  await attachScreenshot(page, `upload-${docType}-before`);

  const fileInput = page.locator('input[type="file"]').first();
  await expect(fileInput).toBeVisible({ timeout: 10000 });
  await fileInput.setInputFiles(filePath);

  await page.waitForLoadState('networkidle', { timeout: 60000 });

  const successIndicator = page.getByText(/enviado|processado|upload.*concluído|OCR.*concluído/i);
  await expect(successIndicator.first()).toBeVisible({ timeout: 60000 });

  await attachScreenshot(page, `upload-${docType}-after`);

  const consoleErrors = errors.filter(e => e.includes('ERROR'));
  if (consoleErrors.length > 0) {
    await test.info().attach('upload-console-errors.txt', {
      body: consoleErrors.join('\n'),
      contentType: 'text/plain',
    });
  }
  if (networkFailures.length > 0) {
    await test.info().attach('upload-network-failures.txt', {
      body: networkFailures.join('\n'),
      contentType: 'text/plain',
    });
  }
}

export async function navigateFromLanding(page: Page, utmParams?: Record<string, string>): Promise<void> {
  const errors = captureConsoleErrors(page);
  const networkFailures = captureNetworkFailures(page);

  let url = '/';
  if (utmParams) {
    const params = new URLSearchParams(utmParams);
    url += `?${params.toString()}`;
  }

  await page.goto(url);
  await waitForPageReady(page);

  await attachScreenshot(page, 'landing-page-loaded');

  const ctaButton = page.getByRole('button', { name: /Começar|Iniciar|Fazer defesa|Simular/i }).first();
  if (await ctaButton.count() === 0) {
    const link = page.getByRole('link', { name: /Começar|Iniciar|Fazer defesa|Simular/i }).first();
    if (await link.count() > 0) await link.click();
  } else {
    await ctaButton.click();
  }

  await page.waitForURL(/\/onboarding|\/novo-caso/, { timeout: 15000 });
  await waitForPageReady(page);

  await attachScreenshot(page, 'onboarding-started');

  const consoleErrors = errors.filter(e => e.includes('ERROR'));
  if (consoleErrors.length > 0) {
    await test.info().attach('landing-console-errors.txt', {
      body: consoleErrors.join('\n'),
      contentType: 'text/plain',
    });
  }
  if (networkFailures.length > 0) {
    await test.info().attach('landing-network-failures.txt', {
      body: networkFailures.join('\n'),
      contentType: 'text/plain',
    });
  }
}

export async function claimAnonymousCase(page: Page): Promise<void> {
  const errors = captureConsoleErrors(page);
  const networkFailures = captureNetworkFailures(page);

  await attachScreenshot(page, 'claim-before');

  const claimButton = page.getByRole('button', { name: /Já tenho conta|Reivindicar|Claim/i }).first();
  if (await claimButton.count() === 0) {
    const link = page.getByRole('link', { name: /Já tenho conta|Reivindicar|Claim/i }).first();
    if (await link.count() > 0) await link.click();
  } else {
    await claimButton.click();
  }

  await page.waitForURL(/\/login|\/signup/, { timeout: 15000 });
  await waitForPageReady(page);

  await attachScreenshot(page, 'claim-redirected');

  const consoleErrors = errors.filter(e => e.includes('ERROR'));
  if (consoleErrors.length > 0) {
    await test.info().attach('claim-console-errors.txt', {
      body: consoleErrors.join('\n'),
      contentType: 'text/plain',
    });
  }
  if (networkFailures.length > 0) {
    await test.info().attach('claim-network-failures.txt', {
      body: networkFailures.join('\n'),
      contentType: 'text/plain',
    });
  }
}

export async function checkoutSandbox(page: Page): Promise<void> {
  const errors = captureConsoleErrors(page);
  const networkFailures = captureNetworkFailures(page);

  await attachScreenshot(page, 'checkout-before');

  const paymentHeading = page.getByRole('heading', { name: /Pagamento|Checkout|PIX/i });
  await expect(paymentHeading.first()).toBeVisible({ timeout: 15000 });

  const sandboxButton = page.getByRole('button', { name: /Teste|Sandbox|Modo teste/i }).first();
  if (await sandboxButton.count() > 0) {
    await sandboxButton.click();
  }

  const continueButton = page.getByRole('button', { name: /Continuar|Pagar|Confirmar/i }).first();
  if (await continueButton.count() > 0) {
    await continueButton.click();
  }

  await page.waitForLoadState('networkidle', { timeout: 60000 });

  const successIndicator = page.getByText(/Pago|Aprovado|Confirmado|Paid|Approved/i);
  await expect(successIndicator.first()).toBeVisible({ timeout: 120000 });

  await attachScreenshot(page, 'checkout-completed');

  const consoleErrors = errors.filter(e => e.includes('ERROR'));
  if (consoleErrors.length > 0) {
    await test.info().attach('checkout-console-errors.txt', {
      body: consoleErrors.join('\n'),
      contentType: 'text/plain',
    });
  }
  if (networkFailures.length > 0) {
    await test.info().attach('checkout-network-failures.txt', {
      body: networkFailures.join('\n'),
      contentType: 'text/plain',
    });
  }
}

export async function fillOnboardingStep1(page: Page, data: {
  aitNumber: string;
  infractionCode: string;
  agency: string;
  plate: string;
  brandModel: string;
}): Promise<void> {
  const errors = captureConsoleErrors(page);
  const networkFailures = captureNetworkFailures(page);

  await attachScreenshot(page, 'step1-before');

  await page.getByLabel(/Número do AIT/i).fill(data.aitNumber);
  await page.getByLabel(/Código da infração/i).fill(data.infractionCode);
  await page.getByLabel(/Órgão autuador/i).fill(data.agency);
  await page.getByLabel(/Placa/i).fill(data.plate);
  await page.getByLabel(/Marca.*modelo/i).fill(data.brandModel);

  await attachScreenshot(page, 'step1-filled');

  await page.getByRole('button', { name: /^Continuar$/i }).click();
  await page.waitForLoadState('networkidle');

  const consoleErrors = errors.filter(e => e.includes('ERROR'));
  if (consoleErrors.length > 0) {
    await test.info().attach('step1-console-errors.txt', { body: consoleErrors.join('\n'), contentType: 'text/plain' });
  }
  if (networkFailures.length > 0) {
    await test.info().attach('step1-network-failures.txt', { body: networkFailures.join('\n'), contentType: 'text/plain' });
  }
}

export async function fillOnboardingStep2(page: Page, data: {
  allowedSpeed: string;
  measuredSpeed: string;
}): Promise<void> {
  const errors = captureConsoleErrors(page);
  const networkFailures = captureNetworkFailures(page);

  await attachScreenshot(page, 'step2-before');

  await expect(page.getByRole('heading', { name: /O que aconteceu\?/i })).toBeVisible();

  await page.getByLabel(/Velocidade permitida/i).fill(data.allowedSpeed);
  await page.getByLabel(/Velocidade medida/i).fill(data.measuredSpeed);

  await attachScreenshot(page, 'step2-filled');

  await page.getByRole('button', { name: /^Continuar$/i }).click();
  await page.waitForLoadState('networkidle');

  const consoleErrors = errors.filter(e => e.includes('ERROR'));
  if (consoleErrors.length > 0) {
    await test.info().attach('step2-console-errors.txt', { body: consoleErrors.join('\n'), contentType: 'text/plain' });
  }
  if (networkFailures.length > 0) {
    await test.info().attach('step2-network-failures.txt', { body: networkFailures.join('\n'), contentType: 'text/plain' });
  }
}

export async function fillOnboardingStep4(page: Page, data: {
  fullName: string;
  cpf: string;
  cnh: string;
  phone: string;
  email: string;
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  cityState: string;
}): Promise<void> {
  const errors = captureConsoleErrors(page);
  const networkFailures = captureNetworkFailures(page);

  await attachScreenshot(page, 'step4-before');

  await expect(page.getByRole('heading', { name: /Dados para a defesa/i })).toBeVisible();

  await page.getByLabel(/Nome completo/i).fill(data.fullName);
  await page.getByLabel(/CPF/i).fill(data.cpf);
  await page.getByLabel(/CNH/i).fill(data.cnh);
  await page.getByLabel(/Telefone/i).fill(data.phone);
  await page.getByLabel(/E-mail/i).fill(data.email);
  await page.getByLabel(/CEP/i).fill(data.cep);
  await page.getByLabel(/^Rua$/i).fill(data.street);
  await page.getByLabel(/^Número$/i).fill(data.number);
  await page.getByLabel(/Bairro/i).fill(data.neighborhood);
  await page.getByLabel(/Cidade.*UF/i).fill(data.cityState);

  await attachScreenshot(page, 'step4-filled');

  await page.getByRole('button', { name: /^Continuar$/i }).click();
  await page.waitForLoadState('networkidle');

  const consoleErrors = errors.filter(e => e.includes('ERROR'));
  if (consoleErrors.length > 0) {
    await test.info().attach('step4-console-errors.txt', { body: consoleErrors.join('\n'), contentType: 'text/plain' });
  }
  if (networkFailures.length > 0) {
    await test.info().attach('step4-network-failures.txt', { body: networkFailures.join('\n'), contentType: 'text/plain' });
  }
}

export async function proceedThroughReview(page: Page): Promise<void> {
  const errors = captureConsoleErrors(page);
  const networkFailures = captureNetworkFailures(page);

  await attachScreenshot(page, 'review-before');

  await expect(page.getByRole('heading', { name: /Revise seu caso/i })).toBeVisible();

  await page.getByRole('button', { name: /^Continuar$/i }).click();
  await page.waitForLoadState('networkidle');

  await attachScreenshot(page, 'review-completed');

  const consoleErrors = errors.filter(e => e.includes('ERROR'));
  if (consoleErrors.length > 0) {
    await test.info().attach('review-console-errors.txt', { body: consoleErrors.join('\n'), contentType: 'text/plain' });
  }
  if (networkFailures.length > 0) {
    await test.info().attach('review-network-failures.txt', { body: networkFailures.join('\n'), contentType: 'text/plain' });
  }
}

export async function generateDocument(page: Page): Promise<string> {
  const errors = captureConsoleErrors(page);
  const networkFailures = captureNetworkFailures(page);

  await attachScreenshot(page, 'document-generation-before');

  await expect(page.getByRole('heading', { name: /^Documento$/i })).toBeVisible();

  await page.getByRole('button', { name: /Gerar documento/i }).click();

  await page.waitForLoadState('networkidle', { timeout: 180000 });

  const docLink = page.getByRole('link', { name: /Abrir documento|Download|Visualizar/i }).first();
  await expect(docLink).toBeVisible({ timeout: 30000 });

  const href = await docLink.getAttribute('href');

  await attachScreenshot(page, 'document-generated');

  const consoleErrors = errors.filter(e => e.includes('ERROR'));
  if (consoleErrors.length > 0) {
    await test.info().attach('document-console-errors.txt', { body: consoleErrors.join('\n'), contentType: 'text/plain' });
  }
  if (networkFailures.length > 0) {
    await test.info().attach('document-network-failures.txt', { body: networkFailures.join('\n'), contentType: 'text/plain' });
  }

  return href || '';
}