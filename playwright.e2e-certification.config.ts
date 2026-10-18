import { defineConfig, devices } from '@playwright/test';

const baseURL = 'https://adeusmulta.defesai.com.br';

export default defineConfig({
  testDir: './tests',
  testMatch: ['e2e-runner.spec.ts'],
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 4 * 60_000,
  expect: { timeout: 12_000 },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/e2e-certification', open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
});
