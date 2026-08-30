import { test, expect } from '@playwright/test';
import { TestUserFactory } from '../../fixtures/user.factory';
import { TestCaseFactory } from '../../fixtures/case.factory';
import { executeDeterministicE2EVerification } from '../../helpers/documents';

test.describe('Suíte E2E: Recurso Ordinário à JARI (1ª Instância)', () => {
  test('Cenário 1: Recurso JARI contra NIP por falta de aferição metrológica (Teste 005)', async () => {
    const user = TestUserFactory.create(5);
    const scenario = TestCaseFactory.createScenario('recurso-jari', 1, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
    expect(result.audit.crossContaminationDetected).toBe(false);
  });

  test('Cenário 2: Recurso JARI contra autuação grave estadual (Teste 006)', async () => {
    const user = TestUserFactory.create(6);
    const scenario = TestCaseFactory.createScenario('recurso-jari', 2, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
  });

  test('Cenário 3: Recurso JARI com pedido de efeito suspensivo Art. 285 §3º (Teste 007)', async () => {
    const user = TestUserFactory.create(7);
    const scenario = TestCaseFactory.createScenario('recurso-jari', 3, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
  });

  test('Cenário 4: Recurso JARI em autuação municipal com ausência de sinalização (Teste 008)', async () => {
    const user = TestUserFactory.create(8);
    const scenario = TestCaseFactory.createScenario('recurso-jari', 4, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
  });
});
