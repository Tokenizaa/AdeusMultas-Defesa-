-- Migration FASE 18 (forward-fix #2) — fecha escalação por UPDATE de role
-- Repo: Tokenizaa/AdeusMultas-Defesa- | Supabase canônico: llmxnpgjpxcvyrqjkfwb
-- Data: 2026-09-21
--
-- Problema residual: REVOKE UPDATE(role) virou no-op (privilege vem do grant
-- de TABELA, sem ACL de coluna — pg_attribute.attacl vazia). UPDATE próprio de
-- user_profiles.role -> 'admin' passava. INSERT próprio já era bloqueado pelo
-- WITH CHECK (auth.uid()=user_id AND role='citizen') da FASE 18.
--
-- Fix: helper SECURITY DEFINER current_role_name() (sem RLS -> sem recursão) e
-- WITH CHECK de user_profiles_own_update exige role INALTERADO (igual ao atual).
-- Admin continua podendo alterar roles via RPC admin_update_user_role_by_email
-- (SECURITY DEFINER) ou via policy "Admins can update roles" (is_admin()).

CREATE OR REPLACE FUNCTION public.current_role_name()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT role FROM public.user_profiles WHERE user_id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.current_role_name() TO anon, authenticated;

DROP POLICY IF EXISTS "user_profiles_own_update" ON public.user_profiles;
CREATE POLICY "user_profiles_own_update" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING ((user_id = auth.uid()) OR public.is_admin())
  WITH CHECK (
    ((user_id = auth.uid()) AND (role = public.current_role_name()))
    OR public.is_admin()
  );