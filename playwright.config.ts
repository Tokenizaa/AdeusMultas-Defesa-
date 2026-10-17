import { defineConfig, devices } from '@playwright/test';

const configuredBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const allowLocalServer = process.env.E2E_USE_LOCAL_SERVER === 'true';
const productionBaseUrl = configuredBaseUrl || (allowLocalServer ? 'http://127.0.0.1:3000' : '');

if (!productionBaseUrl) {
  throw new Error('PLAYWRIGHT_BASE_URL é obrigatório. Para produção use HTTPS; para desenvolvimento local, use scripts/e2e-server-manager.mjs com E2E_USE_LOCAL_SERVER=true.');
}

const isExplicitLocalUrl = allowLocalServer && /^http:\/\/(localhost|127\.0\.0\.1)(:\\d+)?(?:\/|$)/i.test(productionBaseUrl);
if (!/^https:\/\//i.test(productionBaseUrl) && !isExplicitLocalUrl) {
  throw new Error(`PLAYWRIGHT_BASE_URL inválido: ${productionBaseUrl}. Use HTTPS, ou habilite explicitamente E2E_USE_LOCAL_SERVER=true para localhost.`);
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
