import { test, expect } from '@playwright/test';
import { E2ETestManager, TestUser, TestCase, getE2ETestManager, TEST_RUN_ID } from '../../e2e-infrastructure';
import { executeOnboardingFlow, TestCaseData } from '../../e2e-onboarding-executor';
import { E2EValidator, ValidationResult } from '../../e2e-validator';

test.describe('Suíte E2E: Relatório Técnico Pericial de Engenharia e Radar', () => {
  let testManager: E2ETestManager;
  let validator: E2EValidator;
  const testUsers: TestUser[] = [];
  const testCases: TestCase[] = [];

  test.beforeAll(async () => {
    // Initialize test manager
    testManager = await getE2ETestManager();
    validator = new E2EValidator();
    
    // Get all test users and cases for relatorio-pericial
    const allUsers = await testManager.getTestUsers();
    const allCases = await testManager.getTestCases();
    
    testUsers.push(...allUsers.filter(u => u.serviceType === 'relatorio_pericial'));
    testCases.push(...allCases.filter(c => c.serviceType === 'relatorio_pericial'));
    
    console.log(`[Relatório Pericial] Found ${testUsers.length} users and ${testCases.length} test cases`);
  });

  // Create a test for each user/case (at least 4 per service)
  for (const testCase of testCases.slice(0, Math.max(4, testCases.length))) {
    test(`${testCase.serviceType} - ${testCase.scenario} (${testCase.procedureType}) - User ${testCase.id.slice(0, 8)}`, async ({ page }) => {
      // Find the corresponding user
      const user = testUsers.find(u => u.id === testCase.userId);
      if (!user) {
        throw new Error(`User not found for case ${testCase.id}`);
      }

      // Convert to TestCaseData format
      const testCaseData: TestCaseData = {
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

      // Execute onboarding flow
      console.log(`[${TEST_RUN_ID}] Running onboarding for ${testCase.serviceType}-${testCase.scenario}...`);
      const executionResult = await executeOnboardingFlow(page, testCaseData);

      // Validate results against database
      console.log(`[${TEST_RUN_ID}] Validating results for ${testCase.serviceType}-${testCase.scenario}...`);
      const validationResult = await validator.validateCase(testCase);

      // Combine results
      const combinedResult = {
        ...validationResult,
        execution: executionResult,
      };

      // Save intermediate evidence
      await testManager.saveEvidence(`relatorio-pericial-${testCase.id}-result.json`, combinedResult);

      // Assert overall pass
      expect(combinedResult.overall).toBe('PASS');
      
      console.log(`[${TEST_RUN_ID}] Case ${testCase.id}: ${combinedResult.overall}`);
    });
  }
});
