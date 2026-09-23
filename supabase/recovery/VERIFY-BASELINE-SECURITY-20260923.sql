-- READ-ONLY VERIFICATION — SECURITY BASELINE 2026-09-23
-- Run against the canonical project or a disposable reconstruction.
-- This script performs no writes.

SELECT count(*) AS policy_count
FROM pg_policies
WHERE schemaname='public';

SELECT count(*) AS public_function_count
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.prokind='f';

SELECT count(*) AS public_noninternal_trigger_count
FROM pg_trigger t
JOIN pg_class c ON c.oid=t.tgrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND NOT t.tgisinternal;

SELECT count(*) AS rls_enabled_tables_without_policy
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
LEFT JOIN pg_policies p ON p.schemaname=n.nspname AND p.tablename=c.relname
WHERE n.nspname='public'
  AND c.relkind='r'
  AND c.relrowsecurity
  AND p.policyname IS NULL;

-- Expected canonical snapshot: 203 public functions, 11 public non-internal triggers, 153 public policies.\n\n-- Policy identity comparison
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname='public'
ORDER BY tablename, policyname;
