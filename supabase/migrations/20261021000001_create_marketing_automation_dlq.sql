-- Migration: create_marketing_automation_dlq
-- Created: 2026-10-21
-- Description: Dead Letter Queue da fila de automação de marketing.
-- Jobs que esgotam max_attempts (3) são movidos para cá com backoff
-- exponencial, timestamp de falha e motivo, permitindo recuperação/manual retry.

-- ============================================================
-- 1. Dead Letter Queue (DLQ) — marketing_automation_queue
-- ============================================================
CREATE TABLE IF NOT EXISTS public.marketing_automation_dlq (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_job_id  uuid NOT NULL,                 -- id original do job na fila (referência apenas; não há FK pois o job é deletado da fila)
  lead_campaign_id uuid NOT NULL REFERENCES public.marketing_lead_campaigns(id) ON DELETE CASCADE,
  action        text NOT NULL CHECK (action IN ('send_message','wait_response','update_status','finish')),
  scheduled_at  timestamptz,
  attempts      integer NOT NULL,
  max_attempts  integer NOT NULL,
  last_error    text,
  failure_reason text NOT NULL,
  failed_at     timestamptz NOT NULL DEFAULT now(),
  next_retry_at timestamptz,                   -- backoff exponencial; permite retry manual ou worker de recuperação
  created_at    timestamptz DEFAULT now()
);

-- ============================================================
-- 2. Índices
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_marketing_automation_dlq_failed_at ON public.marketing_automation_dlq(failed_at);
CREATE INDEX IF NOT EXISTS idx_marketing_automation_dlq_next_retry ON public.marketing_automation_dlq(next_retry_at);
CREATE INDEX IF NOT EXISTS idx_marketing_automation_dlq_lead_campaign ON public.marketing_automation_dlq(lead_campaign_id);

COMMENT ON TABLE public.marketing_automation_dlq IS 'Dead letter queue de jobs de automação de marketing que esgotaram max_attempts';
