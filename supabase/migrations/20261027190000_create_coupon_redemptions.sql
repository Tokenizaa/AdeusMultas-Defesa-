-- Audit trail for coupon-funded access; not a payment ledger.
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_code text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id uuid NOT NULL UNIQUE REFERENCES public.cases(id) ON DELETE CASCADE,
  service_type text NOT NULL,
  base_amount numeric(12,2) NOT NULL CHECK (base_amount >= 0),
  discount_amount numeric(12,2) NOT NULL CHECK (discount_amount >= 0),
  final_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (final_amount = 0),
  status text NOT NULL DEFAULT 'REDEEMED' CHECK (status IN ('REDEEMED', 'REVOKED')),
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_code ON public.coupon_redemptions(coupon_code);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user_code ON public.coupon_redemptions(user_id, coupon_code);
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS coupon_redemptions_select_own ON public.coupon_redemptions;
CREATE POLICY coupon_redemptions_select_own ON public.coupon_redemptions FOR SELECT USING (user_id = auth.uid());
GRANT SELECT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;

-- Consume coupon, record entitlement, and unlock the case in one transaction.
CREATE OR REPLACE FUNCTION public.redeem_free_coupon(
  p_case_id uuid,
  p_user_id uuid,
  p_coupon_code text,
  p_service_type text,
  p_base_amount numeric,
  p_pre_coupon_amount numeric,
  p_coupon_discount numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  c public.coupons%ROWTYPE;
  v_now timestamptz := now();
  v_usage jsonb;
  v_order_id uuid;
  v_redemption_id uuid;
  v_case_updated uuid;
BEGIN
  SELECT * INTO c FROM public.coupons WHERE code = upper(trim(p_coupon_code)) FOR UPDATE;
  IF NOT FOUND OR c.is_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Cupom inválido ou desativado' USING ERRCODE = 'P0001';
  END IF;
  IF (c.valid_from IS NOT NULL AND c.valid_from > v_now) OR (c.valid_until IS NOT NULL AND c.valid_until < v_now) THEN
    RAISE EXCEPTION 'Cupom fora da validade' USING ERRCODE = 'P0001';
  END IF;
  IF cardinality(coalesce(c.applicable_services, ARRAY[]::text[])) > 0
     AND NOT (c.applicable_services @> ARRAY['all']::text[] OR c.applicable_services @> ARRAY[p_service_type]::text[]) THEN
    RAISE EXCEPTION 'Cupom não aplicável a este serviço' USING ERRCODE = 'P0001';
  END IF;
  IF p_base_amount < coalesce(c.min_order_value, 0) THEN
    RAISE EXCEPTION 'Valor mínimo do cupom não atingido' USING ERRCODE = 'P0001';
  END IF;
  IF coalesce(c.used_count, 0) >= coalesce(c.total_limit, 2147483647) THEN
    RAISE EXCEPTION 'Limite total de resgates atingido' USING ERRCODE = 'P0001';
  END IF;
  IF (SELECT count(*) FROM public.coupon_redemptions r WHERE r.coupon_code = upper(trim(p_coupon_code)) AND r.user_id = p_user_id AND r.status = 'REDEEMED') >= coalesce(c.user_limit, 2147483647) THEN
    RAISE EXCEPTION 'Limite de uso por usuário atingido' USING ERRCODE = 'P0001';
  END IF;
  IF p_pre_coupon_amount < 0 OR p_coupon_discount < p_pre_coupon_amount OR p_pre_coupon_amount - p_coupon_discount <> 0 THEN
    RAISE EXCEPTION 'O cupom não cobre 100%% do valor final' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.cases SET is_paid = true, updated_at = v_now
    WHERE id = p_case_id AND user_id = p_user_id AND is_paid = false
    RETURNING id INTO v_case_updated;
  IF v_case_updated IS NULL THEN
    RAISE EXCEPTION 'Caso inexistente, já liberado ou sem titularidade' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.coupon_redemptions
    (coupon_code, user_id, case_id, service_type, base_amount, discount_amount, final_amount, status, redeemed_at)
  VALUES
    (upper(trim(p_coupon_code)), p_user_id, p_case_id, p_service_type, p_base_amount, p_base_amount, 0, 'REDEEMED', v_now)
  RETURNING id INTO v_redemption_id;

  INSERT INTO public.payment_orders
    (case_id, user_id, gateway, amount, base_amount, final_amount, currency, discount_amount,
     discount_type, bonus_used_amount, status, payment_method, coupon_code, reference_id, paid_at, created_at, updated_at)
  VALUES
    (p_case_id, p_user_id, 'coupon', 0, p_base_amount, 0, 'BRL', p_base_amount,
     'coupon', 0, 'COMPED', 'coupon', upper(trim(p_coupon_code)), 'coupon_' || v_redemption_id::text, NULL, v_now, v_now)
  RETURNING id INTO v_order_id;

  v_usage := coalesce(c.usage_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
    'userId', p_user_id, 'caseId', p_case_id, 'serviceType', p_service_type, 'usedAt', v_now
  ));
  UPDATE public.coupons SET used_count = coalesce(used_count, 0) + 1, usage_history = v_usage, updated_at = v_now
    WHERE id = c.id;

  RETURN jsonb_build_object('success', true, 'entitlement', 'FREE_COUPON', 'caseId', p_case_id,
    'couponCode', upper(trim(p_coupon_code)), 'amount', 0, 'orderId', v_order_id, 'redemptionId', v_redemption_id);
END;
$$;
REVOKE ALL ON FUNCTION public.redeem_free_coupon(uuid, uuid, text, text, numeric, numeric, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_free_coupon(uuid, uuid, text, text, numeric, numeric, numeric) TO service_role;
