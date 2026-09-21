-- Migration FASE 18 — Auth + RLS + Storage hardening
-- Repo: Tokenizaa/AdeusMultas-Defesa- | Supabase canônico: llmxnpgjpxcvyrqjkfwb
-- Data: 2026-09-21
-- Princípio: aditivo e idempotente. NADA destrutivo. Preserva fluxos existentes.
--
-- Conteúdo:
--   1. messaging_messages: habilita RLS (deny-all) — tabela estava EXPOSTA (RLS off)
--   2. documents: policy de leitura por ownership via cadeia case -> user
--   3. notification_subscriptions: ownership do usuário (select/insert/update/delete)
--   4. user_profiles: fecha escalação de role (insert próprio restrito a 'citizen';
--      update de role passa a exigir privilégio de coluna — admin usa RPC SECURITY
--      DEFINER admin_update_user_role_by_email, intocado)
--   5. app_settings: policy pública restrita a is_public = true (vazava settings privadas)
--   6. storage case-documents: policy por cadeia case -> user (convenção de path:
--      case-documents/<case_id>/<arquivo>)
--   7. search_path hardening: domain_to_uuid, update_documenso_envelopes_updated_at

-- ============================================================
-- 1) messaging_messages: RLS OFF -> ON deny-all
--    Acesso exclusivo server-side (getSupabaseServerClient, service_role).
--    Zero policies: anon/authenticated bloqueados.
-- ============================================================
ALTER TABLE public.messaging_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2) documents: ownership usuário (A)
--    documents.case_id -> cases.user_id = auth.uid()
--    Escrita: server-side service_role (bypass RLS). Sem policy de INSERT/UPDATE/DELETE.
-- ============================================================
DROP POLICY IF EXISTS "documents_select_own" ON public.documents;
CREATE POLICY "documents_select_own" ON public.documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = documents.case_id AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "documents_admin_all" ON public.documents;
CREATE POLICY "documents_admin_all" ON public.documents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'admin'::user_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'admin'::user_role
    )
  );

-- ============================================================
-- 3) notification_subscriptions: ownership usuário (A)
-- ============================================================
DROP POLICY IF EXISTS "notification_subscriptions_select_own" ON public.notification_subscriptions;
CREATE POLICY "notification_subscriptions_select_own" ON public.notification_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notification_subscriptions_insert_own" ON public.notification_subscriptions;
CREATE POLICY "notification_subscriptions_insert_own" ON public.notification_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notification_subscriptions_update_own" ON public.notification_subscriptions;
CREATE POLICY "notification_subscriptions_update_own" ON public.notification_subscriptions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notification_subscriptions_delete_own" ON public.notification_subscriptions;
CREATE POLICY "notification_subscriptions_delete_own" ON public.notification_subscriptions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 4) user_profiles: fecha escalação de role
--    INSERT próprio: role restrito a 'citizen'
--    UPDATE de role: privilégio de coluna REVOGADO de anon/authenticated.
--    Fluxo admin (RPC admin_update_user_role_by_email, SECURITY DEFINER) e
--    service_role continuam funcionando (owner possui privilégio).
-- ============================================================
DROP POLICY IF EXISTS "user_profiles_insert_trigger" ON public.user_profiles;
CREATE POLICY "user_profiles_insert_trigger" ON public.user_profiles
  FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id AND role = 'citizen'::user_role);

DROP POLICY IF EXISTS "user_profiles_own_insert" ON public.user_profiles;
CREATE POLICY "user_profiles_own_insert" ON public.user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND role = 'citizen'::user_role);

REVOKE UPDATE (role) ON public.user_profiles FROM anon, authenticated;

-- ============================================================
-- 5) app_settings: policy pública restrita a is_public = true
--    (antes: SELECT true — expunha settings privadas p/ qualquer role)
-- ============================================================
DROP POLICY IF EXISTS "app_settings_select_public" ON public.app_settings;
CREATE POLICY "app_settings_select_public" ON public.app_settings
  FOR SELECT TO public
  USING (is_public = true);

-- ============================================================
-- 6) storage.objects — bucket case-documents (privado)
--    Convenção de path: case-documents/<case_id>/<arquivo>
--    Acesso por cadeia case -> user. Admin via user_profiles.role.
-- ============================================================
DROP POLICY IF EXISTS "case documents read own" ON storage.objects;
CREATE POLICY "case documents read own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'case-documents'
    AND EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = (storage.foldername(name))[1]::uuid
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "case documents insert own" ON storage.objects;
CREATE POLICY "case documents insert own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'case-documents'
    AND EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = (storage.foldername(name))[1]::uuid
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "case documents admin all" ON storage.objects;
CREATE POLICY "case documents admin all" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'case-documents'
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'admin'::user_role
    )
  )
  WITH CHECK (
    bucket_id = 'case-documents'
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'admin'::user_role
    )
  );

-- ============================================================
-- 7) search_path hardening das funções sinalizadas
--    domain_to_uuid: IMMUTABLE, usa extensions.digest (qualificado) + builtins pg_catalog
--    update_documenso_envelopes_updated_at: trigger, usa NOW()/NEW — pg_catalog basta
-- ============================================================
ALTER FUNCTION public.domain_to_uuid SET search_path = pg_catalog;
ALTER FUNCTION public.update_documenso_envelopes_updated_at SET search_path = pg_catalog;