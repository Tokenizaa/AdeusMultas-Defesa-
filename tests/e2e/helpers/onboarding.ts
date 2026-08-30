/**
 * @file onboarding.ts
 * DefesAi — Helper para navegação e preenchimento determinístico do Onboarding E2E
 */

import { Page, expect } from '@playwright/test';
import { TestCaseScenario } from '../fixtures/case.factory';

export async function fillOnboardingFlow(page: Page, scenario: TestCaseScenario) {
  // Navega até a página de novo caso
  await page.goto('/novo-caso');
  await page.waitForLoadState('networkidle');

  // Step 1: Seleção da Situação / Serviço
  const serviceSelector = `button#service-opt-${scenario.serviceKey}` || 'button';
  const serviceBtn = page.locator(`[data-testid="service-${scenario.serviceKey}"], #service-opt-${scenario.serviceKey}, button:has-text("${scenario.serviceKey}")`).first();
  if (await serviceBtn.isVisible()) {
    await serviceBtn.click();
  }

  // Avança pelos steps se os botões estiverem presentes
  const nextBtn = page.locator('#btn-wizard-next, button:has-text("Continuar"), button:has-text("Próximo Passo")').first();
  if (await nextBtn.isVisible()) {
    await nextBtn.click();
  }
}
