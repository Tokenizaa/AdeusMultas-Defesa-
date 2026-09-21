-- FORENSIC READ-ONLY SNAPSHOT
-- Project: LLMX (llmxnpgjpxcvyrqjkfwb)
-- Captured: 2026-09-21
-- Purpose: reproducible catalog for SGOM reconstruction.
-- IMPORTANT: this file contains SELECTs only. It performs no DDL/DML.

-- 1) Tables, columns, PK/FK metadata
SELECT * FROM information_schema.tables
WHERE table_schema='public' ORDER BY table_name;
SELECT table_schema,table_name,ordinal_position,column_name,data_type,udt_schema,udt_name,
       is_nullable,column_default,identity_generation
FROM information_schema.columns
WHERE table_schema='public' ORDER BY table_name,ordinal_position;
SELECT n.nspname schema_name,c.relname table_name,con.conname constraint_name,
       con.contype,pg_get_constraintdef(con.oid,true) definition
FROM pg_constraint con
JOIN pg_class c ON c.oid=con.conrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' ORDER BY c.relname,con.conname;

-- 2) Indexes
SELECT schemaname,tablename,indexname,indexdef
FROM pg_indexes WHERE schemaname='public'
ORDER BY tablename,indexname;

-- 3) RLS and policies
SELECT n.nspname schema_name,c.relname table_name,c.relrowsecurity rls_enabled,
       c.relforcerowsecurity force_rls
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname;
SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
FROM pg_policies WHERE schemaname='public'
ORDER BY tablename,policyname;

-- 4) Triggers
SELECT n.nspname schema_name,c.relname table_name,t.tgname trigger_name,
       pg_get_triggerdef(t.oid,true) definition,t.tgenabled
FROM pg_trigger t
JOIN pg_class c ON c.oid=t.tgrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND NOT t.tgisinternal
ORDER BY c.relname,t.tgname;

-- 5) Public functions: signatures/security metadata and safe definitions.
-- Only normal functions (prokind='f'); internal procedures/aggregates are excluded.
SELECT n.nspname schema_name,p.proname routine_name,
       pg_get_function_identity_arguments(p.oid) identity_args,
       pg_get_function_result(p.oid) result_type,l.lanname language,
       p.provolatile volatility,p.prosecdef security_definer,p.proleakproof leakproof,
       p.proconfig
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
JOIN pg_language l ON l.oid=p.prolang
WHERE n.nspname='public' AND p.prokind='f'
ORDER BY p.proname,pg_get_function_identity_arguments(p.oid);
SELECT n.nspname schema_name,p.proname routine_name,
       pg_get_function_identity_arguments(p.oid) identity_args,
       pg_get_functiondef(p.oid) definition
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.prokind='f'
ORDER BY p.proname,pg_get_function_identity_arguments(p.oid);

-- 6) Grants/ACLs (metadata only)
SELECT n.nspname schema_name,c.relname object_name,c.relkind,
       COALESCE(c.relacl::text,'(default privileges)') relacl
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname IN ('public','storage')
  AND c.relkind IN ('r','v','m','S','f','p')
ORDER BY n.nspname,c.relname;

-- 7) Enums
SELECT n.nspname schema_name,t.typname type_name,e.enumlabel value,e.enumsortorder sort_order
FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
JOIN pg_enum e ON e.enumtypid=t.oid
WHERE n.nspname='public' ORDER BY t.typname,e.enumsortorder;

-- 8) Extensions: compare installed_version with NULL (available only).
-- The Supabase MCP extension inventory is also part of the audit record.

-- 9) Realtime publications
SELECT pubname,puballtables,pubinsert,pubupdate,pubdelete,pubtruncate
FROM pg_publication ORDER BY pubname;
SELECT p.pubname,n.nspname schemaname,c.relname tablename
FROM pg_publication p
JOIN pg_publication_rel pr ON pr.prpubid=p.oid
JOIN pg_class c ON c.oid=pr.prrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
ORDER BY p.pubname,n.nspname,c.relname;

-- 10) Storage buckets/objects/policies
SELECT id,name,public,file_size_limit,allowed_mime_types,created_at,updated_at
FROM storage.buckets ORDER BY id;
SELECT bucket_id,name,owner,metadata,created_at,updated_at,last_accessed_at
FROM storage.objects ORDER BY bucket_id,name;
SELECT policyname,permissive,roles,cmd,qual,with_check
FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
ORDER BY policyname;

-- 11) Compact forensic counts for repeatability
SELECT
  (SELECT count(*) FROM information_schema.tables WHERE table_schema='public') public_tables,
  (SELECT count(*) FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid
     JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public') public_constraints,
  (SELECT count(*) FROM pg_indexes WHERE schemaname='public') public_indexes,
  (SELECT count(*) FROM pg_policies WHERE schemaname='public') public_policies,
  (SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
     JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND NOT t.tgisinternal) public_triggers,
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.prokind='f') public_functions,
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity) tables_with_rls,
  (SELECT count(*) FROM storage.buckets) storage_buckets,
  (SELECT count(*) FROM storage.objects) storage_objects;
