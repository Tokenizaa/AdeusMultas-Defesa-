-- Migration: 20260828000003_add_queued_to_collection_runs
-- Description: Add 'queued' status to collection_runs for async job queue pattern

ALTER TABLE public.collection_runs
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Expand status CHECK to include 'queued' (job enqueued, waiting for worker)
ALTER TABLE public.collection_runs
  DROP CONSTRAINT IF EXISTS collection_runs_status_check,
  ADD CONSTRAINT collection_runs_status_check
  CHECK (status IN ('queued','running','completed','partial','error','cancelled'));

COMMENT ON COLUMN public.collection_runs.updated_at IS 'Última atualização de progresso (heartbeat para detectar jobs órfãos)';
