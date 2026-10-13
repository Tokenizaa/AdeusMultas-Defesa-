-- Fase final de certificação: correções aditivas/defensivas após backup remoto.
-- Aplicar somente após validar o dump e executar a suíte de autorização.

-- As tabelas abaixo são backend-only. A policy RESTRICTIVE explícita mantém o
-- deny-all atual para anon/authenticated e elimina o estado RLS-without-policy.
DO $policy$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'collection_runs', 'commercial_offers', 'commercial_orders', 'commissions',
    'knowledge_document_relations', 'marketing_automation_queue',
    'marketing_automation_state', 'marketing_lead_campaigns', 'marketing_leads',
    'marketing_messages', 'messaging_contacts', 'messaging_conversations',
    'messaging_messages', 'orders', 'payments', 'promotions', 'service_pricings'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'deny_anon_authenticated', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
      'deny_anon_authenticated', table_name
    );
  END LOOP;
END;
$policy$;

-- Reduz a superfície exposta das funções administrativas. As policies de
-- user_profiles passam a chamar as funções no schema privado não exposto.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.user_id = auth.uid()
      AND up.role = 'admin'::public.user_role
  );
$$;

CREATE OR REPLACE FUNCTION private.current_role_name()
RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT up.role FROM public.user_profiles up WHERE up.user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_role_name() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.current_role_name() TO authenticated, service_role;

ALTER POLICY "Admins can update roles" ON public.user_profiles
  TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
ALTER POLICY "Admins can view all profiles" ON public.user_profiles
  TO authenticated USING (private.is_admin());
ALTER POLICY user_profiles_admin_all ON public.user_profiles
  USING (private.is_admin()) WITH CHECK (private.is_admin());
ALTER POLICY user_profiles_own_select ON public.user_profiles
  USING ((user_id = auth.uid()) OR private.is_admin());
ALTER POLICY user_profiles_own_update ON public.user_profiles
  USING ((user_id = auth.uid()) OR private.is_admin())
  WITH CHECK (((user_id = auth.uid()) AND (role = private.current_role_name())) OR private.is_admin());

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.current_role_name() FROM PUBLIC, anon, authenticated;

-- Índices de FK sem cobertura detectados pelo Advisor. São aditivos e não
-- alteram contratos nem dados.
CREATE INDEX IF NOT EXISTS idx_commercial_offers_promotion_id ON public.commercial_offers (promotion_id);
CREATE INDEX IF NOT EXISTS idx_orders_commercial_offer_id ON public.orders (commercial_offer_id);
CREATE INDEX IF NOT EXISTS idx_marketing_lead_campaigns_campaign_id ON public.marketing_lead_campaigns (campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_messages_campaign_id ON public.marketing_messages (campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_messages_lead_id ON public.marketing_messages (lead_id);
CREATE INDEX IF NOT EXISTS idx_marketing_automation_queue_lead_campaign_id ON public.marketing_automation_queue (lead_campaign_id);
CREATE INDEX IF NOT EXISTS idx_documenso_envelopes_user_id ON public.documenso_envelopes (user_id);

-- `uq_user_profiles_user` é redundante com a PK, mas sustenta uma FK de
-- documenso_envelopes. Não removê-la sem migration própria que recrie a FK.
