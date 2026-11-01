-- Migration: 20261101000001_create_e2e_audit_tables.sql
-- Descrição: Tabela de auditoria permanente para execuções E2E e resultados de análise jurídica.
-- Objetivo: Armazenar histórico de execuções, cenários e resultados do motor ExpertRuleEngine.
-- Este registro é a fonte de verdade para auditoria posterior, substituindo artefatos temporários do Playwright.
-- Segurança: operations additivas e idempotentes. Nenhum DROP/TRUNCATE/DELETE sobre dados de produção.

-- ============================================================
-- 1. Extensões
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 2. Tabelas de auditoria E2E
-- ============================================================

-- --------------------------------------------------------
-- e2e_test_runs
-- --------------------------------------------------------
-- Representa uma execução completa da suíte de testes.
-- Cada run_id é único e imutável após a conclusão.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.e2e_test_runs (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('QUEUED', 'RUNNING', 'PASSED', 'FAILED', 'PARTIAL')),
    triggered_by TEXT NOT NULL DEFAULT 'Playwright',
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    total_scenarios INTEGER NOT NULL DEFAULT 0,
    passed INTEGER NOT NULL DEFAULT 0,
    failed INTEGER NOT NULL DEFAULT 0,
    blocked INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    commit_sha TEXT NOT NULL,
    branch TEXT NOT NULL DEFAULT 'main',
    environment TEXT NOT NULL DEFAULT 'local-defesai',
    vitest_total INTEGER NOT NULL DEFAULT 0,
    vitest_passed INTEGER NOT NULL DEFAULT 0,
    playwright_total INTEGER NOT NULL DEFAULT 0,
    playwright_passed INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para busca por data e status
CREATE INDEX IF NOT EXISTS idx_e2e_test_runs_run_id ON public.e2e_test_runs(run_id);
CREATE INDEX IF NOT EXISTS idx_e2e_test_runs_started_at ON public.e2e_test_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_e2e_test_runs_status ON public.e2e_test_runs(status);

-- --------------------------------------------------------
-- e2e_test_results
-- --------------------------------------------------------
-- Representa cada cenário executado dentro de um run.
-- Cada linha captura o resultado individual com rastreabilidade.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.e2e_test_results (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES public.e2e_test_runs(id) ON DELETE CASCADE,
    canonical_scenario_id TEXT NOT NULL,
    service_type TEXT NOT NULL,
    scenario_number INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PASSED', 'FAILED', 'SKIPPED')),
    case_id UUID,
    analysis_id UUID,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    execution_duration_ms INTEGER NOT NULL DEFAULT 0,
    input_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_hash TEXT,
    error_message TEXT,
    evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para buscas no painel admin
CREATE INDEX IF NOT EXISTS idx_e2e_test_results_run_id ON public.e2e_test_results(run_id);
CREATE INDEX IF NOT EXISTS idx_e2e_test_results_canonical ON public.e2e_test_results(canonical_scenario_id);
CREATE INDEX IF NOT EXISTS idx_e2e_test_results_service ON public.e2e_test_results(service_type);
CREATE INDEX IF NOT EXISTS idx_e2e_test_results_status ON public.e2e_test_results(status);
CREATE INDEX IF NOT EXISTS idx_e2e_test_results_case_id ON public.e2e_test_results(case_id) WHERE case_id IS NOT NULL;

-- --------------------------------------------------------
-- e2e_analysis_audits
-- --------------------------------------------------------
-- Representa a análise efetivamente produzida pelo motor ExpertRuleEngine.
-- Captura o resultado real, não uma reconstrução posterior baseada na UI.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.e2e_analysis_audits (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES public.e2e_test_runs(id) ON DELETE CASCADE,
    scenario_id TEXT NOT NULL,
    case_id UUID NOT NULL,
    service_type TEXT NOT NULL,
    infraction_family TEXT,
    infraction_code TEXT,
    requested_service TEXT NOT NULL,
    engine_name TEXT NOT NULL DEFAULT 'ExpertRuleEngine',
    engine_version TEXT,
    analysis_status TEXT NOT NULL CHECK (analysis_status IN ('GENERATED', 'INCONCLUSIVE', 'INSUFFICIENT_DATA', 'TECHNICAL_FAILURE', 'NOT_EXECUTED')),
    recommended_procedure TEXT,
    summary_reasoning TEXT,
    evaluated_rules JSONB,
    detected_inconsistencies JSONB,
    data_gaps JSONB,
    analysis_json JSONB,
    input_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para buscas por análise
CREATE INDEX IF NOT EXISTS idx_e2e_analysis_audits_run_id ON public.e2e_analysis_audits(run_id);
CREATE INDEX IF NOT EXISTS idx_e2e_analysis_audits_scenario ON public.e2e_analysis_audits(scenario_id);
CREATE INDEX IF NOT EXISTS idx_e2e_analysis_audits_case ON public.e2e_analysis_audits(case_id);
CREATE INDEX IF NOT EXISTS idx_e2e_analysis_audits_procedure ON public.e2e_analysis_audits(recommended_procedure);
CREATE INDEX IF NOT EXISTS idx_e2e_analysis_audits_status ON public.e2e_analysis_audits(analysis_status);

-- ============================================================
-- 3. RLS (Row Level Security)
-- ============================================================

-- Políticas para e2e_test_runs
ALTER TABLE public.e2e_test_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY " admins can manage e2e_test_runs " ON public.e2e_test_runs
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Políticas para e2e_test_results
ALTER TABLE public.e2e_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY " admins can manage e2e_test_results " ON public.e2e_test_results
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Políticas para e2e_analysis_audits
ALTER TABLE public.e2e_analysis_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY " admins can manage e2e_analysis_audits " ON public.e2e_analysis_audits
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- ============================================================
-- 4. Comentário das tabelas
-- ============================================================
COMMENT ON TABLE public.e2e_test_runs IS 'Historico de execucoes completas da suite E2E. Cada run e imutavel e identificado por run_id.';
COMMENT ON TABLE public.e2e_test_results IS 'Resultados individuais por cenario dentro de uma execucao E2E. Referenciam run_id e case_id.';
COMMENT ON TABLE public.e2e_analysis_audits IS 'Auditoria da analise juridica produzida pelo motor ExpertRuleEngine. Fonte de vera para inscricao posterior.';

// ============================================================
-- 5. Fim da migration
-- ============================================================
