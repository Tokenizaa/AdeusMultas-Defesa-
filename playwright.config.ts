import 'dotenv/config';
import { defineConfig } from '@playwright/test';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://adeusmulta.defesai.com.br';
if (!/^https?:\/\//i.test(baseURL)) throw new Error('PLAYWRIGHT_BASE_URL inválido.');
const target = new URL(baseURL);
if (['localhost', '127.0.0.1', '::1'].includes(target.hostname) || target.hostname.endsWith('.localhost')) {
  throw new Error('Execução E2E local bloqueada: use a URL publicada em PLAYWRIGHT_BASE_URL.');
}
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
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'off', ignoreHTTPSErrors: false },
  outputDir: 'artifacts/e2e-results',
});
