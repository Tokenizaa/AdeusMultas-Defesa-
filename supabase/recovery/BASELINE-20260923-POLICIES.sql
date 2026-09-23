-- BASELINE POLICIES — 2026-09-23
-- Source: canonical Supabase project llmxnpgjpxcvyrqjkfwb
-- Scope: all application-visible public policies currently present.
-- CURRENT STATE ONLY. Do not replay historical migrations blindly.
-- No canonical database changes are performed by this file.

CREATE POLICY ai_execution_logs_admin_all ON public.ai_execution_logs AS permissive TO public FOR ALL USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = 'admin'::user_role)))));

CREATE POLICY ai_execution_logs_admin_read ON public.ai_execution_logs AS permissive TO authenticated FOR SELECT USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role)))));

CREATE POLICY ai_execution_logs_service_full ON public.ai_execution_logs AS permissive TO service_role FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY app_settings_admin_all ON public.app_settings AS permissive TO public FOR ALL USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = 'admin'::user_role)))));

CREATE POLICY app_settings_admin_delete ON public.app_settings AS permissive TO authenticated FOR DELETE USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role)))));

CREATE POLICY app_settings_admin_update ON public.app_settings AS permissive TO authenticated FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role)))));

CREATE POLICY app_settings_admin_write ON public.app_settings AS permissive TO authenticated FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role)))));

CREATE POLICY app_settings_anon_read ON public.app_settings AS permissive TO anon FOR SELECT USING ((is_public = true));

CREATE POLICY app_settings_auth_read ON public.app_settings AS permissive TO authenticated FOR SELECT USING (((is_public = true) OR (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role))))));

CREATE POLICY app_settings_select_public ON public.app_settings AS permissive TO public FOR SELECT USING ((is_public = true));

CREATE POLICY app_settings_service_full ON public.app_settings AS permissive TO service_role FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY audit_logs_admin_all ON public.audit_logs AS permissive TO public FOR ALL USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = 'admin'::user_role)))));

CREATE POLICY audit_logs_admin_read ON public.audit_logs AS permissive TO authenticated FOR SELECT USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role)))));

CREATE POLICY audit_logs_service_full ON public.audit_logs AS permissive TO service_role FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY bonus_ledger_admin_all ON public.bonus_ledger AS permissive TO public FOR ALL USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = 'admin'::user_role)))));

CREATE POLICY bonus_ledger_admin_insert ON public.bonus_ledger AS permissive TO authenticated FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role)))));

CREATE POLICY bonus_ledger_own_select ON public.bonus_ledger AS permissive TO authenticated FOR SELECT USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role))))));

CREATE POLICY bonus_ledger_select_own ON public.bonus_ledger AS permissive TO public FOR SELECT USING ((user_id = auth.uid()));

CREATE POLICY bonus_ledger_service_full ON public.bonus_ledger AS permissive TO service_role FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY cases_admin_all ON public.cases AS permissive TO public FOR ALL USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = 'admin'::user_role)))));

CREATE POLICY cases_insert_own ON public.cases AS permissive TO public FOR INSERT WITH CHECK ((user_id = auth.uid()));

CREATE POLICY cases_own_all ON public.cases AS permissive TO authenticated FOR ALL USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role)))))) WITH CHECK (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role))))));

CREATE POLICY cases_select_own ON public.cases AS permissive TO public FOR SELECT USING ((user_id = auth.uid()));

CREATE POLICY cases_service_full ON public.cases AS permissive TO service_role FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY cases_update_own ON public.cases AS permissive TO public FOR UPDATE USING ((user_id = auth.uid()));

CREATE POLICY commercial_audit_admin_read ON public.commercial_audit_log AS permissive TO authenticated FOR SELECT USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role)))));

CREATE POLICY commercial_audit_log_admin_all ON public.commercial_audit_log AS permissive TO public FOR ALL USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = 'admin'::user_role)))));

CREATE POLICY commercial_audit_service_full ON public.commercial_audit_log AS permissive TO service_role FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY commission_ledger_admin_all ON public.commission_ledger AS permissive TO public FOR ALL USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = 'admin'::user_role)))));

CREATE POLICY commission_ledger_own_select ON public.commission_ledger AS permissive TO authenticated FOR SELECT USING (((beneficiary_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role))))));

CREATE POLICY commission_ledger_select_own ON public.commission_ledger AS permissive TO public FOR SELECT USING ((beneficiary_id = auth.uid()));

CREATE POLICY commission_ledger_service_full ON public.commission_ledger AS permissive TO service_role FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY service_role_full_content_versions ON public.content_versions AS permissive TO public FOR ALL USING ((auth.role() = 'service_role'::text));

CREATE POLICY coupons_admin_all ON public.coupons AS permissive TO public FOR ALL USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = 'admin'::user_role)))));

CREATE POLICY coupons_admin_delete ON public.coupons AS permissive TO authenticated FOR DELETE USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role)))));

CREATE POLICY coupons_admin_insert ON public.coupons AS permissive TO authenticated FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role)))));

CREATE POLICY coupons_admin_update ON public.coupons AS permissive TO authenticated FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role)))));

CREATE POLICY coupons_anon_read ON public.coupons AS permissive TO anon FOR SELECT USING ((is_active = true));

CREATE POLICY coupons_auth_read ON public.coupons AS permissive TO authenticated FOR SELECT USING (((is_active = true) OR (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role))))));

CREATE POLICY coupons_select_public ON public.coupons AS permissive TO public FOR SELECT USING (true);

CREATE POLICY coupons_service_full ON public.coupons AS permissive TO service_role FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access documenso_envelopes" ON public.documenso_envelopes AS permissive TO public FOR ALL USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role)))));

CREATE POLICY "Service role insert documenso_envelopes" ON public.documenso_envelopes AS permissive TO public FOR INSERT WITH CHECK ((auth.role() = 'service_role'::text));

CREATE POLICY "Service role update documenso_envelopes" ON public.documenso_envelopes AS permissive TO public FOR UPDATE USING ((auth.role() = 'service_role'::text));

CREATE POLICY "User view own documenso_envelopes" ON public.documenso_envelopes AS permissive TO public FOR SELECT USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role))))));

CREATE POLICY "Admin full access documenso_recipients" ON public.documenso_recipients AS permissive TO public FOR ALL USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role)))));

CREATE POLICY "Service role insert documenso_recipients" ON public.documenso_recipients AS permissive TO public FOR INSERT WITH CHECK ((auth.role() = 'service_role'::text));

CREATE POLICY "Service role update documenso_recipients" ON public.documenso_recipients AS permissive TO public FOR UPDATE USING ((auth.role() = 'service_role'::text));

CREATE POLICY "User view own documenso_recipients" ON public.documenso_recipients AS permissive TO public FOR SELECT USING ((envelope_id IN ( SELECT documenso_envelopes.id
   FROM documenso_envelopes
  WHERE (documenso_envelopes.case_id IN ( SELECT cases.id
           FROM cases
          WHERE (cases.user_id = auth.uid()))))));

CREATE POLICY "Admin full access documenso_webhook_events" ON public.documenso_webhook_events AS permissive TO public FOR ALL USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role)))));

CREATE POLICY "Service role insert documenso_webhook_events" ON public.documenso_webhook_events AS permissive TO public FOR INSERT WITH CHECK ((auth.role() = 'service_role'::text));

CREATE POLICY documents_admin_all ON public.documents AS permissive TO authenticated FOR ALL USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = 'admin'::user_role))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = 'admin'::user_role)))));

CREATE POLICY documents_select_own ON public.documents AS permissive TO authenticated FOR SELECT USING ((EXISTS ( SELECT 1
   FROM cases c
  WHERE ((c.id = documents.case_id) AND (c.user_id = auth.uid())))));

CREATE POLICY "Admins can view e2e_test_results" ON public.e2e_test_results AS permissive TO public FOR ALL USING ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR ((auth.jwt() ->> 'email'::text) = 'admin@defesai.com.br'::text)));

CREATE POLICY "Admins can view e2e_test_runs" ON public.e2e_test_runs AS permissive TO public FOR ALL USING ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR ((auth.jwt() ->> 'email'::text) = 'admin@defesai.com.br'::text)));

CREATE POLICY editorial_content_admin_all ON public.editorial_content AS permissive TO public FOR ALL USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = 'admin'::user_role)))));

CREATE POLICY editorial_content_admin_delete ON public.editorial_content AS permissive TO authenticated FOR DELETE USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role)))));

CREATE POLICY editorial_content_admin_insert ON public.editorial_content AS permissive TO authenticated FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role)))));

CREATE POLICY editorial_content_admin_update ON public.editorial_content AS permissive TO authenticated FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role)))));

CREATE POLICY editorial_content_anon_read ON public.editorial_content AS permissive TO anon FOR SELECT USING ((status = ANY (ARRAY['aprovado_qualidade'::text, 'agendado'::text, 'publicado'::text])));

CREATE POLICY editorial_content_auth_read ON public.editorial_content AS permissive TO authenticated FOR SELECT USING (((status = ANY (ARRAY['aprovado_qualidade'::text, 'agendado'::text, 'publicado'::text])) OR (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role))))));

CREATE POLICY editorial_content_service_full ON public.editorial_content AS permissive TO service_role FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY service_role_full_editorial_content ON public.editorial_content AS permissive TO public FOR ALL USING ((auth.role() = 'service_role'::text));

CREATE POLICY knowledge_chunks_admin_all ON public.knowledge_chunks AS permissive TO public FOR ALL USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = 'admin'::user_role)))));

CREATE POLICY knowledge_chunks_auth_read ON public.knowledge_chunks AS permissive TO authenticated FOR SELECT USING (true);

CREATE POLICY knowledge_chunks_select_public ON public.knowledge_chunks AS permissive TO public FOR SELECT USING (true);

CREATE POLICY knowledge_chunks_service_full ON public.knowledge_chunks AS permissive TO service_role FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY knowledge_document_versions_admin_all ON public.knowledge_document_versions AS permissive TO public FOR ALL USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = 'admin'::user_role)))));

CREATE POLICY knowledge_document_versions_auth_read ON public.knowledge_document_versions AS permissive TO authenticated FOR SELECT USING (true);

CREATE POLICY knowledge_document_versions_select_public ON public.knowledge_document_versions AS permissive TO public FOR SELECT USING (true);

CREATE POLICY knowledge_document_versions_service_full ON public.knowledge_document_versions AS permissive TO service_role FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY knowledge_documents_admin_all ON public.knowledge_documents AS permissive TO public FOR ALL USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = 'admin'::user_role)))));

CREATE POLICY knowledge_documents_auth_read ON public.knowledge_documents AS permissive TO authenticated FOR SELECT USING ((status = 'ACTIVE'::text));

CREATE POLICY knowledge_documents_select_public ON public.knowledge_documents AS permissive TO public FOR SELECT USING (true);

CREATE POLICY knowledge_documents_service_full ON public.knowledge_documents AS permissive TO service_role FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY knowledge_embeddings_admin_all ON public.knowledge_embeddings AS permissive TO public FOR ALL USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = 'admin'::user_role)))));

CREATE POLICY knowledge_embeddings_auth_read ON public.knowledge_embeddings AS permissive TO authenticated FOR SELECT USING (true);

CREATE POLICY knowledge_embeddings_service_full ON public.knowledge_embeddings AS permissive TO service_role FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY knowledge_ingestions_admin_all ON public.knowledge_ingestions AS permissive TO public FOR ALL USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = 'admin'::user_role)))));

CREATE POLICY knowledge_ingestions_service_full ON public.knowledge_ingestions AS permissive TO service_role FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY knowledge_sources_admin_all ON public.knowledge_sources AS permissive TO public FOR ALL USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = 'admin'::user_role)))));

CREATE POLICY knowledge_sources_auth_read ON public.knowledge_sources AS permissive TO authenticated FOR SELECT USING ((is_active = true));

CREATE POLICY knowledge_sources_select_public ON public.knowledge_sources AS permissive TO public FOR SELECT USING (true);

CREATE POLICY knowledge_sources_service_full ON public.knowledge_sources AS permissive TO service_role FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY marketing_campaigns_admin_all ON public.marketing_campaigns AS permissive TO public FOR ALL USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = 'admin'::user_role)))));

CREATE POLICY marketing_campaigns_admin_delete ON public.marketing_campaigns AS permissive TO authenticated FOR DELETE USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role)))));

CREATE POLICY marketing_campaigns_admin_insert ON public.marketing_campaigns AS permissive TO authenticated FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role)))));

CREATE POLICY marketing_campaigns_admin_update ON public.marketing_campaigns AS permissive TO authenticated FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role)))));

CREATE POLICY marketing_campaigns_anon_read ON public.marketing_campaigns AS permissive TO anon FOR SELECT USING ((status = 'active'::text));

CREATE POLICY marketing_campaigns_auth_read ON public.marketing_campaigns AS permissive TO authenticated FOR SELECT USING (((status = 'active'::text) OR (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role))))));

CREATE POLICY marketing_campaigns_service_full ON public.marketing_campaigns AS permissive TO service_role FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY meta_accounts_admin_all ON public.meta_accounts AS permissive TO public FOR ALL USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = 'admin'::user_role)))));

CREATE POLICY meta_accounts_insert_own ON public.meta_accounts AS permissive TO public FOR INSERT WITH CHECK ((user_id = auth.uid()));

CREATE POLICY meta_accounts_own_all ON public.meta_accounts AS permissive TO authenticated FOR ALL USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role)))))) WITH CHECK (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role))))));

CREATE POLICY meta_accounts_select_own ON public.meta_accounts AS permissive TO public FOR SELECT USING ((user_id = auth.uid()));

CREATE POLICY meta_accounts_service_full ON public.meta_accounts AS permissive TO service_role FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY meta_accounts_update_own ON public.meta_accounts AS permissive TO public FOR UPDATE USING ((user_id = auth.uid()));

CREATE POLICY service_role_full_access ON public.meta_tokens AS permissive TO public FOR ALL USING ((auth.role() = 'service_role'::text));

CREATE POLICY notification_subscriptions_delete_own ON public.notification_subscriptions AS permissive TO authenticated FOR DELETE USING ((user_id = auth.uid()));

CREATE POLICY notification_subscriptions_insert_own ON public.notification_subscriptions AS permissive TO authenticated FOR INSERT WITH CHECK ((user_id = auth.uid()));

CREATE POLICY notification_subscriptions_select_own ON public.notification_subscriptions AS permissive TO authenticated FOR SELECT USING ((user_id = auth.uid()));

CREATE POLICY notification_subscriptions_update_own ON public.notification_subscriptions AS permissive TO authenticated FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

CREATE POLICY notifications_admin_all ON public.notifications AS permissive TO public FOR ALL USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = 'admin'::user_role)))));

CREATE POLICY notifications_insert_own ON public.notifications AS permissive TO public FOR INSERT WITH CHECK ((user_id = auth.uid()));

CREATE POLICY notifications_own_all ON public.notifications AS permissive TO authenticated FOR ALL USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role)))))) WITH CHECK (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role))))));

CREATE POLICY notifications_select_own ON public.notifications AS permissive TO public FOR SELECT USING ((user_id = auth.uid()));

CREATE POLICY notifications_service_full ON public.notifications AS permissive TO service_role FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY notifications_update_own ON public.notifications AS permissive TO public FOR UPDATE USING ((user_id = auth.uid()));

CREATE POLICY payment_events_admin_all ON public.payment_events AS permissive TO public FOR ALL USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = 'admin'::user_role)))));

CREATE POLICY payment_orders_admin_all ON public.payment_orders AS permissive TO public FOR ALL USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = 'admin'::user_role)))));

CREATE POLICY payment_orders_insert_own ON public.payment_orders AS permissive TO public FOR INSERT WITH CHECK ((user_id = auth.uid()));

CREATE POLICY payment_orders_own_insert ON public.payment_orders AS permissive TO authenticated FOR INSERT WITH CHECK (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role))))));

CREATE POLICY payment_orders_own_select ON public.payment_orders AS permissive TO authenticated FOR SELECT USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role))))));

CREATE POLICY payment_orders_select_own ON public.payment_orders AS permissive TO public FOR SELECT USING ((user_id = auth.uid()));

CREATE POLICY payment_orders_service_full ON public.payment_orders AS permissive TO service_role FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY payment_webhook_events_admin_all ON public.payment_webhook_events AS permissive TO public FOR ALL USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = 'admin'::user_role)))));

CREATE POLICY payment_webhook_events_admin_read ON public.payment_webhook_events AS permissive TO authenticated FOR SELECT USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role)))));

CREATE POLICY payment_webhook_events_service_full ON public.payment_webhook_events AS permissive TO service_role FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY platform_events_admin_all ON public.platform_events AS permissive TO public FOR ALL USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = 'admin'::user_role)))));

CREATE POLICY platform_events_own_read ON public.platform_events AS permissive TO authenticated FOR SELECT USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role))))));

CREATE POLICY platform_events_service_full ON public.platform_events AS permissive TO service_role FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY promotion_campaigns_admin_all ON public.promotion_campaigns AS permissive TO public FOR ALL USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = 'admin'::user_role)))));

CREATE POLICY promotion_campaigns_admin_delete ON public.promotion_campaigns AS permissive TO authenticated FOR DELETE USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role)))));

CREATE POLICY promotion_campaigns_admin_insert ON public.promotion_campaigns AS permissive TO authenticated FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role)))));

CREATE POLICY promotion_campaigns_admin_update ON public.promotion_campaigns AS permissive TO authenticated FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role)))));

CREATE POLICY promotion_campaigns_anon_read ON public.promotion_campaigns AS permissive TO anon FOR SELECT USING ((status = ANY (ARRAY['active'::text, 'scheduled'::text])));

CREATE POLICY promotion_campaigns_auth_read ON public.promotion_campaigns AS permissive TO authenticated FOR SELECT USING (((status = ANY (ARRAY['active'::text, 'scheduled'::text])) OR (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role))))));

CREATE POLICY promotion_campaigns_select_public ON public.promotion_campaigns AS permissive TO public FOR SELECT USING (true);

CREATE POLICY promotion_campaigns_service_full ON public.promotion_campaigns AS permissive TO service_role FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY service_role_full_publisher_jobs ON public.publisher_jobs AS permissive TO public FOR ALL USING ((auth.role() = 'service_role'::text));

CREATE POLICY referral_config_admin_all ON public.referral_config AS permissive TO public FOR ALL USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = 'admin'::user_role)))));

CREATE POLICY referral_config_admin_delete ON public.referral_config AS permissive TO authenticated FOR DELETE USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role)))));

CREATE POLICY referral_config_admin_insert ON public.referral_config AS permissive TO authenticated FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role)))));

CREATE POLICY referral_config_admin_update ON public.referral_config AS permissive TO authenticated FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role)))));

CREATE POLICY referral_config_auth_read ON public.referral_config AS permissive TO authenticated FOR SELECT USING (true);

CREATE POLICY referral_config_select_public ON public.referral_config AS permissive TO public FOR SELECT USING (true);

CREATE POLICY referral_config_service_full ON public.referral_config AS permissive TO service_role FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY referral_relations_admin_all ON public.referral_relations AS permissive TO public FOR ALL USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = auth.uid()) AND (up.role = 'admin'::user_role)))));

CREATE POLICY referral_relations_admin_insert ON public.referral_relations AS permissive TO authenticated FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role)))));

CREATE POLICY referral_relations_own_select ON public.referral_relations AS permissive TO authenticated FOR SELECT USING (((referrer_id = auth.uid()) OR (referred_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::user_role))))));

CREATE POLICY referral_relations_select_own ON public.referral_relations AS permissive TO public FOR SELECT USING (((referrer_id = auth.uid()) OR (referred_id = auth.uid())));

CREATE POLICY referral_relations_service_all ON public.referral_relations AS permissive TO service_role FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admins can update roles" ON public.user_profiles AS permissive TO public FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can view all profiles" ON public.user_profiles AS permissive TO public FOR SELECT USING (is_admin());

CREATE POLICY "Users can view own profile" ON public.user_profiles AS permissive TO public FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY user_profiles_admin_all ON public.user_profiles AS permissive TO authenticated FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY user_profiles_insert_service ON public.user_profiles AS permissive TO public FOR INSERT WITH CHECK ((auth.role() = 'service_role'::text));

CREATE POLICY user_profiles_insert_trigger ON public.user_profiles AS permissive TO public FOR INSERT WITH CHECK (((auth.uid() = user_id) AND (role = 'citizen'::user_role)));

CREATE POLICY user_profiles_own_insert ON public.user_profiles AS permissive TO authenticated FOR INSERT WITH CHECK (((user_id = auth.uid()) AND (role = 'citizen'::user_role)));

CREATE POLICY user_profiles_own_select ON public.user_profiles AS permissive TO authenticated FOR SELECT USING (((user_id = auth.uid()) OR is_admin()));

CREATE POLICY user_profiles_own_update ON public.user_profiles AS permissive TO authenticated FOR UPDATE USING (((user_id = auth.uid()) OR is_admin())) WITH CHECK ((((user_id = auth.uid()) AND (role = current_role_name())) OR is_admin()));

CREATE POLICY user_profiles_select_own ON public.user_profiles AS permissive TO public FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY user_profiles_service_full ON public.user_profiles AS permissive TO service_role FOR ALL USING (true) WITH CHECK (true);

