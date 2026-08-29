-- Migration: Alinhar policies legacy de user_profiles à coluna canônica user_id
-- Root cause: após refactor 20260819000001, `user_id` (UNIQUE FK -> auth.users) virou
-- a identidade auth canônica; `id` (PK gen_random_uuid) NUNCA == auth.uid().
-- 3 policies legacy dashboard ficaram órfãs comparando auth.uid() contra `id`:
--   - "Admins can view all profiles" / "Admins can update roles" -> subquery em `id`
--     nunca casa -> admins não enxergam tudo por essas policies (mortas, enganosas)
--   - "Users can view own profile" -> auth.uid() = id -> nunca casa
-- As policies user_id-based (user_profiles_select_own, own_select, own_update) e
-- is_admin()-based (user_profiles_admin_all) seguem intocadas.
-- Idempotente: DROP IF EXISTS + CREATE (padrão do repo).

SET search_path TO public;

DROP POLICY IF EXISTS "Admins can update roles" ON user_profiles;
CREATE POLICY "Admins can update roles" ON user_profiles
  FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM user_profiles WHERE role = 'admin'::user_role)
  );

DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM user_profiles WHERE role = 'admin'::user_role)
  );

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);