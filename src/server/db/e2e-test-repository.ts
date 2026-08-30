/**
 * @file e2e-test-repository.ts
 * Repositório para persistência das tabelas `e2e_test_runs` e `e2e_test_results`.
 * Suporta persistência permanente no Supabase PostgreSQL com fallback em memória.
 */

import { getSupabaseServerClient } from './supabase-server';
import { logger } from '../observability/logger';
import { E2ETestRun, E2EScenarioResult } from '../services/e2e-test-runner-service';

export interface E2ETestRunRow {
  id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  triggered_by: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  duration_ms: number;
  suites_summary: any;
  logs: any;
  artifacts: any;
  created_at?: string;
  updated_at?: string;
}

export interface E2ETestResultRow {
  id: string;
  run_id: string;
  service_key: string;
  scenario_id: string;
  scenario_name: string;
  user_name: string;
  user_email: string;
  status: string;
  watermark: string;
  integrity_score: number;
  cross_contamination: boolean;
  duration_ms: number;
  steps: any;
  assembled_doc_snippet: string | null;
  error_message: string | null;
  traceable_artifact_path: string | null;
  created_at?: string;
}

class E2ETestRepository {
  private inMemoryRuns: Map<string, E2ETestRun> = new Map();

  /**
   * Salva ou atualiza uma execução E2E completa no banco
   */
  async saveRun(run: E2ETestRun): Promise<void> {
    this.inMemoryRuns.set(run.id, run);

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return;
    }

    try {
      const runRow: E2ETestRunRow = {
        id: run.id,
        status: run.status,
        started_at: run.startedAt,
        completed_at: run.completedAt || null,
        triggered_by: run.triggeredBy,
        total_tests: run.totalTests,
        passed_tests: run.passedTests,
        failed_tests: run.failedTests,
        duration_ms: run.durationMs,
        suites_summary: run.suites,
        logs: run.logs,
        artifacts: run.suites.flatMap((s) =>
          s.scenarios.map((sc) => ({
            scenarioId: sc.scenarioId,
            serviceKey: sc.serviceKey,
            caseId: sc.caseId,
            watermark: sc.watermark,
            status: sc.status,
          }))
        ),
        updated_at: new Date().toISOString(),
      };

      const { error: runError } = await (supabase as any)
        .from('e2e_test_runs')
        .upsert(runRow);

      if (runError) {
        logger.warn('supabase', 'e2e_test_repository', 'saveRun', 'Aviso ao persistir e2e_test_runs no Supabase', {
          metadata: { error: runError.message, runId: run.id },
        });
      }

      // Salva resultados individuais por cenário
      for (const suite of run.suites) {
        for (const sc of suite.scenarios) {
          const resultRow: E2ETestResultRow = {
            id: `${run.id}_${sc.scenarioId}`,
            run_id: run.id,
            service_key: sc.serviceKey,
            scenario_id: sc.scenarioId,
            scenario_name: sc.scenarioName,
            user_name: sc.userName,
            user_email: sc.userEmail,
            status: sc.status,
            watermark: sc.watermark,
            integrity_score: sc.integrityScore,
            cross_contamination: false,
            duration_ms: sc.durationMs,
            steps: sc.steps,
            assembled_doc_snippet: sc.assembledDocumentSnippet || null,
            error_message: sc.errorMessage || null,
            traceable_artifact_path: `/artifacts/e2e/${run.id}/${sc.scenarioId}.json`,
          };

          const { error: resError } = await (supabase as any)
            .from('e2e_test_results')
            .upsert(resultRow);

          if (resError) {
            logger.warn('supabase', 'e2e_test_repository', 'saveResult', 'Aviso ao persistir e2e_test_results no Supabase', {
              metadata: { error: resError.message, scenarioId: sc.scenarioId },
            });
          }
        }
      }
    } catch (err: any) {
      logger.error('supabase', 'e2e_test_repository', 'saveRun', 'Falha ao gravar execução E2E no Supabase', {
        metadata: { runId: run.id, error: err?.message || String(err) },
      });
    }
  }

  /**
   * Busca todas as execuções ordenadas pela mais recente
   */
  async getAllRuns(): Promise<E2ETestRun[]> {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return Array.from(this.inMemoryRuns.values()).sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );
    }

    try {
      const { data, error } = await (supabase as any)
        .from('e2e_test_runs')
        .select('*')
        .order('started_at', { ascending: false });

      if (error || !data || data.length === 0) {
        return Array.from(this.inMemoryRuns.values()).sort(
          (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
        );
      }

      return data.map((row: any) => ({
        id: row.id,
        status: row.status,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        triggeredBy: row.triggered_by,
        selectedServices: (row.suites_summary || []).map((s: any) => s.serviceKey),
        totalTests: row.total_tests,
        passedTests: row.passed_tests,
        failedTests: row.failed_tests,
        durationMs: row.duration_ms,
        suites: row.suites_summary || [],
        createdUsers: [],
        createdCases: [],
        logs: row.logs || [],
      }));
    } catch (err: any) {
      logger.warn('supabase', 'e2e_test_repository', 'getAllRuns', 'Fallback para memória', {
        metadata: { error: err?.message || String(err) },
      });
      return Array.from(this.inMemoryRuns.values()).sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );
    }
  }

  /**
   * Busca detalhes de uma execução específica
   */
  async getRunById(id: string): Promise<E2ETestRun | null> {
    if (this.inMemoryRuns.has(id)) {
      return this.inMemoryRuns.get(id) || null;
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) return null;

    try {
      const { data, error } = await (supabase as any)
        .from('e2e_test_runs')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        status: data.status,
        startedAt: data.started_at,
        completedAt: data.completed_at,
        triggeredBy: data.triggered_by,
        selectedServices: (data.suites_summary || []).map((s: any) => s.serviceKey),
        totalTests: data.total_tests,
        passedTests: data.passed_tests,
        failedTests: data.failed_tests,
        durationMs: data.duration_ms,
        suites: data.suites_summary || [],
        createdUsers: [],
        createdCases: [],
        logs: data.logs || [],
      };
    } catch (err: any) {
      return null;
    }
  }
}

export const e2eTestRepository = new E2ETestRepository();
