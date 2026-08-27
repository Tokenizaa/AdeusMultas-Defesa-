import { runMetaIntegrationTests } from './src/integrations/meta/tests/meta-integration-suite';

async function main() {
  const report = await runMetaIntegrationTests();
  console.log('\n=== META INTEGRATION TEST SUITE ===');
  console.log(`Total: ${report.totalTests} | Passed: ${report.passedCount} | Failed: ${report.failedCount}`);
  for (const r of report.results) {
    const icon = r.passed ? '✅' : '❌';
    console.log(`  ${icon} [${r.id}] ${r.name} (${r.durationMs}ms)${r.error ? ` — ${r.error}` : ''}`);
  }
  console.log(`\nOverall: ${report.allPassed ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);
  process.exit(report.allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error('Test suite error:', err);
  process.exit(1);
});
