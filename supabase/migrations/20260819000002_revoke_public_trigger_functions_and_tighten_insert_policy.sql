-- Migration: Revoke public EXECUTE on trigger functions + tighten user_profiles insert policy
-- Applied to llmxnpgjpxcvyrqjkfwb (DefesAi production) via Supabase MCP
-- Date: 2026-08-19
-- Security: advisors flagged SECURITY DEFINER funcs callable via /rest/v1/rpc by anon/authenticated.
-- Triggers are NOT affected: SECURITY DEFINER executes as owner (bypasses role EXECUTE grants + RLS).

-- 1. Block direct RPC calls to trigger functions (keep service_role for bootstrap)
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_user_update() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_user_update() TO service_role;

-- 2. Tighten user_profiles insert policy: authenticated can insert ONLY own row
DROP POLICY IF EXISTS "user_profiles_insert_trigger" ON user_profiles;
CREATE POLICY "user_profiles_insert_trigger" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);