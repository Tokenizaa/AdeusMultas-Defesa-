BEGIN;

-- Phase 3 enabled RLS on legacy financial tables. Restore the minimum
-- authenticated read paths required by the application while keeping all
-- financial writes server-authoritative.

DROP POLICY IF EXISTS payments_select_own ON public.payments;
CREATE POLICY payments_select_own
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.cases c
      WHERE c.id = payments.case_id
        AND c.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS orders_select_own ON public.orders;
CREATE POLICY orders_select_own
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

COMMIT;
