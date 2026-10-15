import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL;
if (!baseURL || (!/^https:\/\//i.test(baseURL) && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(baseURL))) {
  throw new Error('PLAYWRIGHT_BASE_URL deve ser HTTPS ou localhost para o Worker remoto local.');
}

export default defineConfig({
  testDir: './tests',
  testMatch: '**/e2e-runner.spec.ts',
  // The complete production-shaped flow includes real auth, analysis and
  // document generation; it routinely exceeds one minute even when healthy.
  // Keep step-level waits bounded, but do not turn a completed PASS into a
  // timeout failure at the test boundary.
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  workers: 4,
  reporter: 'line',
  use: { ...devices['Desktop Chrome'], baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
});
