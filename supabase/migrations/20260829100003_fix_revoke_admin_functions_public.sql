-- 20260829100003_fix_revoke_admin_functions_public.sql
-- Correção: REVOKE EXECUTE ... FROM anon/authenticated (20260829100002) foi inócuo —
-- em PostgreSQL, funções têm EXECUTE default p/ PUBLIC e anon/authenticated herdam via PUBLIC.
-- REVOKE de PUBLIC remove o default; GRANT explícito devolve EXECUTE p/ service_role (backend).

REVOKE EXECUTE ON FUNCTION public.admin_update_user_role(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_update_user_role_by_email(text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_update_user_role(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_user_role_by_email(text, text) TO service_role;