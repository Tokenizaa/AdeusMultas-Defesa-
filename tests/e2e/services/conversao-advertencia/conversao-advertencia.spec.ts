import { test, expect } from '@playwright/test';
import { TestUserFactory } from '../../fixtures/user.factory';
import { TestCaseFactory } from '../../fixtures/case.factory';
import { executeDeterministicE2EVerification } from '../../helpers/documents';

test.describe('Suíte E2E: Requerimento de Conversão em Advertência (Art. 267 CTB)', () => {
  test('Cenário 1: Conversão mandatória de multa leve (Teste 025)', async () => {
    const user = TestUserFactory.create(25);
    const scenario = TestCaseFactory.createScenario('conversao-advertencia', 1, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
    expect(result.audit.crossContaminationDetected).toBe(false);
  });

  test('Cenário 2: Conversão de multa média por estacionamento proibido (Teste 026)', async () => {
    const user = TestUserFactory.create(26);
    const scenario = TestCaseFactory.createScenario('conversao-advertencia', 2, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
  });

  test('Cenário 3: Conversão com prontuário negativo nos últimos 12 meses (Teste 027)', async () => {
    const user = TestUserFactory.create(27);
    const scenario = TestCaseFactory.createScenario('conversao-advertencia', 3, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
  });

  test('Cenário 4: Conversão em autuação estadual do DETRAN (Teste 028)', async () => {
    const user = TestUserFactory.create(28);
    const scenario = TestCaseFactory.createScenario('conversao-advertencia', 4, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
  });
});
