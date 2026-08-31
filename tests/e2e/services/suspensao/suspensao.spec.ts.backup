import { test, expect } from '@playwright/test';
import { TestUserFactory } from '../../fixtures/user.factory';
import { TestCaseFactory } from '../../fixtures/case.factory';
import { executeDeterministicE2EVerification } from '../../helpers/documents';

test.describe('Suíte E2E: Defesa em Processo de Suspensão da CNH (PSDD)', () => {
  test('Cenário 1: PSDD por acúmulo de pontos com tese de EAR Art. 261 (Teste 013)', async () => {
    const user = TestUserFactory.create(13);
    const scenario = TestCaseFactory.createScenario('suspensao', 1, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
    expect(result.audit.crossContaminationDetected).toBe(false);
  });

  test('Cenário 2: PSDD decorrente de infração mandatória específica (Teste 014)', async () => {
    const user = TestUserFactory.create(14);
    const scenario = TestCaseFactory.createScenario('suspensao', 2, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
  });

  test('Cenário 3: PSDD com prescrição intercorrente trienal (Teste 015)', async () => {
    const user = TestUserFactory.create(15);
    const scenario = TestCaseFactory.createScenario('suspensao', 3, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
  });

  test('Cenário 4: PSDD com nulidade na notificação de instauração (Teste 016)', async () => {
    const user = TestUserFactory.create(16);
    const scenario = TestCaseFactory.createScenario('suspensao', 4, user);
    const result = executeDeterministicE2EVerification(scenario);
    expect(result.audit.integrityScorePercent).toBe(100);
  });
});
