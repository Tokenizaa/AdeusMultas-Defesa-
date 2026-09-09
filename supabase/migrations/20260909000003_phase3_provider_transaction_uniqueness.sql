BEGIN;

-- A provider transaction identifies one payment attempt per gateway.
-- Enforce that invariant durably while allowing NULL before the provider
-- returns its transaction identity.
CREATE UNIQUE INDEX IF NOT EXISTS payment_attempts_gateway_provider_transaction_uidx
  ON public.payment_attempts (gateway, provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;

COMMIT;
