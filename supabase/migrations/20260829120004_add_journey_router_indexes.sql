-- Migration: add_journey_router_indexes
-- Created: 2026-08-29
-- Description: ADR-013 — Composite index for WhatsApp Journey Router query.
--   Router queries: marketing_leads WHERE phone_normalized = X AND audience = 'B2B'
--   Existing: unique partial index on phone_normalized only.
--   New: composite index on (phone_normalized, audience) for exact router query pattern.
--   CONCURRENTLY to avoid locking. Aditivo e idempotente.

-- Composite index for router query: phone_normalized + audience
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketing_leads_phone_audience
ON public.marketing_leads (phone_normalized, audience)
WHERE phone_normalized IS NOT NULL;