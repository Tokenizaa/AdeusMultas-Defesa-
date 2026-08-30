-- Migration: deduplicate_campaigns
-- Created: 2026-08-29
-- Description: ADR-014 — Remove 6 duplicate "Campanha Inaugural" rows from marketing_campaigns.
--   Step 1: Clear FK references in editorial_content (FK has NO ACTION, not SET NULL).
--   Step 2: Delete the 6 duplicate campaigns.
--   Step 3: Add UNIQUE constraint on (name, lead_type) to prevent future duplicates.
--   Aditivo e idempotente.

-- Step 1: Clear FK references in editorial_content
-- The FK editorial_content_campaign_id_fkey has ON DELETE NO ACTION (confdeltype='n'),
-- so we MUST update before delete to avoid constraint violation.
UPDATE public.editorial_content
SET campaign_id = NULL
WHERE campaign_id IN (
  SELECT id FROM public.marketing_campaigns WHERE name = 'Campanha Inaugural — Adeus Multas'
);

-- Step 2: Delete the 6 duplicate campaigns
DELETE FROM public.marketing_campaigns
WHERE name = 'Campanha Inaugural — Adeus Multas';

-- Step 3: Add UNIQUE constraint on (name, lead_type) to prevent future duplicates
-- lead_type column exists in marketing_campaigns (CHECK: despachante | advogado_transito)
ALTER TABLE public.marketing_campaigns
ADD CONSTRAINT unique_campaign_per_lead_type UNIQUE (name, lead_type);