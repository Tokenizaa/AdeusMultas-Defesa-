-- Migration: Create webhook_events table for durable payment webhook idempotency
-- Created: 2026-10-21
-- Purpose: Durable idempotency for payment webhooks (PagBank, VenoPag, GGPIXAPI).
-- Every incoming webhook event is durably accepted (inserted) before any side
-- effect is applied. Duplicate deliveries are detected by event_id and short-
-- circuited, surviving server restarts (unlike in-memory Sets).

CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT UNIQUE NOT NULL,           -- ID do evento no provedor original (pagbank.id, venopag request_number+status, etc.)
    provider TEXT NOT NULL,                   -- 'pagbank' | 'venopag' | 'ggpixapi'
    payload JSONB NOT NULL,                   -- Payload bruto recebido do webhook
    status TEXT NOT NULL DEFAULT 'received',  -- 'received' | 'processing' | 'processed' | 'failed'
    attempts INTEGER NOT NULL DEFAULT 0,      -- Número de tentativas de processamento
    processing_error TEXT,                    -- Mensagem de erro quando status = 'failed'
    processed_at TIMESTAMPTZ,                 -- Timestamp de conclusão do processamento
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON public.webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON public.webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider ON public.webhook_events(provider);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON public.webhook_events(created_at DESC);

-- RLS: deny all by default, enable policies below
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Policy: Admin full access
CREATE POLICY "webhook_events_admin_all" ON public.webhook_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.user_id = auth.uid()
              AND user_profiles.role = 'admin'::user_role
        )
    );

-- Policy: Service role can insert (webhook handlers write through service role)
CREATE POLICY "service_role_insert_webhook_events" ON public.webhook_events
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Policy: Service role can update (mark complete/failed)
CREATE POLICY "service_role_update_webhook_events" ON public.webhook_events
    FOR UPDATE USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON public.webhook_events TO service_role;
GRANT SELECT ON public.webhook_events TO authenticated;

-- Função RPC para claim atômico de evento pendente (worker concorrente).
-- Usa FOR UPDATE SKIP LOCKED para que múltiplas instâncias não claimem o mesmo evento.
CREATE OR REPLACE FUNCTION public.claim_webhook_event(p_max_attempts integer)
RETURNS TABLE (
    event_id text,
    provider text,
    payload jsonb,
    attempts integer
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    UPDATE public.webhook_events
    SET status = 'processing',
        attempts = attempts + 1
    WHERE event_id IN (
        SELECT event_id
        FROM public.webhook_events
        WHERE status = 'received'
          AND attempts < p_max_attempts
        ORDER BY created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
    )
    RETURNING event_id, provider, payload, attempts;
END;
$$;
