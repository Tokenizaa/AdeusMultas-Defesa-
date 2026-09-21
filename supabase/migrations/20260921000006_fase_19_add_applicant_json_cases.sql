-- FASE 19 — Golden Path E2E
-- Aplica no canônico a coluna applicant_json de cases (migration 2026-09-08
-- versionada no repo mas não registrada no Supabase canônico — drift real
-- detectado durante o Golden Path: POST /api/cases falhava com
-- "Could not find the 'applicant_json' column of 'cases' in the schema cache").
-- Aditiva + idempotente (IF NOT EXISTS). Nada destrutivo.
alter table public.cases add column if not exists applicant_json jsonb;