import { test, expect, Page } from '@playwright/test';
import { testUser, testVehicle, testInfraction } from './onboarding.spec';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

/**
 * Comprehensive Onboarding Test Matrix
 * Covers all service types, situations, stages, and categories
 */
const TEST_MATRIX = [
  // Multa de Trânsito scenarios
  {
    name: 'multa_transito_velocidade',
    service: 'multa_transito',
    stage: 'primeira_notificacao',
    category: 'excesso_velocidade',
    speedLimit: '60',
    measuredSpeed: '73',
    expectedInfractionCode: '745-50',
  },
  {
    name: 'multa_transito_lei_seca',
    service: 'multa_transito',
    stage: 'primeira_notificacao',
    category: 'lei_seca',
    speedLimit: '50',
    measuredSpeed: '75',
    expectedInfractionCode: '516-91',
  },
  {
    name: 'multa_transito_celular',
    service: 'multa_transito',
    stage: 'primeira_notificacao',
    category: 'celular',
    expectedInfractionCode: '736-62',
  },
  {
    name: 'multa_transito_estacionamento',
    service: 'multa_transito',
    stage: 'primeira_notificacao',
    category: 'estacionamento',
    expectedInfractionCode: '1-01',
  },
  {
    name: 'multa_transito_conversao_advertencia',
    service: 'conversao_advertencia',
    stage: 'primeira_notificacao',
    category: 'conversao_advertencia',
  },
  {
    name: 'multa_transito_indicacao_condutor',
    service: 'indicacao_condutor',
    stage: 'primeira_notificacao',
    category: 'indicacao_condutor',
  },
  {
    name: 'multa_transito_inferred',
    service: 'multa_transito',
    stage: 'nao_tenho_certeza',
  },
  {
    // Suspensao cnh scenarios
    name: 'suspensao_cnh_lei_seca',
    service: 'suspensao_cnh',
    stage: 'primeira_notificacao',
    category: 'lei_seca',
  },
  {
    name: 'suspensao_cnh_velocidade',
    service: 'suspensao_cnh',
    stage: 'primeira_notificacao',
    category: 'excesso_velocidade',
  },
  {
    // Indicacao condutor scenario
    name: 'indicacao_condutor',
    service: 'indicacao_condutor',
    stage: 'primeira_notificacao',
    category: 'indicacao_condutor',
  },
  {
    // Conversao advertencia scenario
    name: 'conversao_advertencia',
    service: 'conversao_advertencia',
    stage: 'primeira_notificacao',
  },
  {
    // Inferred stage scenario
    name: 'inferred_stage',
    service: 'multa_transito',
    stage: 'nao_tenho_certeza',
  },
];

/**
 * Test the complete onboarding flow for a specific scenario
 */
async function testCompleteOnboarding(page: Page, scenario: any) {
  await navigateToOnboarding(page);
  
  // Step 1: Select service
  await page.click(`#service-option-${scenario.service}`);
  await waitForStep(page, 2);
  
  // Step 2: Select stage (if not inferred)
  if (scenario.stage && scenario.stage !== 'nao_tenho_certeza') {
    await page.click(`#stage-option-${scenario.stage}`);
    await waitForStep(page, 3);
  }
  
  // Step 2: Select category (if not inferred)
  if (scenario.category) {
    await page.click(`#category-card-${scenario.category}`);
    await page.click('#btn-next-to-identification');
    await waitForStep(page, 4);
  }
  
  // Step 4: Fill identification form
  await fillInput(page, 'input-lead-name', testUser.name);
  await fillInput(page, 'input-lead-phone', testUser.phone);
  await fillInput(page, 'input-ait-number', testInfraction.aitNumber);
  await fillInput(page, 'input-vehicle-plate', testVehicle.plate);
  await selectNativeOption(page, 'input-infraction-code', scenario.expectedInfractionCode);
  await selectNativeOption(page, 'input-autuador-body', testInfraction.autuadorBody);
  await fillInput(page, 'input-datetime', testInfraction.dateTime);
  await page.click('#btn-next-to-specifics');
  await waitForStep(page, 5);
  
  // Step 5: Speed category specific fields
  if (scenario.category === 'excesso_velocidade' || scenario.category === 'lei_seca' || 
      scenario.category === 'celular' || scenario.category === 'vermelho' || scenario.category === 'estacionamento') {
    await fillInput(page, 'input-speed-limit', scenario.speedLimit);
    await fillInput(page, 'input-measured-speed', scenario.measuredSpeed);
    await page.waitForTimeout(300);
  }
  
  // Run analysis
  await page.click('#btn-run-analysis');
  await waitForStep(page, 6);
  await runAnalysisAndWaitResult(page);
  
  // Proceed to document generation
  await page.click('#btn-proceed-to-document-generation');
  await waitForStep(page, 7);
  await page.click('#btn-proceed-to-document-generation');
  await waitForStep(page, 8);
  
  // Step 8: Fill qualification data
  await fillInput(page, 'input-applicant-name', testUser.name);
  await fillInput(page, 'input-applicant-cpf', testUser.cpf);
  await fillInput(page, 'input-applicant-cnh', testUser.cnh);
  await fillInput(page, 'input-cnh-category', 'AB');
  await fillInput(page, 'input-applicant-email', testUser.email);
  await fillInput(page, 'input-applicant-phone', testUser.phone);
  await fillInput(page, 'input-address-street', 'Rua das Flores, 450');
  await fillInput(page, 'input-address-number', '450');
  await fillInput(page, 'input-address-neighborhood', 'Vila Madalena');
  await fillInput(page, 'input-address-zipcode', '01234-567');
  await fillInput(page, 'input-address-citystate', 'São Paulo/SP');
  await page.click('#btn-next-to-review');
  await waitForStep(page, 9);
  
  // Step 10: Checkout
  await page.click('#btn-proceed-to-checkout');
  await waitForStep(page, 10);
  await expect(page.locator('button[role="tab"]:has-text("PIX")')).toBeVisible();
  await expect(page.locator('button[role="tab"]:has-text("Cartão")')).toBeVisible();
}

/**
 * Main test suite for comprehensive onboarding testing
 */
test.describe('Comprehensive Onboarding Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.addInitScript(() => {
      localStorage.removeItem('defesai_wizard_state');
      localStorage.removeItem('defesai_auth_session_v1');
    });
    await page.clock.install();
  });

  test('Complete onboarding flow for all service types', async ({ page }) => {
    for (const scenario of TEST_MATRIX) {
      console.log(`Testing: ${scenario.name}`);
      await testCompleteOnboarding(page, scenario);
    }
  });

  test('Test all document generation scenarios', async ({ page }) => {
    // Test document generation for different scenarios
    await testCompleteOnboarding(page, {
      service: 'multa_transito',
      stage: 'primeira_notificacao',
      category: 'excesso_velocidade',
      speedLimit: '60',
      measuredSpeed: '73',
    });

    await testCompleteOnboarding(page, {
      service: 'recurso_jari',
      stage: 'primeira_notificacao',
      category: 'lei_seca',
    });

    await testCompleteOnboarding(page, {
      service: 'suspensao_cnh',
      stage: 'primeira_notificacao',
      category: 'lei_seca',
    });
  });

  test('Test validation and required fields', async ({ page }) => {
    await navigateToOnboarding(page);
    await page.click('#service-option-multa_transito');
    await waitForStep(page, 2);
    await page.click('#stage-option-primeira_notificacao');
    await waitForStep(page, 3);
    await page.click('#category-card-excesso_velocidade');
    await page.click('#btn-next-to-identification');
    await waitForStep(page, 4);
    
    // Test required fields blocking
    const nextBtn = page.locator('#btn-next-to-specifics');
    await expect(nextBtn).toBeDisabled();
    
    // name + phone only
    await fillInput(page, 'input-lead-name', testUser.name);
    await fillInput(page, 'input-lead-phone', testUser.phone);
    await expect(nextBtn).toBeDisabled();
    
    // + plate
    await fillInput(page, 'input-vehicle-plate', testVehicle.plate);
    await expect(nextBtn).toBeDisabled();
    
    // + AIT
    await fillInput(page, 'input-ait-number', testInfraction.aitNumber);
    await expect(nextBtn).toBeDisabled();
    
    // + infraction code (still missing autuador)
    await selectNativeOption(page, 'input-infraction-code', testInfraction.infractionCode);
    await expect(nextBtn).toBeDisabled();
    
    // + autuador -> enabled
    await selectNativeOption(page, 'input-autuador-body', testInfraction.autuadorBody);
    await expect(nextBtn).toBeEnabled();
  });

  test('Admin test-fill button functionality', async ({ page }) => {
    await forceLocalAuth(page, ADMIN_USER);
    await navigateToOnboarding(page);
    await page.click('#service-option-multa_transito');
    await waitForStep(page, 2);
    await page.click('#stage-option-primeira_notificacao');
    await waitForStep(page, 3);
    await page.click('#category-card-excesso_velocidade');
    await page.click('#btn-next-to-identification');
    await waitForStep(page, 4);
    
    const testFillBtn = page.locator(TEST_FILL_BTN);
    await expect(testFillBtn).toBeVisible();
    
    await testFillBtn.click();
    await page.waitForTimeout(500);
    
    // Verify auto-filled fields
    const nameVal = await page.inputValue('#input-lead-name');
    const phoneVal = await page.inputValue('#input-lead-phone');
    const plateVal = await page.inputValue('#input-vehicle-plate');
    const aitVal = await page.inputValue('#input-ait-number');
    
    expect(nameVal.length).toBeGreaterThan(3);
    expect(phoneVal.length).toBeGreaterThan(8);
    expect(plateVal.length).toBeGreaterThanOrEqual(7);
    expect(aitVal.length).toBeGreaterThanOrEqual(8);
  });

  test('Navigation between steps', async ({ page }) => {
    await navigateToOnboarding(page);
    await page.click('#service-option-multa_transito');
    await waitForStep(page, 2);
    
    // Back to step 1
    await page.click('button:has-text("Voltar à situação")');
    await waitForStep(page, 1);
    
    // Test inferred stage navigation (skips steps 2 and 3)
    await page.click('#service-option-conversao_advertencia');
    await waitForStep(page, 4);
  });

  test('Accessibility and form validation', async ({ page }) => {
    await navigateToOnboarding(page);
    await page.click('#service-option-multa_transito');
    await waitForStep(page, 2);
    await page.click('#stage-option-primeira_notificacao');
    await waitForStep(page, 3);
    await page.click('#category-card-excesso_velocidade');
    await page.click('#btn-next-to-identification');
    await waitForStep(page, 4);
    
    // Verify labeled inputs exist on step 4
    const requiredIds = ['input-lead-name', 'input-lead-phone', 'input-ait-number', 'input-vehicle-plate', 'input-infraction-code', 'input-autuador-body'];
    for (const id of requiredIds) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
  });
});