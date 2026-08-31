import { test, expect } from '@playwright/test';
import { TestUserFactory } from '../../fixtures/user.factory';
import { TestCaseFactory } from '../../fixtures/case.factory';
import { executeDeterministicE2EVerification } from '../../helpers/documents';

test.describe('Suíte E2E: Relatório Técnico Pericial de Engenharia e Radar', () => {
  test('Cenário 1: Laudo pericial metrológico com aferição vencida INMETRO (Teste 033)', async () => {
    const user = TestUserFactory.create(33);
    const scenario = TestCaseFactory.createScenario('relatorio-pericial', 1, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
    expect(result.audit.crossContaminationDetected).toBe(false);
  });

  test('Cenário 2: Perícia de distância de placa R-19 Resolução 798 (Teste 034)', async () => {
    const user = TestUserFactory.create(34);
    const scenario = TestCaseFactory.createScenario('relatorio-pericial', 2, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
  });

  test('Cenário 3: Laudo de semáforo eletrônico com tempo de amarelo irregular (Teste 035)', async () => {
    const user = TestUserFactory.create(35);
    const scenario = TestCaseFactory.createScenario('relatorio-pericial', 3, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
  });

  test('Cenário 4: Perícia em rodovia federal DNIT com múltiplos sensores (Teste 036)', async () => {
    const user = TestUserFactory.create(36);
    const scenario = TestCaseFactory.createScenario('relatorio-pericial', 4, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
  });
});
