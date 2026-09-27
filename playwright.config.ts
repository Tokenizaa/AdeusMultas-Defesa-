import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const isProduction = process.env.PLAYWRIGHT_BASE_URL?.startsWith('https://') ?? false;

export default defineConfig({
  testDir: './tests/e2e/golden-path',
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
  timeout: 120 * 1000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: '.superpowers/evidence/html-report' }],
    ['json', { outputFile: '.superpowers/evidence/results.json' }],
    ['list'],
  ],
  use: {
    actionTimeout: 30000,
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'local',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'cloudflare',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chromium',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 393, height: 851 },
        deviceScaleFactor: 2.75,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: !isProduction
    ? {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
  outputDir: '.superpowers/evidence/test-results',
});