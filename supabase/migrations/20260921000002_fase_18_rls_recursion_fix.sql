-- Migration FASE 18 (forward-fix) — resolve recursão RLS em user_profiles
-- Repo: Tokenizaa/AdeusMultas-Defesa- | Supabase canônico: llmxnpgjpxcvyrqjkfwb
-- Data: 2026-09-21
--
-- Problema: policies de user_profiles com subquery self-referencial
-- (auth.uid() IN (SELECT user_id FROM user_profiles WHERE role='admin'))
-- causam "infinite recursion detected in policy for relation user_profiles"
-- quando qualquer policy de OUTRA tabela referencia user_profiles (ex.: cases,
-- documents, storage objects). Leitura direta autenticada de cases já quebrava
-- (latente). Precedente no repo: migration fix_is_admin_recursion_security_definer.
--
-- Fix: funcao is_admin() SECURITY DEFINER (bypassa RLS) + policies de
-- user_profiles passam a usar is_admin() em vez de subquery self-referencial.
-- As demais policies (documents_admin_all, storage admin, cases_admin_all etc.)
-- continuam com subquery em user_profiles — agora SAFE pois a avaliacao de RLS
-- de user_profiles termina no primeiro nivel (is_admin() nao re-aplica RLS).

-- ============================================================
-- 1) is_admin(): SECURITY DEFINER, bypassa RLS (padrao do repo)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role = 'admin'::public.user_role
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- ============================================================
-- 2) Reescreve policies self-referenciais de user_profiles
-- ============================================================
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_profiles;
CREATE POLICY "Admins can update roles" ON public.user_profiles
  FOR UPDATE TO public
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
  FOR SELECT TO public
  USING (public.is_admin());

DROP POLICY IF EXISTS "user_profiles_admin_all" ON public.user_profiles;
CREATE POLICY "user_profiles_admin_all" ON public.user_profiles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "user_profiles_own_select" ON public.user_profiles;
CREATE POLICY "user_profiles_own_select" ON public.user_profiles
  FOR SELECT TO authenticated
  USING ((user_id = auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "user_profiles_own_update" ON public.user_profiles;
CREATE POLICY "user_profiles_own_update" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING ((user_id = auth.uid()) OR public.is_admin())
  WITH CHECK ((user_id = auth.uid()) OR public.is_admin());

-- user_profiles_select_own (public) ja usa auth.uid()=user_id — sem self-ref, mantida.
-- user_profiles_insert_trigger / own_insert (citizen) — sem self-ref, mantidas da FASE 18.