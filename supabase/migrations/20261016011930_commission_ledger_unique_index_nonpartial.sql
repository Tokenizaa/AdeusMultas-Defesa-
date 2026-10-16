-- PostgreSQL can infer this full unique index for PostgREST upsert conflict targets.
DROP INDEX IF EXISTS public.uq_commission_ledger_payment_beneficiary_level;
CREATE UNIQUE INDEX uq_commission_ledger_payment_beneficiary_level
  ON public.commission_ledger (payment_id, beneficiary_id, level);
