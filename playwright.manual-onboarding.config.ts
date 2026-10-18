import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4179';

export default defineConfig({
  testDir: './tests',
  testMatch: ['onboarding-manual-rebuild.spec.ts'],
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/manual-onboarding', open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4179 --strictPort',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
