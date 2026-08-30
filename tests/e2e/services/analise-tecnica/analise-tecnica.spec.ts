import { test, expect } from '@playwright/test';
import { TestUserFactory } from '../../fixtures/user.factory';
import { TestCaseFactory } from '../../fixtures/case.factory';
import { executeDeterministicE2EVerification } from '../../helpers/documents';

test.describe('Suíte E2E: Parecer Técnico de Consistência e Vícios Formais', () => {
  test('Cenário 1: Parecer técnico sobre enquadramento Portaria 354 (Teste 029)', async () => {
    const user = TestUserFactory.create(29);
    const scenario = TestCaseFactory.createScenario('analise-tecnica', 1, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
    expect(result.audit.crossContaminationDetected).toBe(false);
  });

  test('Cenário 2: Auditoria de divergência de campos no AIT (Teste 030)', async () => {
    const user = TestUserFactory.create(30);
    const scenario = TestCaseFactory.createScenario('analise-tecnica', 2, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
  });

  test('Cenário 3: Parecer técnico em autuação por videomonitoramento (Teste 031)', async () => {
    const user = TestUserFactory.create(31);
    const scenario = TestCaseFactory.createScenario('analise-tecnica', 3, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
  });

  test('Cenário 4: Parecer técnico com score de probabilidade de deferimento (Teste 032)', async () => {
    const user = TestUserFactory.create(32);
    const scenario = TestCaseFactory.createScenario('analise-tecnica', 4, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
  });
});
