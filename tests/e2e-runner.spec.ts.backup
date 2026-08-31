/**
 * E2E Test Runner - Main Orchestrator
 * Runs the complete E2E test suite for all test cases
 */

import { test, expect, Page, Browser, BrowserContext } from '@playwright/test';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { E2ETestManager, TestUser, TestCase, getE2ETestManager, TEST_RUN_ID, EVIDENCE_DIR } from './e2e-infrastructure';
import { executeOnboardingFlow, TestCaseData } from './e2e-onboarding-executor';
import { E2EValidator, ValidationResult } from './e2e-validator';
import { generateAllFixtures } from './e2e-fixtures';

// Global test manager
let testManager: E2ETestManager;
let validator: E2EValidator;
let browser: Browser;
let context: BrowserContext;
const allResults: (ValidationResult & { execution: any })[] = [];

test.describe.configure({ retries: 0 });

test.describe.serial('E2E National Test Suite', () => {
  test.beforeAll(async () => {
    console.log(`\n========== E2E TEST RUN: ${TEST_RUN_ID} ==========\n`);
    
    // Initialize test manager
    testManager = await getE2ETestManager();
    validator = new E2EValidator();
    
    // Launch browser
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext();
    
    // Generate document fixtures for all test cases
    const testCases = await testManager.getTestCases();
    for (const tc of testCases) {
      generateAllFixtures(tc);
    }
    
    console.log(`[${TEST_RUN_ID}] Test infrastructure ready. ${testCases.length} cases to test.\n`);
  });

  test.afterAll(async () => {
    await context.close();
    await browser.close();
    
    // Generate final report
    await generateFinalReport();
    
    console.log(`\n========== E2E TEST RUN COMPLETE: ${TEST_RUN_ID} ==========\n`);
  });

  // Run tests for each test case
  for (const testCase of (await testManager.getTestCases()).slice(0, 5)) { // Start with 5 for initial run
    test(`${testCase.serviceType} - ${testCase.scenario} (${testCase.procedureType})`, async () => {
      const page = await context.newPage();
      
      try {
        // Convert to TestCaseData format
        const user = (await testManager.getTestUsers()).find(u => u.id === testCase.userId)!;
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
        allResults.push(combinedResult);

        // Save intermediate evidence
        await testManager.saveEvidence(`case-${testCase.id}-result.json`, combinedResult);

        // Assert overall pass
        expect(combinedResult.overall).toBe('PASS');
        
        console.log(`[${TEST_RUN_ID}] Case ${testCase.id}: ${combinedResult.overall}`);
        
      } catch (error: any) {
        console.error(`[${TEST_RUN_ID}] Test failed for ${testCase.id}:`, error.message);
        allResults.push({
          caseId: testCase.id,
          overall: 'FAIL',
          analysis: { exists: false, procedureTypeCorrect: false, competentBodyCorrect: false, ufCorrect: false, tesesIdentified: [], score: 0, errors: [error.message] },
          document: { exists: false, templateCorrect: false, dataPreserved: false, fieldsValid: [], errors: [error.message] },
          protocol: { exists: false, portalUrlCorrect: false, physicalAddressCorrect: false, competentBodyCorrect: false, errors: [error.message] },
          contamination: { clean: false, otherCasesData: [], errors: [error.message] },
          execution: { errors: [error.message] },
        });
        throw error;
      } finally {
        await page.close();
      }
    });
  }

  // Cross-contamination test
  test('Cross-contamination check: SP -> RJ -> MG -> RS -> PR', async () => {
    const testCases = (await testManager.getTestCases())
      .filter(tc => ['SP', 'RJ', 'MG', 'RS', 'PR'].includes(extractUF(tc.applicant.addressCityState)))
      .slice(0, 5);

    const pages = await Promise.all(testCases.map(() => context.newPage()));
    
    try {
      // Execute all 5 cases in sequence
      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        const user = (await testManager.getTestUsers()).find(u => u.id === testCase.userId)!;
        
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

        await executeOnboardingFlow(pages[i], testCaseData);
      }

      // Validate contamination
      for (const testCase of testCases) {
        const validation = await validator.validateCase(testCase);
        expect(validation.contamination.clean).toBe(true);
      }
      
      console.log(`[${TEST_RUN_ID}] Cross-contamination check: PASS`);
      
    } finally {
      await Promise.all(pages.map(p => p.close()));
    }
  });
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