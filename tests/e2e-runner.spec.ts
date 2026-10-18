/**
 * E2E Test Runner - Main Orchestrator
 * Runs the complete E2E test suite for all test cases
 */

import { test, expect, Page, Browser, BrowserContext } from '@playwright/test';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { E2ETestManager, TestUser, TestCase, getE2ETestManager, TEST_RUN_ID, EVIDENCE_DIR, COMMERCIAL_SERVICES } from './e2e-infrastructure';
import { executeOnboardingFlow, TestCaseData } from './e2e-onboarding-executor';
import { E2EValidator, ValidationResult } from './e2e-validator';
import { generateAllFixtures } from './e2e-fixtures';

// Global test manager
let testManager: E2ETestManager;
let validator: E2EValidator;
let browser: Browser;
let context: BrowserContext;
const allResults: (ValidationResult & { execution: any })[] = [];

// Require an explicit service selector. Playwright discovery must register
// tests from static configuration only; it must never create Supabase fixtures.
const selectedService = process.env.E2E_SERVICE;
if (!selectedService || !Object.prototype.hasOwnProperty.call(COMMERCIAL_SERVICES, selectedService)) {
  throw new Error(`E2E_SERVICE is required and must be one of: ${Object.keys(COMMERCIAL_SERVICES).join(', ')}`);
}
const scenarioDefinitions = COMMERCIAL_SERVICES[selectedService];

test.describe.configure({ retries: 0, mode: 'serial' });

test.describe(`E2E Production Certification — ${selectedService}`, () => {
  test.beforeAll(async () => {
    console.log(`\\n========== E2E TEST RUN: ${TEST_RUN_ID}; SERVICE: ${selectedService} ==========`);

    // Persistent fixtures are created only when the test starts, never during
    // --list discovery. E2ETestManager limits writes to E2E_SERVICE.
    testManager = await getE2ETestManager();
    validator = new E2EValidator();
    browser = await chromium.launch({ headless: process.env.E2E_HEADED !== '1' });
    context = await browser.newContext();

    const testCases = await testManager.getTestCases();
    const actualServices = [...new Set(testCases.map((tc) => tc.serviceType))];
    if (actualServices.length !== 1 || actualServices[0] !== selectedService) {
      throw new Error(`Fixture isolation failure: requested ${selectedService}; created ${actualServices.join(', ') || 'no cases'}`);
    }
    for (const tc of testCases) generateAllFixtures(tc);
    console.log(`[${TEST_RUN_ID}] Fixtures ready: ${testCases.length} scenarios for ${selectedService}`);
  });

  test.afterAll(async () => {
    if (context) await context.close();
    if (browser) await browser.close();
    if (testManager) {
      await generateFinalReport();
      const seededCases = await testManager.getTestCases();
      const additionalCases = allResults.flatMap((result) => {
        const seedCaseId = result.execution?.caseId ?? result.caseId;
        const seed = seededCases.find((candidate) => candidate.id === seedCaseId);
        const persistedId = result.execution?.persistedCaseId;
        if (!seed || typeof persistedId !== 'string' || persistedId === seed.id) return [];
        return [{
          id: persistedId,
          aitNumber: String(seed.infraction.aitNumber),
          userId: null,
          anonymous: true,
        }];
      });
      const cleanup = await testManager.cleanupOwnedFixtures(additionalCases);
      console.log(`[${TEST_RUN_ID}] Cleanup: ${cleanup.completed ? 'COMPLETE' : 'RESIDUE PENDING'}; evidence=cleanup-report.json`);
      if (!cleanup.completed) {
        throw new Error(`E2E cleanup incomplete for run ${TEST_RUN_ID}; inspect ${EVIDENCE_DIR}/cleanup-report.json before retrying.`);
      }
      console.log(`========== E2E TEST RUN COMPLETE: ${TEST_RUN_ID} ==========`);
    }
  });

  for (const definition of scenarioDefinitions) {
    test(`${definition.scenario} — ${definition.name}`, async () => {
      test.setTimeout(process.env.E2E_STOP_AT_QR === '1' ? 0 : 4 * 60_000);
      const testCases = await testManager.getTestCases();
      const testCase = testCases.find((tc) =>
        tc.serviceType === selectedService && tc.scenario === definition.scenario
      );
      expect(testCase, `fixture missing for ${selectedService}/${definition.scenario}`).toBeTruthy();
      if (!testCase) throw new Error(`Fixture missing for ${selectedService}/${definition.scenario}`);

      const user = (await testManager.getTestUsers()).find((candidate) => candidate.id === testCase.userId);
      expect(user, `isolated user missing for case ${testCase.id}`).toBeTruthy();
      if (!user) throw new Error(`Isolated user missing for case ${testCase.id}`);

      const page = await context.newPage();
      await context.clearCookies();
      try {
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

        const executionResult = await executeOnboardingFlow(page, testCaseData);
        const validationCase = executionResult.persistedCaseId
          ? { ...testCase, id: executionResult.persistedCaseId }
          : testCase;
        const validationResult = await validator.validateCase(validationCase);
        const combinedResult = { ...validationResult, execution: executionResult };
        allResults.push(combinedResult);
        await testManager.saveEvidence(`case-${testCase.id}-result.json`, combinedResult);
        expect(combinedResult.overall, JSON.stringify(combinedResult, null, 2)).toBe('PASS');
      } catch (error: any) {
        const message = error instanceof Error ? error.message : String(error);
        allResults.push({
          caseId: testCase.id,
          overall: 'FAIL',
          analysis: { exists: false, procedureTypeCorrect: false, competentBodyCorrect: false, ufCorrect: false, tesesIdentified: [], score: 0, errors: [message] },
          document: { exists: false, templateCorrect: false, dataPreserved: false, fieldsValid: [], errors: [message] },
          protocol: { exists: false, portalUrlCorrect: false, physicalAddressCorrect: false, competentBodyCorrect: false, errors: [message] },
          contamination: { clean: false, otherCasesData: [], errors: [message] },
          execution: { errors: [message] },
        });
        throw error;
      } finally {
        await page.close();
      }
    });
  }
});

async function generateFinalReport(): Promise<void> {
  const testCases = await testManager.getTestCases();
  const testUsers = await testManager.getTestUsers();
  
  const report = {
    testRunId: TEST_RUN_ID,
    timestamp: new Date().toISOString(),
    summary: {
      totalUsers: testUsers.length,
      totalCases: testCases.length,
      servicesTested: [...new Set(testCases.map(tc => tc.serviceType))],
      ufsTested: [...new Set(testCases.map(tc => extractUF(tc.applicant.addressCityState)))],
      autuadoresTested: [...new Set(testCases.map(tc => tc.infraction.autuadorBody))],
      passed: allResults.filter(r => r.overall === 'PASS').length,
      failed: allResults.filter(r => r.overall === 'FAIL').length,
    },
    results: allResults,
    users: testUsers.map(u => ({
      id: u.id,
      email: u.email,
      serviceType: u.serviceType,
      scenario: u.scenario,
      uf: extractUF(u.addressCityState),
    })),
    cases: testCases.map(tc => ({
      id: tc.id,
      userId: tc.userId,
      serviceType: tc.serviceType,
      scenario: tc.scenario,
      procedureType: tc.procedureType,
      uf: extractUF(tc.applicant.addressCityState),
      autuador: tc.infraction.autuadorBody,
      infractionCode: tc.infraction.infractionCode,
    })),
  };

  // Save JSON report
  await testManager.saveEvidence('execution-report.json', report);

  // Generate Markdown report
  const markdown = generateMarkdownReport(report);
  const markdownPath = path.join(EVIDENCE_DIR, 'execution-report.md');
  fs.writeFileSync(markdownPath, markdown);

  console.log(`\n========== FINAL REPORT ==========`);
  console.log(`Test Run: ${TEST_RUN_ID}`);
  console.log(`Total Users: ${report.summary.totalUsers}`);
  console.log(`Total Cases: ${report.summary.totalCases}`);
  console.log(`Services: ${report.summary.servicesTested.join(', ')}`);
  console.log(`UFs: ${report.summary.ufsTested.join(', ')}`);
  console.log(`Autuadores: ${report.summary.autuadoresTested.join(', ')}`);
  console.log(`Passed: ${report.summary.passed}`);
  console.log(`Failed: ${report.summary.failed}`);
  console.log(`Evidence Dir: ${EVIDENCE_DIR}`);
  console.log(`==================================\n`);
}

function generateMarkdownReport(report: any): string {
  let md = `# E2E Test Execution Report\n\n`;
  md += `**Test Run ID:** ${report.testRunId}\n`;
  md += `**Timestamp:** ${report.timestamp}\n\n`;
  
  md += `## Summary\n\n`;
  md += `| Metric | Value |\n|--------|-------|\n`;
  md += `| Total Users | ${report.summary.totalUsers} |\n`;
  md += `| Total Cases | ${report.summary.totalCases} |\n`;
  md += `| Services Tested | ${report.summary.servicesTested.join(', ')} |\n`;
  md += `| UFs Tested | ${report.summary.ufsTested.join(', ')} |\n`;
  md += `| Autuadores Tested | ${report.summary.autuadoresTested.join(', ')} |\n`;
  md += `| Passed | ${report.summary.passed} |\n`;
  md += `| Failed | ${report.summary.failed} |\n\n`;

  md += `## Results by Case\n\n`;
  md += `| Case ID | Service | Scenario | UF | Autuador | Infraction | Overall |\n`;
  md += `|---------|---------|----------|----|----------|------------|---------|\n`;
  
  for (const result of report.results) {
    const c = report.cases.find((c: any) => c.id === result.caseId);
    md += `| ${result.caseId.slice(0,8)} | ${c?.serviceType || '-'} | ${c?.scenario || '-'} | ${c?.uf || '-'} | ${c?.autuador || '-'} | ${c?.infractionCode || '-'} | ${result.overall} |\n`;
  }

  md += `\n## Detailed Validations\n\n`;
  
  for (const result of report.results) {
    md += `### Case ${result.caseId}\n\n`;
    md += `| Check | Status |\n|-------|--------|\n`;
    md += `| Analysis Exists | ${result.analysis.exists ? '✅' : '❌'} |\n`;
    md += `| Procedure Correct | ${result.analysis.procedureTypeCorrect ? '✅' : '❌'} |\n`;
    md += `| Competent Body Correct | ${result.analysis.competentBodyCorrect ? '✅' : '❌'} |\n`;
    md += `| UF Correct | ${result.analysis.ufCorrect ? '✅' : '❌'} |\n`;
    md += `| Document Exists | ${result.document.exists ? '✅' : '❌'} |\n`;
    md += `| Template Correct | ${result.document.templateCorrect ? '✅' : '❌'} |\n`;
    md += `| Data Preserved | ${result.document.dataPreserved ? '✅' : '❌'} |\n`;
    md += `| Protocol Exists | ${result.protocol.exists ? '✅' : '❌'} |\n`;
    md += `| Portal URL Correct | ${result.protocol.portalUrlCorrect ? '✅' : '❌'} |\n`;
    md += `| No Contamination | ${result.contamination.clean ? '✅' : '❌'} |\n`;
    md += `\n`;

    if (result.analysis.errors.length > 0) {
      md += `**Analysis Errors:**\n`;
      for (const e of result.analysis.errors) md += `- ${e}\n`;
      md += `\n`;
    }
    if (result.document.errors.length > 0) {
      md += `**Document Errors:**\n`;
      for (const e of result.document.errors) md += `- ${e}\n`;
      md += `\n`;
    }
    if (result.protocol.errors.length > 0) {
      md += `**Protocol Errors:**\n`;
      for (const e of result.protocol.errors) md += `- ${e}\n`;
      md += `\n`;
    }
    if (result.contamination.errors.length > 0) {
      md += `**Contamination Errors:**\n`;
      for (const e of result.contamination.errors) md += `- ${e}\n`;
      md += `\n`;
    }
  }

  return md;
}

function extractUF(cityState: string): string {
  if (cityState.includes('/')) {
    return cityState.split('/')[1].trim();
  }
  if (cityState.includes('-')) {
    const parts = cityState.split('-');
    if (parts.length === 2 && parts[1].trim().length === 2) {
      return parts[1].trim();
    }
  }
  return 'SP';
}

// Export for CLI execution
export { TEST_RUN_ID, EVIDENCE_DIR, allResults };
