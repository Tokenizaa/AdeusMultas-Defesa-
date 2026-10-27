-- Audit trail for coupon-funded access. This is deliberately separate from payment_orders:
-- a free entitlement is not represented as a successful bank payment.
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
CREATE POLICY coupon_redemptions_select_own ON public.coupon_redemptions
  FOR SELECT USING (user_id = auth.uid());
GRANT SELECT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;
