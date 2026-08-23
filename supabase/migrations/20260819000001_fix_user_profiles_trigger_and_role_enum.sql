-- Migration: Fix user_profiles trigger + role text → enum
-- Applied to llmxnpgjpxcvyrqjkfwb (Remix_AdeusMultas)
-- Date: 2026-08-19
-- Problem: No trigger on auth.users → user_profiles never populated
--          role column was text, should be enum
-- Root cause: CHECK constraint 'user_profiles_role_check' blocked ALTER TYPE

-- ============================================================
-- STEP 1: Drop ALL policies that reference user_profiles.role
-- (required before ALTER COLUMN TYPE)
-- ============================================================

-- user_profiles
DROP POLICY IF EXISTS "user_profiles_admin_all" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Trigger can insert profiles" ON user_profiles;

-- All other tables with admin_all policies referencing role
DROP POLICY IF EXISTS "payment_events_admin_all" ON payment_events;
DROP POLICY IF EXISTS "cases_admin_all" ON cases;
DROP POLICY IF EXISTS "notifications_admin_all" ON notifications;
DROP POLICY IF EXISTS "payment_orders_admin_all" ON payment_orders;
DROP POLICY IF EXISTS "bonus_ledger_admin_all" ON bonus_ledger;
DROP POLICY IF EXISTS "referral_relations_admin_all" ON referral_relations;
DROP POLICY IF EXISTS "commission_ledger_admin_all" ON commission_ledger;
DROP POLICY IF EXISTS "meta_accounts_admin_all" ON meta_accounts;
DROP POLICY IF EXISTS "audit_logs_admin_all" ON audit_logs;
DROP POLICY IF EXISTS "commercial_audit_log_admin_all" ON commercial_audit_log;
DROP POLICY IF EXISTS "editorial_content_admin_all" ON editorial_content;
DROP POLICY IF EXISTS "marketing_campaigns_admin_all" ON marketing_campaigns;
DROP POLICY IF EXISTS "payment_webhook_events_admin_all" ON payment_webhook_events;
DROP POLICY IF EXISTS "platform_events_admin_all" ON platform_events;
DROP POLICY IF EXISTS "ai_execution_logs_admin_all" ON ai_execution_logs;
DROP POLICY IF EXISTS "knowledge_embeddings_admin_all" ON knowledge_embeddings;
DROP POLICY IF EXISTS "knowledge_ingestions_admin_all" ON knowledge_ingestions;
DROP POLICY IF EXISTS "app_settings_admin_all" ON app_settings;
DROP POLICY IF EXISTS "service_pricings_admin_all" ON service_pricings;
DROP POLICY IF EXISTS "promotion_campaigns_admin_all" ON promotion_campaigns;
DROP POLICY IF EXISTS "coupons_admin_all" ON coupons;
DROP POLICY IF EXISTS "referral_config_admin_all" ON referral_config;
DROP POLICY IF EXISTS "knowledge_sources_admin_all" ON knowledge_sources;
DROP POLICY IF EXISTS "knowledge_documents_admin_all" ON knowledge_documents;
DROP POLICY IF EXISTS "knowledge_document_versions_admin_all" ON knowledge_document_versions;
DROP POLICY IF EXISTS "knowledge_chunks_admin_all" ON knowledge_chunks;

-- ============================================================
-- STEP 2: Drop CHECK constraint, create enum, alter column
-- ============================================================

-- Drop CHECK constraint that blocks ALTER TYPE
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Create enum type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('citizen', 'admin');
  END IF;
END $$;

-- Alter column type
ALTER TABLE user_profiles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE user_profiles ALTER COLUMN role TYPE user_role USING role::user_role;
ALTER TABLE user_profiles ALTER COLUMN role SET DEFAULT 'citizen'::user_role;

-- ============================================================
-- STEP 3: Create trigger function for new auth users
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, name, email, phone, role, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    COALESCE(NEW.raw_user_meta_data->>'role', 'citizen')::user_role,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STEP 4: Create trigger function for auth user updates
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_profiles
  SET
    name = COALESCE(NEW.raw_user_meta_data->>'name', name),
    phone = COALESCE(NEW.raw_user_meta_data->>'phone', phone),
    email = COALESCE(NEW.email, email),
    updated_at = NOW()
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_update();

-- ============================================================
-- STEP 5: Recreate ALL policies with enum type
-- ============================================================

-- user_profiles
CREATE POLICY "user_profiles_select_own" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_profiles_update_own" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_profiles_insert_service" ON user_profiles
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "user_profiles_insert_trigger" ON user_profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "user_profiles_admin_all" ON user_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'admin'::user_role
    )
  );

-- All other tables with admin_all policies
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'payment_events', 'cases', 'notifications', 'payment_orders',
      'bonus_ledger', 'referral_relations', 'commission_ledger',
      'meta_accounts', 'audit_logs', 'commercial_audit_log',
      'editorial_content', 'marketing_campaigns', 'payment_webhook_events',
      'platform_events', 'ai_execution_logs', 'knowledge_embeddings',
      'knowledge_ingestions', 'app_settings', 'service_pricings',
      'promotion_campaigns', 'coupons', 'referral_config',
      'knowledge_sources', 'knowledge_documents', 'knowledge_document_versions',
      'knowledge_chunks'
    ])
  LOOP
    EXECUTE format(
      'CREATE POLICY "%s_admin_all" ON %I FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles up WHERE up.user_id = auth.uid() AND up.role = ''admin''::user_role)
      )',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ============================================================
-- STEP 6: Backfill existing user(s) without profiles
-- ============================================================

INSERT INTO public.user_profiles (user_id, name, email, phone, role, created_at, updated_at)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
  au.email,
  COALESCE(au.raw_user_meta_data->>'phone', NULL),
  COALESCE(au.raw_user_meta_data->>'role', 'citizen')::user_role,
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN public.user_profiles up ON up.user_id = au.id
WHERE up.id IS NULL;
