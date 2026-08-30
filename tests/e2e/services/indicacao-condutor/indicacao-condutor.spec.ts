import { test, expect } from '@playwright/test';
import { TestUserFactory } from '../../fixtures/user.factory';
import { TestCaseFactory } from '../../fixtures/case.factory';
import { executeDeterministicE2EVerification } from '../../helpers/documents';

test.describe('Suíte E2E: Indicação do Real Condutor (FARI)', () => {
  test('Cenário 1: Indicação tempestiva com documentação completa (Teste 021)', async () => {
    const user = TestUserFactory.create(21);
    const scenario = TestCaseFactory.createScenario('indicacao-condutor', 1, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
    expect(result.audit.crossContaminationDetected).toBe(false);
  });

  test('Cenário 2: Indicação de condutor com CNH de outro estado (Teste 022)', async () => {
    const user = TestUserFactory.create(22);
    const scenario = TestCaseFactory.createScenario('indicacao-condutor', 2, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
  });

  test('Cenário 3: Indicação de condutor em autuação por semáforo eletrônico (Teste 023)', async () => {
    const user = TestUserFactory.create(23);
    const scenario = TestCaseFactory.createScenario('indicacao-condutor', 3, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
  });

  test('Cenário 4: Indicação de condutor para evitar multa NIC em PJ (Teste 024)', async () => {
    const user = TestUserFactory.create(24);
    const scenario = TestCaseFactory.createScenario('indicacao-condutor', 4, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
  });
});
