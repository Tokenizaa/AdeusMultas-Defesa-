// Golden Document Quality Test - FASE 19
// Tests substantive quality of analysis and defense documents

import { InfractionData, CaseAnalysis, DefenseDraft } from '../src/types';
import { RagPipeline } from '../src/core/rag/rag-pipeline';
import { ExpertRuleEngine } from '../src/core/rules/rule-engine';
import { DocumentAssemblyEngine } from '../src/core/documents/document-assembly-engine';
import { ALL_GOLDEN_DOCUMENTS as testCases, type GoldenDocumentTestCase } from '../tests/fixtures/golden-documents';

// Utility functions for evaluation
function calculateSimilarity(str1: string, str2: string): number {
  // Simple similarity - in real implementation would use better algorithm
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1.0;
  return (longer.length - (longer.indexOf(shorter) === -1 ? longer.length : longer.length - shorter.length)) / longer.length;
}

function containsIgnoreCase(str: string, substr: string): boolean {
  return str.toLowerCase().includes(substr.toLowerCase());
}

// Evaluate a single test case
async function evaluateTestCase(testCase: GoldenDocumentTestCase): Promise<GoldenDocumentTestCase> {
  console.log(`Evaluating ${testCase.id}: ${testCase.name}`);
  
  try {
    // Generate analysis
    const analysis: CaseAnalysis = RagPipeline.analyzeInfraction(
      testCase.id, // caseId
      testCase.infraction
    );
    testCase.actualAnalysis = analysis;
    
    // Debug: Log analysis results
    console.log(`  Analysis for ${testCase.id}:`);
    console.log(`    Detected inconsistencies: ${analysis.detectedInconsistencies.length}`);
    console.log(`    Recommended arguments: ${analysis.recommendedArguments.length}`);
    console.log(`    Selected arguments: ${analysis.selectedArguments?.length || 0}`);
    if (analysis.summaryReasoning) {
      console.log(`    Summary reasoning: ${analysis.summaryReasoning.substring(0, 100)}...`);
    }
    
    // Output detailed argument info for first test case
    if (testCase.id === 'GD-01') {
      console.log(`    Recommended arguments details:`);
      analysis.recommendedArguments.forEach((arg, index) => {
        console.log(`      [${index}] ${arg.id}: ${arg.title}`);
      });
      console.log(`    Selected argument IDs:`, analysis.selectedArguments);
      
      // Write detailed arguments to file
      const fs = await import('fs');
      let argsContent = 'RECOMMENDED ARGUMENTS:\n\n';
      analysis.recommendedArguments.forEach((arg, index) => {
        argsContent += `[${index}] ${arg.id}: ${arg.title}\n`;
        argsContent += `  Code: ${arg.code}\n`;
        argsContent += `  Category: ${arg.category}\n`;
        argsContent += `  Legal Base: ${arg.legalBase}\n`;
        argsContent += `  Summary: ${arg.summary}\n\n`;
      });
      argsContent += `\nSELECTED ARGUMENT IDS: ${JSON.stringify(analysis.selectedArguments)}\n`;
      await fs.promises.writeFile('./debug/args_detail_gd01.txt', argsContent);
      console.log(`    Detailed arguments written to ./debug/args_detail_gd01.txt`);
    }
    
    // Generate defense
    const defense: DefenseDraft = RagPipeline.generateDefenseDraft(
      testCase.id, // caseId
      testCase.infraction,
      'ABC1234', // vehiclePlate - default for testing
      'FIAT/UNO', // vehicleModel - default for testing
      {
        name: 'TEST DRIVER',
        cpf: '123.456.789-00',
        rg: '12.345.678-9',
        cnh: '12345678901',
        category: 'A',
        address: 'TEST ADDRESS, 123',
        cityState: 'São Paulo - SP'
      },
      [], // selectedArguments - let system choose
      'recurso_jari'
    );
    testCase.actualDefense = defense;
    
    // Debug: Log defense results
    console.log(`  Defense for ${testCase.id}:`);
    console.log(`    Facts narrative length: ${defense.factsNarrative?.length || 0}`);
    console.log(`    Full draft length: ${defense.fullDraftText?.length || 0}`);
    console.log(`    Selected argument IDs: ${defense.selectedArgumentIds?.length || 0}`);
    console.log(`    Preliminary arguments length: ${defense.preliminaryArgumentsText?.length || 0}`);
    console.log(`    Merit arguments length: ${defense.meritArgumentsText?.length || 0}`);
    if (defense.factsNarrative) {
      console.log(`    Facts narrative preview: ${defense.factsNarrative.substring(0, 100)}...`);
    }
    if (defense.fullDraftText) {
      console.log(`    Full draft preview: ${defense.fullDraftText.substring(0, 200)}...`);
      // Check for specific expected facts in the full draft
      const expectedFactsCheck = testCase.expectedFacts.map(fact => ({
        fact,
        found: defense.fullDraftText?.toLowerCase().includes(fact.toLowerCase()) || false
      }));
      console.log(`    Expected facts check:`, expectedFactsCheck);
      
      // For first test case, output full text to file for inspection
      if (testCase.id === 'GD-01') {
        const fs = await import('fs');
        await fs.promises.writeFile('./debug/full_draft_gd01.txt', defense.fullDraftText || '');
        console.log(`    Full draft written to ./debug/full_draft_gd01.txt`);
      }
    }
    
    // Output arguments for debugging
    if (testCase.id === 'GD-01') {
      console.log(`    Preliminary arguments preview: ${defense.preliminaryArgumentsText?.substring(0, 200)}...`);
      console.log(`    Merit arguments preview: ${defense.meritArgumentsText?.substring(0, 200)}...`);
      
      // Write arguments to files for detailed inspection
      const fs = await import('fs');
      if (defense.preliminaryArgumentsText) {
        await fs.promises.writeFile('./debug/prelim_args_gd01.txt', defense.preliminaryArgumentsText);
        console.log(`    Preliminary arguments written to ./debug/prelim_args_gd01.txt`);
      }
      if (defense.meritArgumentsText) {
        await fs.promises.writeFile('./debug/merit_args_gd01.txt', defense.meritArgumentsText);
        console.log(`    Merit arguments written to ./debug/merit_args_gd01.txt`);
      }
    }
    
    // Initialize evaluation scores
    testCase.evaluation = {
      fidelityFactual: 0,
      problemIdentification: 0,
      thesisQuality: 0,
      legalGrounding: 0,
      personalization: 0,
      coherence: 0,
      docStructure: 0,
      consistency: 0,
      noHallucination: 0,
      utility: 0
    };
    
    // Evaluate fidelity to facts
    const fullText = (analysis.summaryReasoning || '') + ' ' + 
                     (defense.factsNarrative || '') + ' ' + 
                     (defense.fullDraftText || '');
    
    let factsScore = 0;
    if (testCase.expectedFacts.length > 0) {
      for (const fact of testCase.expectedFacts) {
        const found = containsIgnoreCase(fullText, fact);
        if (found) {
          factsScore++;
        } else {
          // Debug: show what we're looking for vs what we found
          if (testCase.id === 'GD-01') {
            console.log(`      DEBUG: Fact "${fact}" not found in fullText`);
            console.log(`        FullText excerpt: ${fullText.substring(0, 200)}...`);
          }
        }
      }
      testCase.evaluation.fidelityFactual = Math.min(5, Math.round((factsScore / testCase.expectedFacts.length) * 5));
    } else {
      testCase.evaluation.fidelityFactual = 5; // If no expected facts, assume perfect fidelity
    }
    
    // Evaluate problem identification
    const issuesText = analysis.detectedInconsistencies.map(i => i.title + ' ' + i.description).join(' ') +
                      analysis.dataGaps?.map(g => g.ruleId + ' ' + g.reason).join(' ') || '';
    let issuesScore = 0;
    if (testCase.expectedIssues.length > 0) {
      for (const issue of testCase.expectedIssues) {
        if (containsIgnoreCase(issuesText, issue)) {
          issuesScore++;
        }
      }
      testCase.evaluation.problemIdentification = Math.min(5, Math.round((issuesScore / testCase.expectedIssues.length) * 5));
    } else {
      testCase.evaluation.problemIdentification = 5; // If no expected issues, assume perfect identification
    }
    
    // Evaluate thesis quality
    const argsText = analysis.recommendedArguments.map(a => a.title + ' ' + a.summary).join(' ') +
                    analysis.selectedArguments?.map(id => {
                      const arg = analysis.recommendedArguments.find(a => a.id === id);
                      return arg ? arg.title + ' ' + arg.summary : '';
                    }).join(' ') || '';
    let thesisScore = 0;
    if (testCase.expectedArguments.length > 0) {
      for (const argId of testCase.expectedArguments) {
        const foundArg = analysis.recommendedArguments.find(a => a.id === argId);
        if (foundArg) {
          // Check if it's actually recommended (not just detected)
          const isSelected = analysis.selectedArguments?.includes(argId) || false;
          thesisScore += isSelected ? 2 : 1; // partial credit for identifying, full for recommending
        }
      }
      // Normalize to 0-5 scale
      testCase.evaluation.thesisQuality = Math.min(5, Math.round((thesisScore / (testCase.expectedArguments.length * 2)) * 5));
    } else {
      testCase.evaluation.thesisQuality = 5; // If no expected arguments, assume perfect thesis
    }
    
    // Evaluate legal grounding (check for real article/resolution references)
    const legalText = defense.fullDraftText || '';
    let legalScore = 0;
    // Check for common CTB/article patterns
    if (containsIgnoreCase(legalText, 'art. 218') || containsIgnoreCase(legalText, 'art. 90') ||
        containsIgnoreCase(legalText, 'art. 306') || containsIgnoreCase(legalText, 'art. 252') ||
        containsIgnoreCase(legalText, 'art. 167') || containsIgnoreCase(legalText, 'art. 208')) {
      legalScore += 2;
    }
    if (containsIgnoreCase(legalText, 'resolução contran') || containsIgnoreCase(legalText, 'res. contran')) {
      legalScore += 2;
    }
    if (containsIgnoreCase(legalText, 'inmetro') || containsIgnoreCase(legalText, 'calibração')) {
      legalScore += 2;
    }
    testCase.evaluation.legalGrounding = Math.min(5, legalScore);
    
    // Evaluate personalization (mentions specific details from case)
    let persoScore = 0;
    const specificData = [
      testCase.infraction.aitNumber,
      testCase.infraction.location,
      testCase.infraction.dateTime?.slice(0,10),
      testCase.infraction.speedLimit?.toString(),
      testCase.infraction.measuredSpeed?.toString(),
      testCase.infraction.consideredSpeed?.toString()
    ].filter(Boolean);
    
    if (specificData.length > 0) {
      for (const data of specificData) {
        if (data && containsIgnoreCase(defense.factsNarrative || '', data)) {
          persoScore++;
        }
      }
      testCase.evaluation.personalization = Math.min(5, Math.round((persoScore / specificData.length) * 5));
    } else {
      testCase.evaluation.personalization = 5; // If no specific data, assume perfect personalization
    }
    
    // Evaluate coherence (internal consistency)
    let cohScore = 3; // start neutral
    // Check if analysis and defense mention same facts
    const analysisFacts = analysis.summaryReasoning || '';
    const defenseFacts = defense.factsNarrative || '';
    const commonFacts = testCase.expectedFacts.filter(fact => 
      containsIgnoreCase(analysisFacts, fact) && 
      containsIgnoreCase(defenseFacts, fact)
    ).length;
    if (testCase.expectedFacts.length > 0) {
      cohScore += Math.round((commonFacts / testCase.expectedFacts.length) * 2);
    }
    // Check for blatant contradictions
    const contradictionPairs = [
      ['was speeding', 'was stopped'],
      ['exceeded limit', 'was within limit'],
      ['calibration expired', 'calibration valid']
    ];
    let contradictionPenalty = 0;
    for (const [pos, neg] of contradictionPairs) {
      const hasPos = containsIgnoreCase(fullText, pos);
      const hasNeg = containsIgnoreCase(fullText, neg);
      if (hasPos && hasNeg) {
        contradictionPenalty++;
      }
    }
    cohScore = Math.max(0, cohScore - contradictionPenalty);
    testCase.evaluation.coherence = Math.min(5, cohScore);
    
    // Evaluate document structure
    let structScore = 3; // neutral
    const draft = defense.fullDraftText || '';
    if (draft.length > 100) structScore += 1; // reasonable length
    if (draft.includes('Excelentíssimo Senhor')) structScore += 1; // proper addressing
    if (draft.includes('Senhor')) structScore += 1; // has addressing
    if (draft.includes('dou entrada ao presente') || draft.includes('nos termos do art. 5º')) {
      structScore += 1; // proper legal phrasing
    }
    if (draft.includes('Juntos, dou presença') || draft.includes('Protesto')) {
      structScore += 1; // proper closing
    }
    testCase.evaluation.docStructure = Math.min(5, structScore);
    
    // Evaluate consistency between analysis and defense
    let consScore = 3; // neutral
    const analysisArgs = new Set(analysis.selectedArguments || []);
    const defenseArgs = new Set(defense.selectedArgumentIds || []);
    const commonArgs = new Set([...analysisArgs].filter(x => defenseArgs.has(x))).size;
    const totalArgs = new Set([...analysisArgs, ...defenseArgs]).size;
    if (totalArgs > 0) {
      consScore += Math.round((commonArgs / totalArgs) * 2);
    }
    // Check if facts mentioned in analysis appear in defense
    const analysisFactCount = testCase.expectedFacts.filter(fact => 
      containsIgnoreCase(analysis.summaryReasoning || '', fact)
    ).length;
    const defenseFactCount = testCase.expectedFacts.filter(fact => 
      containsIgnoreCase(defense.factsNarrative || '', fact)
    ).length;
    if (testCase.expectedFacts.length > 0) {
      const factConsistency = Math.min(analysisFactCount, defenseFactCount) / testCase.expectedFacts.length;
      consScore += Math.round(factConsistency * 2);
    }
    testCase.evaluation.consistency = Math.min(5, consScore);
    
    // Evaluate no hallucination (check for invented claims)
    let halluScore = 5; // start perfect, deduct for issues
    const forbiddenFound = testCase.forbiddenClaims.filter(claim => 
      containsIgnoreCase(fullText, claim)
    ).length;
    halluScore -= Math.min(5, forbiddenFound); // each forbidden claim reduces score
    
    // Check for obviously fake articles/resolutions
    const fakePatterns = [
      'art. 999', 'art. 1234', 'res. contran 9999',
      'lei 99999', 'decreto 999999'
    ];
    let fakeCount = 0;
    for (const pattern of fakePatterns) {
      if (containsIgnoreCase(fullText, pattern)) {
        fakeCount++;
      }
    }
    halluScore -= Math.min(3, fakeCount);
    testCase.evaluation.noHallucination = Math.max(0, halluScore);
    
    // Evaluate utility (would this be useful to driver?)
    let utilScore = 3; // neutral
    // Points for identifying actionable issues
    if (testCase.evaluation.problemIdentification >= 3) utilScore += 1;
    // Points for suggesting specific defense
    if (testCase.evaluation.thesisQuality >= 3) utilScore += 1;
    // Points for being specific to case
    if (testCase.evaluation.personalization >= 3) utilScore += 1;
    // Points for not being completely generic/gibberish
    if (defense.fullDraftText?.length > 50) utilScore += 1;
    testCase.evaluation.utility = Math.min(5, utilScore);
    
    // Check for critical failures
    let critical = false;
    let criticalReason = '';
    
    // Critical: invented law
    const inventedLawPatterns = [
      /art\.\s*\d{4,}/, // art. with 4+ digits
      /resolução\s+contran\s+\d{4,}/,
      /lei\s+nº\s+\d{5,}/
    ];
    for (const pattern of inventedLawPatterns) {
      if (pattern.test(fullText)) {
        critical = true;
        criticalReason = 'Invented legal reference';
        break;
      }
    }
    
    // Critical: false facts contradicted by input
    const falseFactPatterns = [
      { pattern: /vehicle\s+was\s+stopped/i, contradicts: testCase.infraction.measuredSpeed !== undefined },
      { pattern: /speed\s+was\s+within\s+limit/i, contradicts: 
        testCase.infraction.measuredSpeed !== undefined && 
        testCase.infraction.speedLimit !== undefined &&
        testCase.infraction.measuredSpeed! > testCase.infraction.speedLimit!
      },
      { pattern: /driver\s+was\s+not\s+driving/i, contradicts: 
        testCase.infraction.measuredSpeed !== undefined ||
        testCase.infraction.yellowPhaseCrossing === true ||
        testCase.infraction.emergencyPassage === true
      }
    ];
    for (const {pattern, contradicts} of falseFactPatterns) {
      if (contradicts && pattern.test(fullText)) {
        critical = true;
        criticalReason = 'False fact contradicted by evidence';
        break;
      }
    }
    
    if (critical) {
      testCase.criticalFailure = criticalReason;
      testCase.verdict = 'FAIL';
    } else {
      // Calculate overall score
      const scores = Object.values(testCase.evaluation!);
      const avgScore = scores.reduce((sum, val) => sum + val, 0) / scores.length;
      testCase.verdict = avgScore >= 3.5 ? 'PASS' : 'FAIL'; // 70% threshold
    }
    }
    
   catch (error) {
    console.error(`Error evaluating ${testCase.id}:`, error);
    testCase.criticalFailure = `Execution error: ${error.message}`;
    testCase.verdict = 'FAIL';
    testCase.evaluation = {
      fidelityFactual: 0,
      problemIdentification: 0,
      thesisQuality: 0,
      legalGrounding: 0,
      personalization: 0,
      coherence: 0,
      docStructure: 0,
      consistency: 0,
      noHallucination: 0,
      utility: 0
    };
  }
  
  return testCase;
}

// Main execution
async function runGoldenDocumentTests() {
  console.log('Starting Golden Document Quality Test Suite...');
  console.log('=====================================');
  
  const results: GoldenDocumentTestCase[] = [];
  
  for (const testCase of testCases) {
    const result = await evaluateTestCase(testCase);
    results.push(result);
    
    // Brief progress
    console.log(`  ${result.id}: ${result.verdict} (Score: ${Object.values(result.evaluation!).reduce((a,b)=>a+b,0)/10}/10)`);
    if (result.criticalFailure) {
      console.log(`    ⚠️  CRITICAL: ${result.criticalFailure}`);
    }
    console.log();
  }
  
  // Generate summary
  const passed = results.filter(t => t.verdict === 'PASS').length;
  const failed = results.length - passed;
  const criticalFailures = results.filter(t => t.criticalFailure !== undefined).length;
  
  console.log('=====================================');
  console.log('SUMMARY');
  console.log(`Total cases: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Critical failures: ${criticalFailures}`);
  console.log();
  
  // Detailed results
  console.log('DETAILED RESULTS:');
  console.log('-----------------');
  for (const result of results) {
    const score = Object.values(result.evaluation!).reduce((a,b)=>a+b,0);
    console.log(`${result.id} - ${result.name}: ${result.verdict} (${score}/100)`);
    if (result.criticalFailure) {
      console.log(`  ⚠️  CRITICAL FAILURE: ${result.criticalFailure}`);
    }
    // Show weak areas (<3)
    const weakAreas = Object.entries(result.evaluation!)
      .filter(([_, val]) => val < 3)
      .map(([key, val]) => `${key}: ${val}/5`);
    if (weakAreas.length > 0) {
      console.log(`  Weak areas: ${weakAreas.join(', ')}`);
    }
    console.log();
  }
  
  // Generate report
  await generateReport(results);
  
  return results;
}

// Generate markdown report
async function generateReport(results: GoldenDocumentTestCase[]) {
  const report = [];
  report.push('# FASE 19 - GOLDEN DOCUMENT QUALITY TEST');
  report.push('**Date**: ' + new Date().toISOString().split('T')[0]);
  report.push('');
  report.push('## Executive Summary');
  const passed = results.filter(t => t.verdict === 'PASS').length;
  report.push(`- **Total Cases**: ${results.length}`);
  report.push(`- **Passed**: ${passed}`);
  report.push(`- **Failed**: ${results.length - passed}`);
  report.push(`- **Critical Failures**: ${results.filter(t => t.criticalFailure).length}`);
  report.push('');
  
  report.push('## Evaluation Criteria');
  report.push('Each dimension scored 0-5:');
  report.push('- **Fidelity Factual**: Adherence to provided facts');
  report.push('- **Problem Identification**: Correct issue detection');
  report.push('- **Thesis Quality**: Relevance and strength of legal arguments');
  report.push('- **Legal Grounding**: Accuracy of legal citations');
  report.push('- **Personalization**: Case-specific details in output');
  report.push('- **Coherence**: Internal consistency of analysis');
  report.push('- **Document Structure**: Proper legal document format');
  report.push('- **Consistency**: Alignment between analysis and defense');
  report.push('- **No Hallucination**: Absence of invented facts/law');
  report.push('- **Utility**: Practical usefulness to driver');
  report.push('');
  
  report.push('## Case Results');
  report.push('| Case | Name | Verdict | Score/100 | Critical Failure |');
  report.push('|------|------|---------|-----------|------------------|');
  for (const result of results) {
    const score = Object.values(result.evaluation!).reduce((a,b)=>a+b,0);
    report.push(`| ${result.id} | ${result.name} | ${result.verdict} | ${score} | ${result.criticalFailure || '-'} |`);
  }
  report.push('');
  
  report.push('## Detailed Analysis');
  for (const result of results) {
    report.push(`### ${result.id} - ${result.name}`);
    report.push(`**Verdict**: ${result.verdict}`);
    if (result.criticalFailure) {
      report.push(`**Critical Failure**: ${result.criticalFailure}`);
    }
    report.push('');
    report.push('| Dimension | Score/5 | Notes |');
    report.push('|-----------|---------|-------|');
    const evalObj = result.evaluation!;
    const dimensions = [
      ['fidelityFactual', 'Fidelity Factual'],
      ['problemIdentification', 'Problem Identification'],
      ['thesisQuality', 'Thesis Quality'],
      ['legalGrounding', 'Legal Grounding'],
      ['personalization', 'Personalization'],
      ['coherence', 'Coherence'],
      ['docStructure', 'Document Structure'],
      ['consistency', 'Consistency Analysis→Defense'],
      ['noHallucination', 'No Hallucination'],
      ['utility', 'Utility']
    ];
    for (const [key, label] of dimensions) {
      const score = evalObj[key];
      report.push(`| ${label} | ${score}/5 | |`);
    }
    report.push('');
    
    // Show expected vs actual for key points
    report.push('**Expected Facts**:');
    for (const fact of result.expectedFacts) {
      report.push(`- ${fact}`);
    }
    report.push('');
    report.push('**Expected Issues**:');
    for (const issue of result.expectedIssues) {
      report.push(`- ${issue}`);
    }
    report.push('');
    report.push('**Expected Arguments**:');
    for (const argId of result.expectedArguments) {
      const arg = result.actualAnalysis?.recommendedArguments.find(a => a.id === argId);
      report.push(`- ${argId}: ${arg?.title || 'Unknown'} ${arg ? `(recommended: ${arg.selectedArguments?.includes(argId) ? 'yes' : 'no'})` : ''}`);
    }
    report.push('');
    
    // Extract sample of generated text
    if (result.actualDefense?.factsNarrative) {
      report.push('**Sample Facts Narrative');
      report.push(`> ${result.actualDefense.factsNarrative.substring(0, 200)}...`);
      report.push('');
    }
    if (result.actualDefense?.fullDraftText) {
      report.push('**Sample Defense Text**:');
      report.push(`> ${result.actualDefense.fullDraftText.substring(0, 300)}...`);
      report.push('');
    }
    report.push('');
  }
  
  report.push('## Conclusion');
  const passRate = passed / results.length;
  if (passRate >= 0.8) {
    report.push('The system demonstrates **good substantive quality** in analysis and defense generation.');
    report.push('Most cases are handled correctly with legally sound arguments.');
  } else if (passRate >= 0.6) {
    report.push('The system shows **moderate quality** with room for improvement.');
    report.push('Some cases lack sufficient legal grounding or personalization.');
  } else {
    report.push('The system shows **poor substantive quality** requiring significant improvements.');
    report.push('Frequent hallucinations, weak arguments, or factual errors observed.');
  }
  report.push('');
  report.push('**Recommendation**: Focus on improving legal argument selection and factual consistency.');
  
  // Write report
  const fs = await import('fs');
  const reportPath = './docs/recovery/FASE-19-GOLDEN-DOCUMENT-QUALITY-2026-09-21.md';
  await fs.promises.mkdir('./docs/recovery', { recursive: true });
  await fs.promises.writeFile(reportPath, report.join('\n'));
  console.log(`Report written to ${reportPath}`);
}

// Run the tests
runGoldenDocumentTests().then(results => {
  console.log('Golden Document Test Suite completed.');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error in test suite:', err);
  process.exit(1);
});