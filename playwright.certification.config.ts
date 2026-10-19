import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_CERTIFICATION_BASE_URL;
const paymentMode = process.env.E2E_CERTIFICATION_PAYMENT_MODE;

if (!baseURL || !/^https:\/\//i.test(baseURL)) {
  throw new Error('E2E_CERTIFICATION_BASE_URL HTTPS de pré-produção é obrigatório.');
}
if (/adeusmulta\.defesai\.com\.br|defesai\.shop/i.test(new URL(baseURL).hostname)) {
  throw new Error('Certificação greenfield bloqueada: a URL informada é de produção.');
}
if (paymentMode !== 'disabled') {
  throw new Error('E2E_CERTIFICATION_PAYMENT_MODE=disabled é obrigatório; pagamentos reais são proibidos.');
}

export default defineConfig({
  testDir: './tests/certification',
  testMatch: '**/*.spec.ts',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/certification', open: 'never' }]],
  outputDir: 'test-results/certification',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
