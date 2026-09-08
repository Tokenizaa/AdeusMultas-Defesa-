import { defineConfig, devices } from '@playwright/test';

const localBaseUrl = process.env.LOCAL_PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';

if (!/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(localBaseUrl)) {
  throw new Error(`LOCAL_PLAYWRIGHT_BASE_URL inválido: ${localBaseUrl}. O Golden Path local só pode apontar para localhost/127.0.0.1.`);
}

export default defineConfig({
  testDir: './tests/local',
  timeout: 60 * 1000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: localBaseUrl,
    actionTimeout: 15_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-local',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: localBaseUrl,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
