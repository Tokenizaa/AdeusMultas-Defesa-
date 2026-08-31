import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// Test data for different infraction types
const TEST_SCENARIOS = [
  {
    name: 'excesso_velocidade',
    situation: 'multa_transito',
    stage: 'primeira_notificacao',
    category: 'excesso_velocidade',
    speedLimit: '60',
    measuredSpeed: '73',
    expectedInfractionCode: '745-50',
    expectedDescription: 'Transitar em velocidade superior à máxima permitida em até 20%',
    expectedSeverity: 'media',
    expectedPoints: 4,
    expectedFine: 130.16,
  },
  {
    name: 'lei_seca',
    situation: 'multa_transito',
    stage: 'primeira_notificacao',
    category: 'lei_seca',
    expectedInfractionCode: '516-91',
    expectedDescription: 'Recusa ao teste do etilômetro / alcoolemia',
    expectedSeverity: 'gravissima',
    expectedPoints: 7,
    expectedFine: 2934.70,
  },
  {
    name: 'celular',
    situation: 'multa_transito',
    stage: 'primeira_notificacao',
    category: 'celular',
    expectedInfractionCode: '736-62',
    expectedDescription: 'Segurar ou manusear telefone celular ao volante',
    expectedSeverity: 'gravissima',
    expectedPoints: 7,
    expectedFine: 293.47,
  }
];
const ADMIN_USER = {
  name: 'Admin User',
  phone: '1234567890',
  role: 'admin',
};


// Helper to block Supabase requests (forces localStorage auth fallback)
// Helper to block Supabase requests (forces localStorage auth fallback)
async function blockSupabaseRequests(page: Page) {
  await page.route('**/*', (route) => {
    const url = route.request().url();
    try {
      const hostname = new URL(url).hostname;
      if (hostname.endsWith('supabase.co') || hostname.includes('.supabase.co')) {
        return route.abort();
      }
    } catch (_) {
      // If URL is invalid, just continue
    }
    return route.continue();
  });
}

// Simulate a logged-in user via the localStorage auth fallback.
async function forceLocalAuth(page: Page, user: Record<string, unknown>) {
  await page.addInitScript((mockUser) => {
    localStorage.setItem('defesai_auth_session_v1', JSON.stringify(mockUser));
  }, user);
}

// Page navigation helpers
async function navigateToOnboarding(page: Page) {
  // Listen for console errors and page errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log('Browser console error:', msg.text(), 'URL:', msg.location()?.url);
    }
  });
  page.on('pageerror', err => {
    errors.push(err.message);
    console.log('Page error:', err.message);
  });
  // Listen for window errors and unhandled rejections
  await page.evaluate(() => {
    window.onerror = (msg, url, line, col, error) => {
      console.log('Window error:', msg, 'at', url, 'line:', line);
      return false;
    };
    window.onunhandledrejection = event => {
      console.log('Unhandled rejection:', event.reason);
    };
  });
  await page.goto(`${BASE_URL}/novo-caso`, { waitUntil: 'networkidle' });
  const url = page.url();
  // Check if the main script loads
  const scriptStatus = await page.evaluate(async () => {
    const res = await fetch('/src/main.tsx');
    return res.status;
  });
  console.log('Script fetch status:', scriptStatus);
  console.log('Navigation URL:', url);
  const title = await page.title();
  console.log('Page title:', title);
  // Check for the step 1 title element
  const step1Locator = page.locator('h1:has-text("Qual situação você quer resolver?"), h2:has-text("Qual situação você quer resolver?"), h3:has-text("Qual situação você quer resolver?")');
  const count = await step1Locator.count();
  console.log('Step 1 title element count:', count);
  if (count > 0) {
    const text = await step1Locator.first().textContent();
    console.log('Step 1 title text:', text);
  }
  // Log body innerHTML for debugging
  const bodyInnerHTML = await page.evaluate(() => document.body.innerHTML);
  console.log('Body innerHTML (first 500):', bodyInnerHTML.substring(0, 500));
  await page.waitForTimeout(500);
  await waitForStep(page, 1);
}
function getStepTitle(step: number): string {
  const titles: Record<number, string> = {
    1: 'Qual situação você quer resolver?',
    2: 'Em que situação está sua multa?',
    3: 'Sobre o tipo da infração',
    4: 'Qual é o auto de infração e o condutor?',
    5: 'Detalhes técnicos da sua autuação',
    6: 'Processando Análise Jurídica',
    7: 'Diagnóstico Jurídico Gratuito Concluído',
    8: 'Qualificação do Requerente para la Peça',
    10: 'Liberação da Petição & Checklist de Protocolo',
  };
  return titles[step] || `Etapa ${step}`;
}

async function waitForStep(page: Page, step: number) {
  const title = getStepTitle(step);
  await expect(
    page.locator(`h1:has-text("${title}"), h2:has-text("${title}"), h3:has-text("${title}")`)
  ).toBeVisible();
}

async function fillInput(page: Page, id: string, value: string) {
  await page.fill(`#${id}`, value);
  await page.waitForTimeout(100);
}

async function selectNativeOption(page: Page, id: string, value: string) {
  await page.waitForFunction(
    ([sel, val]) => {
      const el = document.querySelector(sel) as HTMLSelectElement | null;
      return !!el && Array.from(el.options).some((o) => o.value === val);
    },
    [`#${id}`, value]
  );
  await page.selectOption(`#${id}`, value);
  await page.waitForTimeout(100);
}

// Test the comprehensive case creation flow
test.describe('Comprehensive Case Creation - Testing Multiple Infraction Types', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.addInitScript(() => {
      localStorage.removeItem('defesai_wizard_state');
      localStorage.removeItem('defesai_auth_session_v1');
    });
    await page.clock.install();
    await blockSupabaseRequests(page);
  });

  test('excesso_velocidade: complete test flow and verify results', async ({ page }) => {
    // Set admin authentication
    await forceLocalAuth(page, ADMIN_USER);
    // Navigate to onboarding
    await navigateToOnboarding(page);
    
    // Step 1: Service selection
    await page.click('#service-option-multa_transito');
    await waitForStep(page, 2);
    
    // Step 2: Stage selection
    await page.click('#stage-option-primeira_notificacao');
    await waitForStep(page, 3);
    
    // Step 3: Category selection
    await page.click('#category-card-excesso_velocidade');
    await page.click('#btn-next-to-identification');
    await waitForStep(page, 4);
    
    // Step 4: Fill identification form
    await fillInput(page, 'input-lead-name', ADMIN_USER.name);
    await fillInput(page, 'input-lead-phone', ADMIN_USER.phone);
    await fillInput(page, 'input-ait-number', '1B892014');
    await fillInput(page, 'input-vehicle-plate', 'BRA2E19');
    await selectNativeOption(page, 'input-infraction-code', '745-50');
    await selectNativeOption(page, 'input-autuador-body', 'DETRAN-SP');
    await fillInput(page, 'input-datetime', '2024-01-15');
    await page.click('#btn-next-to-specifics');
    await page.waitForTimeout(500);
    await waitForStep(page, 5);
  await page.waitForSelector('#btn-run-analysis', { state: 'attached' });
    await page.waitForSelector('#btn-run-analysis', { state: 'visible' });
    await page.click('#btn-run-analysis', { force: true });
    
    // Verify analysis results
    await expect(page.locator('text=Probabilidade de Êxito')).toBeVisible();
    // Document generation
    const proceedButton = page.getByRole('button').filter({ hasText: /proceed/i });
    await proceedButton.click();
    await page.waitForTimeout(2000);
    const nextButton = page.getByRole('button').filter({ hasText: /next/i });
    await nextButton.waitFor({ state: 'attached' });
    await nextButton.waitFor({ state: 'visible' });
    await nextButton.click();
    
    // Verify document review
    await expect(page.locator('text=Revisão dos Dados da Petição')).toBeVisible();
  });

  test('lei_seca: complete test flow and verify analysis', async ({ page }) => {
    await forceLocalAuth(page, ADMIN_USER);
    await navigateToOnboarding(page);
    
    // Step 1: Service selection
    await page.click('#service-option-multa_transito');
    await waitForStep(page, 2);
    
    // Step 2: Stage selection
    await page.click('#stage-option-primeira_notificacao');
    await waitForStep(page, 3);
    
    // Step 3: Category selection
    await page.waitForSelector('#category-card-lei_seca', { state: 'visible' });
    await page.click('#category-card-lei_seca');
    await page.click('#btn-next-to-identification');
    await waitForStep(page, 4);
    
    // Fill identification form
    await fillInput(page, 'input-lead-name', ADMIN_USER.name);
    await fillInput(page, 'input-lead-phone', ADMIN_USER.phone);
    await fillInput(page, 'input-ait-number', 'TEST123');
    await fillInput(page, 'input-vehicle-plate', 'ABC1234');
    await selectNativeOption(page, 'input-infraction-code', '516-91');
    await selectNativeOption(page, 'input-autuador-body', 'DETRAN-SP');
    await fillInput(page, 'input-datetime', '2024-01-15');
    
    // Step 5: Use test fill button (wait for button to be visible)
    await page.waitForSelector('button:has-text("🧪 Preencher com dados de teste")', { state: 'visible' });
    await page.click('button:has-text("🧪 Preencher com dados de teste")');
    
    // Wait for the test fill button to populate the lei_seca specific data
    // This ensures the button click was processed and the form is updated
    await page.waitForSelector('.mt-2.flex.flex-wrap.gap-2', { state: 'visible' });
    await page.waitForTimeout(5000);
    
    // Debug: Wait for any button to be present
    await page.waitForFunction(() => document.querySelectorAll('button').length > 0);
    
    // Run analysis - find button by role and text
    const runButton = page.getByRole('button').filter({ hasText: /run/i });
    await runButton.waitFor({ state: 'attached' });
    await runButton.waitFor({ state: 'visible' });
    await runButton.click({ force: true });
    
    // Verify analysis results
    await expect(page.locator('text=Probabilidade de Êxito')).toBeVisible();
    await expect(page.locator('text=lei_seca')).toBeVisible();
    
    await page.click('#btn-proceed-to-document-generation');
    await page.click('#btn-next-to-document-review');
    
    // Verify document review
    await expect(page.locator('text=Revisão dos Dados da Petição')).toBeVisible();
  });

  test('celular: complete test flow and verify analysis', async ({ page }) => {
    await forceLocalAuth(page, ADMIN_USER);
    await navigateToOnboarding(page);
    
    // Step 1: Service selection
    await page.click('#service-option-multa_transito');
    await waitForStep(page, 2);
    
    // Step 2: Stage selection
    await page.click('#stage-option-primeira_notificacao');
    await waitForStep(page, 3);
    
    // Step 3: Category selection
    await page.waitForSelector('#category-card-celular', { state: 'visible' });
    await page.click('#category-card-celular');
    await page.click('#btn-next-to-identification');
    await waitForStep(page, 4);
    
    // Fill identification form
    await fillInput(page, 'input-lead-name', ADMIN_USER.name);
    await fillInput(page, 'input-lead-phone', ADMIN_USER.phone);
    await fillInput(page, 'input-ait-number', 'TEST123');
    await fillInput(page, 'input-vehicle-plate', 'ABC1234');
    await selectNativeOption(page, 'input-infraction-code', '736-62');
    await selectNativeOption(page, 'input-autuador-body', 'DETRAN-SP');
    await page.click('#btn-next-to-specifics');
    await waitForStep(page, 5);
    
    // Test fill button (wait for button to be visible)
    await page.waitForSelector('button:has-text("Preencher com dados de teste")', { state: 'visible' });
    await page.click('button:has-text("Preencher com dados de teste")');
    // Wait for the test fill button to populate the celular specific data
    // This ensures the button click was processed and the form is updated
    await page.waitForSelector('#select-celular-circunstancia', { state: 'visible' });
    await page.waitForFunction(() => {
      const select = document.querySelector('#select-celular-circunstancia') as HTMLSelectElement | null;
      return !!select && select.value.length > 0;
    });
    
    // Run analysis
    await page.waitForSelector('#btn-run-analysis', { state: 'attached' });
    await page.waitForSelector('#btn-run-analysis', { state: 'visible' });
    await page.click('#btn-run-analysis', { force: true });
    
    // Verify results
    await expect(page.locator('text=Probabilidade de Êxito')).toBeVisible();
    await expect(page.locator('text=celular')).toBeVisible();
    
    await page.getByRole('button').filter({ hasText: /proceed/i }).click();
    await page.waitForTimeout(2000);
    await page.getByRole('button').filter({ hasText: /next/i }).waitFor({ state: 'attached' });
    await page.getByRole('button').filter({ hasText: /next/i }).waitFor({ state: 'visible' });
    await page.getByRole('button').filter({ hasText: /next/i }).click();
    
    // Verify document review
    await expect(page.locator('text=Revisão dos Dados da Petição')).toBeVisible();
  });
});