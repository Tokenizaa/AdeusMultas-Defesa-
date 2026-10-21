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
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: { baseURL, trace: 'off', screenshot: 'off', video: 'off', ignoreHTTPSErrors: false },
  outputDir: 'artifacts/e2e-results-fast',
});
