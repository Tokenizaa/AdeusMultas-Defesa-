import 'dotenv/config';
import { defineConfig } from '@playwright/test';
const baseURL = process.env.PLAYWRIGHT_BASE_URL;
if (!baseURL) throw new Error('PLAYWRIGHT_BASE_URL é obrigatório; localhost não é fallback.');
if (!/^https?:\/\//i.test(baseURL)) throw new Error('PLAYWRIGHT_BASE_URL inválido.');
export default defineConfig({
  testDir: './tests/e2e-reconstruction',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { outputFolder: 'artifacts/e2e-report', open: 'never' }]],
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'retain-on-failure', ignoreHTTPSErrors: false },
  outputDir: 'artifacts/e2e-results',
});
