import { test, expect } from '@playwright/test';
import { getE2ETestManager, TEST_RUN_ID, TestCase, TestUser } from '../../../e2e-infrastructure';
import { executeOnboardingFlow, TestCaseData } from '../../../e2e-onboarding-executor';
import { E2EValidator } from '../../../e2e-validator';

test.describe('E2E por serviço: Recurso Ordinário à JARI', () => {
  test('executa os 10 cenários do serviço reutilizando contas compartilhadas', async ({ browser }) => {
    const manager = await getE2ETestManager();
    const validator = new E2EValidator();
    const allUsers = await manager.getTestUsers();
    const cases = (await manager.getTestCases())
      .filter((item: TestCase) => item.serviceType === 'recurso_jari')
      .sort((a: TestCase, b: TestCase) => a.scenario.localeCompare(b.scenario, 'pt-BR'));

    expect(cases, 'A infraestrutura deve preparar os cenários do serviço').toHaveLength(10);
    const results: Array<{ scenario: string; execution: unknown; validation: unknown; status: string }> = [];

    for (const testCase of cases) {
      const user = allUsers.find((candidate: TestUser) => candidate.id === testCase.userId);
      expect(user, `Usuário compartilhado não encontrado para cenário ${testCase.scenario}`).toBeTruthy();
      if (!user) continue;

      const data: TestCaseData = {
        id: testCase.id,
        userId: testCase.userId,
        email: user.email,
        password: user.password,
        serviceType: testCase.serviceType,
        scenario: testCase.scenario,
        procedureType: testCase.procedureType,
        infraction: testCase.infraction,
        vehicle: testCase.vehicle,
        applicant: testCase.applicant,
        testRunId: TEST_RUN_ID,
      };

      const page = await browser.newPage();
      let execution: unknown;
      let validation: unknown;
      let status = 'PASS';
      try {
        execution = await executeOnboardingFlow(page, data);
        const validationResult = await validator.validateCase(testCase);
        validation = validationResult;
        const executionResult = execution as { onboarding?: string; analysis?: string; document?: string; errors?: string[] };
        status = validationResult.overall === 'PASS' &&
          executionResult.onboarding === 'PASS' &&
          executionResult.analysis === 'PASS' &&
          executionResult.document === 'PASS' &&
          (executionResult.errors?.length ?? 0) === 0
          ? 'PASS'
          : 'FAIL';
        await manager.saveEvidence(`recurso-jari-${testCase.scenario}-${testCase.id}-result.json`, {
          serviceType: 'recurso_jari',
          scenario: testCase.scenario,
          testRunId: TEST_RUN_ID,
          execution,
          validation,
          status,
        });
        expect.soft(status, `Falha no cenário ${testCase.scenario} do serviço recurso_jari`).toBe('PASS');
      } catch (error) {
        status = 'FAIL';
        await manager.saveEvidence(`recurso-jari-${testCase.scenario}-${testCase.id}-error.json`, {
          serviceType: 'recurso_jari',
          scenario: testCase.scenario,
          testRunId: TEST_RUN_ID,
          status,
          error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error),
        });
        expect.soft(error, `Erro de execução no cenário ${testCase.scenario} do serviço recurso_jari`).toBeUndefined();
      } finally {
        await page.close();
      }
      results.push({ scenario: testCase.scenario, execution, validation, status });
    }

    await manager.saveEvidence('recurso-jari-summary.json', {
      serviceType: 'recurso_jari',
      testRunId: TEST_RUN_ID,
      total: results.length,
      passed: results.filter((item) => item.status === 'PASS').length,
      failed: results.filter((item) => item.status !== 'PASS').length,
      results,
    });
    expect(results, 'Todos os dez cenários devem ser executados').toHaveLength(10);
  });
});
