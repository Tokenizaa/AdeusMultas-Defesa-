-- Migration FASE 18 (forward-fix #3) — elimina policy UPDATE legacy insegura
-- Repo: Tokenizaa/AdeusMultas-Defesa- | Supabase canônico: llmxnpgjpxcvyrqjkfwb
-- Data: 2026-09-21
--
-- Problema: "user_profiles_update_own" (roles public, USING auth.uid()=user_id,
-- sem WITH CHECK explicito -> defaults p/ USING) permitia cidadao alterar o
-- PROPRIO user_profiles.role para 'admin' (escalacao). Redundante com a policy
-- hardened "user_profiles_own_update" (authenticated, WITH CHECK preserva role
-- via current_role_name() SECURITY DEFINER). Frontend so faz INSERT em
-- user_profiles (AuthContext); updates passam por RPC admin ou service_role.
-- Drop: aditivo em seguranca, nenhum fluxo legitimo depende dela.

DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;