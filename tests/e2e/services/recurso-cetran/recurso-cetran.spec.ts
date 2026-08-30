import { test, expect } from '@playwright/test';
import { TestUserFactory } from '../../fixtures/user.factory';
import { TestCaseFactory } from '../../fixtures/case.factory';
import { executeDeterministicE2EVerification } from '../../helpers/documents';

test.describe('Suíte E2E: Recurso Final ao CETRAN (2ª Instância)', () => {
  test('Cenário 1: Recurso CETRAN contra decisão genérica da JARI (Teste 009)', async () => {
    const user = TestUserFactory.create(9);
    const scenario = TestCaseFactory.createScenario('recurso-cetran', 1, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
    expect(result.audit.crossContaminationDetected).toBe(false);
  });

  test('Cenário 2: Recurso CETRAN em infração autossuspensiva Art. 165 (Teste 010)', async () => {
    const user = TestUserFactory.create(10);
    const scenario = TestCaseFactory.createScenario('recurso-cetran', 2, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
  });

  test('Cenário 3: Recurso CETRAN por violação do Art. 11 Resolução 900 (Teste 011)', async () => {
    const user = TestUserFactory.create(11);
    const scenario = TestCaseFactory.createScenario('recurso-cetran', 3, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
  });

  test('Cenário 4: Recurso CETRAN estadual com divergência jurisprudencial (Teste 012)', async () => {
    const user = TestUserFactory.create(12);
    const scenario = TestCaseFactory.createScenario('recurso-cetran', 4, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
  });
});
