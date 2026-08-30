import { test, expect } from '@playwright/test';
import { TestUserFactory } from '../../fixtures/user.factory';
import { TestCaseFactory } from '../../fixtures/case.factory';
import { executeDeterministicE2EVerification } from '../../helpers/documents';

test.describe('Suíte E2E: Defesa em Processo de Cassação da CNH (PCDD)', () => {
  test('Cenário 1: PCDD com prova de não direção no flagrante (Teste 017)', async () => {
    const user = TestUserFactory.create(17);
    const scenario = TestCaseFactory.createScenario('cassacao', 1, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
    expect(result.audit.crossContaminationDetected).toBe(false);
  });

  test('Cenário 2: PCDD com nulidade prévia do PSDD gerador (Teste 018)', async () => {
    const user = TestUserFactory.create(18);
    const scenario = TestCaseFactory.createScenario('cassacao', 2, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
  });

  test('Cenário 3: PCDD com impugnação de reincidência de 12 meses (Teste 019)', async () => {
    const user = TestUserFactory.create(19);
    const scenario = TestCaseFactory.createScenario('cassacao', 3, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
  });

  test('Cenário 4: PCDD perante diretoria estadual de habilitação (Teste 020)', async () => {
    const user = TestUserFactory.create(20);
    const scenario = TestCaseFactory.createScenario('cassacao', 4, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
  });
});
