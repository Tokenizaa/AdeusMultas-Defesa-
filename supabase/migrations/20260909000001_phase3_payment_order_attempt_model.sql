BEGIN;

-- FASE 3 — PaymentOrder / PaymentAttempt
-- A PaymentOrder is the business payment intent for a case.
-- Each retry/reissue is a separate immutable-at-creation PaymentAttempt.

CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_order_id uuid NOT NULL REFERENCES public.payment_orders(id) ON DELETE CASCADE,
  case_id uuid NOT NULL,
  gateway text NOT NULL,
  gateway_environment text NOT NULL DEFAULT 'production',
  provider_order_id text,
  provider_transaction_id text,
  reference_id text,
  amount_in_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  commercial_offer_id uuid,
  status text NOT NULL DEFAULT 'pending',
  idempotency_key text NOT NULL,
  provider_event_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,

  CONSTRAINT payment_attempts_gateway_ck
    CHECK (gateway IN ('pagbank', 'ggpixapi', 'test')),
  CONSTRAINT payment_attempts_environment_ck
    CHECK (gateway_environment IN ('production', 'sandbox')),
  CONSTRAINT payment_attempts_amount_ck
    CHECK (amount_in_cents > 0),
  CONSTRAINT payment_attempts_currency_ck
    CHECK (currency = 'BRL'),
  CONSTRAINT payment_attempts_status_ck
    CHECK (status IN ('pending', 'waiting', 'authorized', 'paid', 'declined', 'canceled', 'refunded')),
  CONSTRAINT payment_attempts_idempotency_key_uq
    UNIQUE (idempotency_key),
  CONSTRAINT payment_attempts_provider_event_uq
    UNIQUE (gateway, provider_event_id)
);

-- Preserve every existing payment_order as one historical attempt.
-- Existing payment_orders predate the explicit environment field; they are
-- conservatively represented as production records because they were created
-- in the production payment domain. New writes must always provide the actual
-- gateway environment explicitly.
INSERT INTO public.payment_attempts (
  payment_order_id,
  case_id,
  gateway,
  gateway_environment,
  provider_order_id,
  provider_transaction_id,
  reference_id,
  amount_in_cents,
  currency,
  commercial_offer_id,
  status,
  idempotency_key,
  created_at,
  updated_at,
  paid_at
)
SELECT
  po.id,
  po.case_id,
  po.gateway,
  'production',
  po.pagbank_order_id,
  po.gateway_transaction_id,
  po.reference_id,
  round(po.final_amount * 100)::integer,
  po.currency,
  NULL,
  CASE lower(po.status)
    WHEN 'paid' THEN 'paid'
    WHEN 'waiting' THEN 'waiting'
    WHEN 'authorized' THEN 'authorized'
    WHEN 'declined' THEN 'declined'
    WHEN 'canceled' THEN 'canceled'
    WHEN 'refunded' THEN 'refunded'
    ELSE 'pending'
  END,
  'legacy-payment-order:' || po.id::text,
  po.created_at,
  po.updated_at,
  po.paid_at
FROM public.payment_orders po
WHERE NOT EXISTS (
  SELECT 1
  FROM public.payment_attempts pa
  WHERE pa.payment_order_id = po.id
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_payment_order_id
  ON public.payment_attempts(payment_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_case_id
  ON public.payment_attempts(case_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_gateway
  ON public.payment_attempts(gateway);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_status
  ON public.payment_attempts(status);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_provider_transaction
  ON public.payment_attempts(provider_transaction_id);

-- PaymentOrder identity is independent from case identity. A case may have
-- multiple orders over its lifecycle (reissue/retry/business recovery).
ALTER TABLE public.payment_orders
  ADD COLUMN IF NOT EXISTS currency_code text;
UPDATE public.payment_orders
SET currency_code = currency
WHERE currency_code IS NULL;
ALTER TABLE public.payment_orders
  ALTER COLUMN currency_code SET DEFAULT 'BRL';
ALTER TABLE public.payment_orders
  ALTER COLUMN currency_code SET NOT NULL;

ALTER TABLE public.payment_orders
  DROP CONSTRAINT IF EXISTS payment_orders_case_id_key;

-- Attempts are user-readable only through the owning case.
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_attempts_select_own ON public.payment_attempts;
CREATE POLICY payment_attempts_select_own
  ON public.payment_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.payment_orders po
      JOIN public.cases c ON c.id = po.case_id
      WHERE po.id = payment_attempts.payment_order_id
        AND c.user_id = (SELECT auth.uid())
    )
  );

-- Financial tables must not be exposed without RLS.
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

COMMIT;
