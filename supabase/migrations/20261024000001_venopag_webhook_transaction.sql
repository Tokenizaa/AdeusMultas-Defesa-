-- Migration: Atomic VenoPag webhook payment application
-- Created: 2026-10-24
-- Purpose: Apply payment_orders, cases and commission_ledger updates atomically.

CREATE OR REPLACE FUNCTION public.apply_venopag_webhook(
    p_payment_id uuid,
    p_status text,
    p_paid_at timestamptz,
    p_reversal_reason text
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_case_id uuid;
    v_was_paid boolean;
BEGIN
    IF p_status IS NULL OR p_status NOT IN (
        'confirmed', 'chargedback', 'refunded', 'contested',
        'canceled', 'expired', 'pending'
    ) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unsupported_status', 'status', p_status);
    END IF;

    SELECT case_id, (status = 'PAID' OR paid_at IS NOT NULL)
    INTO v_case_id, v_was_paid
    FROM public.payment_orders
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'payment_order_not_found', 'payment_id', p_payment_id);
    END IF;

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

    IF p_status = 'confirmed' AND NOT v_was_paid THEN
        UPDATE public.cases
        SET is_paid = true, paid_at = COALESCE(p_paid_at, now()), updated_at = now()
        WHERE id = v_case_id;
    ELSIF p_status IN ('chargedback', 'refunded', 'contested', 'canceled', 'expired') AND v_was_paid THEN
        UPDATE public.cases
        SET is_paid = false, paid_at = NULL, status = 'aguardando_pagamento', updated_at = now()
        WHERE id = v_case_id;
    END IF;

    IF p_status = 'confirmed' THEN
        UPDATE public.commission_ledger
        SET status = 'PAID', paid_at = COALESCE(p_paid_at, now())
        WHERE payment_id = p_payment_id AND status <> 'PAID';
    ELSIF p_status IN ('chargedback', 'refunded') THEN
        UPDATE public.commission_ledger
        SET status = 'REVERSED', reversed_at = now(), reversal_reason = p_reversal_reason
        WHERE payment_id = p_payment_id AND status = 'PAID';
    END IF;

    RETURN jsonb_build_object('ok', true, 'payment_id', p_payment_id, 'status', p_status, 'case_id', v_case_id);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_venopag_webhook(uuid, text, timestamptz, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_venopag_webhook(uuid, text, timestamptz, text) TO service_role;
