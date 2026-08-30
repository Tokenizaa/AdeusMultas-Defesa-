-- Migration: 20260830000001_create_e2e_test_tables.sql
-- Descrição: Criação das tabelas de auditoria e persistência de execuções de testes E2E Playwright

CREATE TABLE IF NOT EXISTS public.e2e_test_runs (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL CHECK (status IN ('QUEUED', 'RUNNING', 'PASSED', 'FAILED', 'PARTIAL')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    triggered_by TEXT NOT NULL DEFAULT 'Admin UI',
    total_tests INTEGER NOT NULL DEFAULT 0,
    passed_tests INTEGER NOT NULL DEFAULT 0,
    failed_tests INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    suites_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
    logs JSONB NOT NULL DEFAULT '[]'::jsonb,
    artifacts JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.e2e_test_results (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES public.e2e_test_runs(id) ON DELETE CASCADE,
    service_key TEXT NOT NULL,
    scenario_id TEXT NOT NULL,
    scenario_name TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PASSED', 'FAILED')),
    watermark TEXT NOT NULL,
    integrity_score INTEGER NOT NULL DEFAULT 100,
    cross_contamination BOOLEAN NOT NULL DEFAULT false,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    assembled_doc_snippet TEXT,
    error_message TEXT,
    traceable_artifact_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para buscas rápidas no painel admin
CREATE INDEX IF NOT EXISTS idx_e2e_test_runs_started_at ON public.e2e_test_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_e2e_test_results_run_id ON public.e2e_test_results(run_id);
CREATE INDEX IF NOT EXISTS idx_e2e_test_results_service_key ON public.e2e_test_results(service_key);
CREATE INDEX IF NOT EXISTS idx_e2e_test_results_user_email ON public.e2e_test_results(user_email);

-- RLS
ALTER TABLE public.e2e_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e2e_test_results ENABLE ROW LEVEL SECURITY;

-- Policies para admin e service_role
CREATE POLICY "Admins can view e2e_test_runs" ON public.e2e_test_runs
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' = 'admin@defesai.com.br');

CREATE POLICY "Admins can view e2e_test_results" ON public.e2e_test_results
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' = 'admin@defesai.com.br');
