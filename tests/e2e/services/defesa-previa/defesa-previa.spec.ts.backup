import { test, expect } from '@playwright/test';
import { TestUserFactory } from '../../fixtures/user.factory';
import { TestCaseFactory } from '../../fixtures/case.factory';
import { executeDeterministicE2EVerification } from '../../helpers/documents';

test.describe('Suíte E2E: Defesa Prévia (Notificação de Autuação)', () => {
  test('Cenário 1: Notificação de Autuação com vício temporal (Teste 001)', async ({ page }) => {
    const user = TestUserFactory.create(1);
    const scenario = TestCaseFactory.createScenario('defesa-previa', 1, user);
    
    // Executa verificação determinística completa do fluxo e marca-d'água
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
    expect(result.audit.crossContaminationDetected).toBe(false);
  });

  test('Cenário 2: Excesso de velocidade com inconsistência formal (Teste 002)', async ({ page }) => {
    const user = TestUserFactory.create(2);
    const scenario = TestCaseFactory.createScenario('defesa-previa', 2, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
  });

  test('Cenário 3: Defesa prévia perante órgão municipal (Teste 003)', async ({ page }) => {
    const user = TestUserFactory.create(3);
    const scenario = TestCaseFactory.createScenario('defesa-previa', 3, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
  });

  test('Cenário 4: Defesa prévia em rodovia estadual com radar (Teste 004)', async ({ page }) => {
    const user = TestUserFactory.create(4);
    const scenario = TestCaseFactory.createScenario('defesa-previa', 4, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
  });
});
