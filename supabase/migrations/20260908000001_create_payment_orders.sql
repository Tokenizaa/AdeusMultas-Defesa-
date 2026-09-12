-- Migration: Create payment_orders table
-- Created: 2026-09-08
-- Purpose: Store payment order records for PIX/credit card reconciliation and KPIs

CREATE TABLE IF NOT EXISTS public.payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    gateway TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    base_amount NUMERIC(12,2),
    final_amount NUMERIC(12,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BRL',
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_type TEXT,
    bonus_used_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_method TEXT,
    gateway_transaction_id TEXT,
    pagbank_order_id TEXT,
    reference_id TEXT,
    qr_code_text TEXT,
    qr_code_url TEXT,
    qr_code_data_url TEXT,
    coupon_code TEXT,
    expires_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON public.payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON public.payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_gateway ON public.payment_orders(gateway);
CREATE INDEX IF NOT EXISTS idx_payment_orders_created_at ON public.payment_orders(created_at DESC);

-- RLS: deny all by default, enable policies below
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own payment orders (via case ownership)
CREATE POLICY "payment_orders_select_own" ON public.payment_orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.cases c
            WHERE c.id = payment_orders.case_id
            AND c.user_id = auth.uid()
        )
    );

-- Policy: Service role can do everything (backend write-through)
-- No policy needed - service role bypasses RLS

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_payment_orders_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trigger_update_payment_orders_updated_at ON public.payment_orders;
CREATE TRIGGER trigger_update_payment_orders_updated_at
    BEFORE UPDATE ON public.payment_orders
    FOR EACH ROW EXECUTE FUNCTION public.update_payment_orders_updated_at();

-- Foreign key to payment_events (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_events') THEN
        ALTER TABLE public.payment_events
        ADD CONSTRAINT payment_events_payment_id_fkey
        FOREIGN KEY (payment_id) REFERENCES public.payment_orders(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.payment_orders TO authenticated;
GRANT ALL ON public.payment_orders TO service_role;