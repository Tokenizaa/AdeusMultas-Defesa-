-- Migration: 20260828000001_add_collection_runs_and_scraped_for
-- Created: 2026-08-28
-- Description: Histórico de execuções do scraper e campo scraped_for em marketing_leads

-- scraped_for: identifica a coleta que gerou este lead (query/cidade/estado/fonte)
ALTER TABLE public.marketing_leads
  ADD COLUMN IF NOT EXISTS scraped_for jsonb;

COMMENT ON COLUMN public.marketing_leads.scraped_for IS 'Identificador da coleta: {query, city, state, source, collected_at}';

-- Histórico de execuções do scraper
CREATE TABLE IF NOT EXISTS public.collection_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','partial','error','cancelled')),
  queries jsonb NOT NULL DEFAULT '[]'::jsonb,
  cities jsonb NOT NULL DEFAULT '[]'::jsonb,
  states jsonb NOT NULL DEFAULT '[]'::jsonb,
  limit_per_query integer NOT NULL DEFAULT 10,
  results_found integer NOT NULL DEFAULT 0,
  new_leads integer NOT NULL DEFAULT 0,
  duplicates integer NOT NULL DEFAULT 0,
  rejected integer NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  queries_executed jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_collection_runs_status ON public.collection_runs(status);
CREATE INDEX IF NOT EXISTS idx_collection_runs_started_at ON public.collection_runs(started_at DESC);

COMMENT ON TABLE public.collection_runs IS 'Histórico de execuções do scraper de prospecção B2B';