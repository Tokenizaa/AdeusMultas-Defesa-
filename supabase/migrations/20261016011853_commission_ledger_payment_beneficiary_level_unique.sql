-- Ensure split commission creation is idempotent per payment, beneficiary, and referral level.
CREATE UNIQUE INDEX IF NOT EXISTS uq_commission_ledger_payment_beneficiary_level
  ON public.commission_ledger (payment_id, beneficiary_id, level)
  WHERE payment_id IS NOT NULL;
