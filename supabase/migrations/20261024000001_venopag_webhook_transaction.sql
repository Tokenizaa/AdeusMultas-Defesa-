-- Migration: Atomic VenoPag webhook payment application
-- Created: 2026-10-24
-- Purpose: Wrap payment_orders, cases and commission_ledger updates in a single
-- server-side transaction. The Supabase JS client exposes no native transaction
-- API, so the webhook handler drives all three table mutations through one
-- plpgsql function (runs inside an implicit transaction).
--
-- State mapping (provider status -> our terminal state):
--   confirmed    -> PAID            (commission_ledger -> PAID)
--   chargedback  -> REFUNDED        (commission_ledger -> REVERSED)
--   refunded     -> REFUNDED        (commission_ledger -> REVERSED)
--   contested    -> DISPUTED        (commission_ledger unchanged: money held in dispute)
--   canceled     -> CANCELED
--   expired      -> CANCELED
--   pending      -> PENDING
--
-- Idempotent: every UPDATE guards on the current status so re-delivery of the
-- same webhook is a no-op once a terminal state is reached.

CREATE OR REPLACE FUNCTION public.apply_venopag_webhook(
    p_payment_id uuid,
    p_status text,
    p_paid_at timestamptz,
    p_reversal_reason text
) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
    v_case_id uuid;
    v_was_paid boolean;
BEGIN
    -- Capture case membership and prior paid state before mutating anything.
    SELECT case_id, (status = 'PAID' OR paid_at IS NOT NULL)
    INTO v_case_id, v_was_paid
    FROM public.payment_orders
    WHERE id = p_payment_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'payment_order_not_found', 'payment_id', p_payment_id);
    END IF;

    -- 1. payment_orders: terminal state transition (guarded, idempotent).
    IF p_status = 'confirmed' THEN
        UPDATE public.payment_orders
        SET status = 'PAID', paid_at = COALESCE(p_paid_at, now()), updated_at = now()
        WHERE id = p_payment_id AND status <> 'PAID';
    ELSIF p_status IN ('chargedback', 'refunded') THEN
        UPDATE public.payment_orders
        SET status = 'REFUNDED', paid_at = NULL, updated_at = now()
        WHERE id = p_payment_id;
    ELSIF p_status = 'contested' THEN
        UPDATE public.payment_orders
        SET status = 'DISPUTED', paid_at = NULL, updated_at = now()
        WHERE id = p_payment_id;
    ELSIF p_status IN ('canceled', 'expired') THEN
        UPDATE public.payment_orders
        SET status = 'CANCELED', paid_at = NULL, updated_at = now()
        WHERE id = p_payment_id;
    ELSIF p_status = 'pending' THEN
        UPDATE public.payment_orders
        SET status = 'PENDING', paid_at = NULL, updated_at = now()
        WHERE id = p_payment_id;
    END IF;

    -- 2. cases: reflect paid/unpaid only on a real transition.
    IF p_status = 'confirmed' AND NOT v_was_paid THEN
        UPDATE public.cases
        SET is_paid = true, paid_at = COALESCE(p_paid_at, now()), updated_at = now()
        WHERE id = v_case_id;
    ELSIF p_status IN ('chargedback', 'refunded', 'contested', 'canceled', 'expired') AND v_was_paid THEN
        UPDATE public.cases
        SET is_paid = false, paid_at = NULL, status = 'aguardando_pagamento', updated_at = now()
        WHERE id = v_case_id;
    END IF;

    -- 3. commission_ledger.
    IF p_status = 'confirmed' THEN
        UPDATE public.commission_ledger
        SET status = 'PAID', paid_at = COALESCE(p_paid_at, now())
        WHERE payment_id = p_payment_id AND status <> 'PAID';
    ELSIF p_status IN ('chargedback', 'refunded') THEN
        UPDATE public.commission_ledger
        SET status = 'REVERSED', reversed_at = now(), reversal_reason = p_reversal_reason
        WHERE payment_id = p_payment_id AND status = 'PAID';
    -- contested: funds stay in dispute; ledger remains PAID until chargedback/refunded.
    END IF;

    RETURN jsonb_build_object('ok', true, 'payment_id', p_payment_id, 'status', p_status, 'case_id', v_case_id);
END;
$$;

-- Allow the service role (used by webhook handlers) to execute the function.
GRANT EXECUTE ON FUNCTION public.apply_venopag_webhook(uuid, text, timestamptz, text) TO service_role;
