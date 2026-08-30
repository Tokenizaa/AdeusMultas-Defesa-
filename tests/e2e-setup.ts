/**
 * E2E Test Setup Script
 * Run this to initialize the test infrastructure
 */

import { getE2ETestManager, TEST_RUN_ID, EVIDENCE_DIR } from './e2e-infrastructure';
import { generateAllFixtures } from './e2e-fixtures';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log(`\n========== E2E SETUP: ${TEST_RUN_ID} ==========\n`);
  
  try {
    // Initialize test manager
    const testManager = await getE2ETestManager();
    
    // Generate document fixtures for all test cases
    const testCases = await testManager.getTestCases();
    console.log(`Generating fixtures for ${testCases.length} test cases...`);
    
    for (const tc of testCases) {
      generateAllFixtures(tc);
    }
    
    console.log(`\n========== SETUP COMPLETE ==========`);
    console.log(`Test Run ID: ${TEST_RUN_ID}`);
    console.log(`Evidence Dir: ${EVIDENCE_DIR}`);
    console.log(`Users Created: ${(await testManager.getTestUsers()).length}`);
    console.log(`Cases Created: ${testCases.length}`);
    console.log(`Fixtures Generated: ${testCases.length} sets`);
    console.log(`\nNext step: Run Playwright E2E tests`);
    console.log(`npx playwright test tests/e2e-runner.spec.ts\n`);
    
  } catch (error: any) {
    console.error('Setup failed:', error.message);
    process.exit(1);
  }
}

main();