/**
 * @file document-audit-db.ts
 * Supabase persistence layer for document audit results.
 * Mirrors the schema of e2e_test_runs / e2e_test_results
 * but adds document-quality specific fields.
 *
 * Uses the same getSupabaseServerClient() as e2e-test-repository.ts.
 */

import { getSupabaseServerClient } from '@/server/db/supabase-server';
import { logger } from '@/server/observability/logger';
import type {
  AuditCaseData,
  AuditResultRow,
  AuditRunRow,
  DocumentQualityResult,
  AuditTestRun,
  AuditMatrixSummary,
} from './document-audit.types';

// ─── Run persistence ─────────────────────────────────────────────────────────

export async function saveAuditRun(run: AuditTestRun): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    logger.warn('doc-audit', 'audit-db', 'saveRun', 'Supabase unavailable — run not persisted');
    return;
  }

  const row: AuditRunRow = {
    id: run.runId,
    status: run.failedCases === 0 ? 'PASSED' : run.passedCases === 0 ? 'FAILED' : 'PARTIAL',
    started_at: run.startedAt,
    completed_at: run.completedAt,
    triggered_by: 'doc-audit',
    total_tests: run.totalCases,
    passed_tests: run.passedCases,
    failed_tests: run.failedCases,
    duration_ms: run.durationMs,
    matrix_summary: run.matrixSummary,
    artifacts: [],
  };

  const { error } = await (supabase as any)
    .from('e2e_test_runs')
    .upsert(row);

  if (error) {
    logger.warn('doc-audit', 'audit-db', 'saveRun', 'Failed to persist audit run', {
      runId: run.runId,
      error: error.message,
    });
  } else {
    logger.info('doc-audit', 'audit-db', 'saveRun', `Audit run ${run.runId} persisted`, {
      total: run.totalCases,
      passed: run.passedCases,
      failed: run.failedCases,
    });
  }
}

// ─── Result persistence ────────────────────────────────────────────────────────

export async function saveAuditResult(
  runId: string,
  caseData: AuditCaseData,
  qualityResult: DocumentQualityResult,
  durationMs: number,
  tracePath?: string
): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    logger.warn('doc-audit', 'audit-db', 'saveResult', 'Supabase unavailable — result not persisted');
    return;
  }

  const resultId = `${runId}_${caseData.auditId}`;
  const p0Failures = qualityResult.failures.filter((f) => f.severity === 'P0');

  const row: AuditResultRow = {
    id: resultId,
    run_id: runId,
    procedure_type: caseData.procedureType,
    category: caseData.category,
    scenario_name: caseData.scenarioName,
    audit_id: caseData.auditId,
    watermark: caseData.runWatermark,
    status: qualityResult.passed ? 'PASSED' : 'FAILED',
    integrity_score: qualityResult.scores.overall,
    cross_contamination: qualityResult.scores.crossContamination < 100,
    duration_ms: durationMs,
    quality_scores: qualityResult.scores,
    failures: qualityResult.failures,
    knowledge_gaps: qualityResult.knowledgeGaps,
    document_hash: qualityResult.documentHash,
    doc_snippet: qualityResult.docSnippet,
    traceable_artifact_path: tracePath ?? `/artifacts/doc-audit/${runId}/${caseData.auditId}.json`,
    created_at: new Date().toISOString(),
  };

  const { error } = await (supabase as any)
    .from('e2e_test_results')
    .upsert(row);

  if (error) {
    logger.warn('doc-audit', 'audit-db', 'saveResult', 'Failed to persist audit result', {
      resultId,
      auditId: caseData.auditId,
      error: error.message,
    });
  } else {
    logger.info('doc-audit', 'audit-db', 'saveResult', `${caseData.auditId} → ${qualityResult.passed ? 'PASS' : 'FAIL'}`, {
      overall: qualityResult.scores.overall,
      p0Fails: p0Failures.length,
    });
  }
}

// ─── Batch summary ────────────────────────────────────────────────────────────

export function buildMatrixSummary(
  results: Array<{ caseData: AuditCaseData; quality: DocumentQualityResult }>
): AuditMatrixSummary[] {
  const map = new Map<string, {
    procedureType: string;
    category: string;
    cases: number;
    passed: number;
    failed: number;
    scoreSum: number;
  }>();

  for (const { caseData, quality } of results) {
    const key = `${caseData.procedureType}::${caseData.category}`;
    if (!map.has(key)) {
      map.set(key, {
        procedureType: caseData.procedureType,
        category: caseData.category,
        cases: 0,
        passed: 0,
        failed: 0,
        scoreSum: 0,
      });
    }
    const entry = map.get(key)!;
    entry.cases++;
    entry.scoreSum += quality.scores.overall;
    if (quality.passed) entry.passed++;
    else entry.failed++;
  }

  return Array.from(map.values()).map((e) => ({
    procedureType: e.procedureType as any,
    category: e.category,
    cases: e.cases,
    passed: e.passed,
    failed: e.failed,
    avgScore: Math.round(e.scoreSum / e.cases),
  }));
}

// ─── Load previous results ────────────────────────────────────────────────────

export async function loadPreviousResults(
  runId: string
): Promise<AuditResultRow[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  try {
    const { data, error } = await (supabase as any)
      .from('e2e_test_results')
      .select('*')
      .like('id', `${runId}_%`);

    if (error || !data) return [];
    return data as AuditResultRow[];
  } catch {
    return [];
  }
}
