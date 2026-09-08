import { defineConfig, devices } from '@playwright/test';

const productionBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
if (!productionBaseUrl) {
  throw new Error('PLAYWRIGHT_BASE_URL é obrigatório. A suíte E2E Golden Path deve executar contra uma implantação Vercel/produção, nunca contra localhost.');
}

if (!/^https:\/\//i.test(productionBaseUrl)) {
  throw new Error(`PLAYWRIGHT_BASE_URL inválido: ${productionBaseUrl}. Use uma URL HTTPS de produção.`);
}

export default defineConfig({
  testDir: './tests',
  testIgnore: [
    '**/invariants/**',
    '**/*.test.ts',
    '**/unit/**',
    '**/payments/**',
    '**/knowledge/**',
    '**/audit/**',
    '**/core/**',
    '**/e2e/services/**',
    '**/e2e-infrastructure.ts',
    '**/e2e-setup.ts',
    '**/e2e-fixtures.ts',
    '**/e2e-onboarding-executor.ts',
    '**/e2e-validator.ts',
    '**/e2e-runner.spec.ts',
    '**/local/**',
  ],
  timeout: 60 * 1000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    actionTimeout: 15000,
    baseURL: productionBaseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-production',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
