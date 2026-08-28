-- Migration: 20260828000002_add_collection_run_id_to_marketing_leads
-- Created: 2026-08-28
-- Description: Associa leads a uma execução específica do scraper para exportação

ALTER TABLE public.marketing_leads
  ADD COLUMN IF NOT EXISTS collection_run_id uuid REFERENCES public.collection_runs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_marketing_leads_collection_run_id
  ON public.marketing_leads(collection_run_id);

COMMENT ON COLUMN public.marketing_leads.collection_run_id IS 'Referência à execução do scraper que gerou este lead';