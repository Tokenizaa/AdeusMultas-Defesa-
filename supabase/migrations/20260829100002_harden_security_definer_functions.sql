-- 20260829100002_harden_security_definer_functions.sql
-- Endurece funções SECURITY DEFINER / triggers expostas no schema public.
--
-- 1) function_search_path_mutable: fixa search_path (idempotente, não recria o corpo).
--    - handle_new_user / update_updated_at_column: '' (corpos não referenciam tabelas não qualificadas).
--    - admin_update_user_role / admin_update_user_role_by_email: 'public' (corpos referenciam
--      public.user_profiles e auth.users, ambos qualificados).
-- 2) anon/authenticated_security_definer_function_executable:
--    REVOKE EXECUTE de anon+authenticated nas funções admin. Chamadas reais:
--    - admin_update_user_role_by_email: src/server/routes/admin.ts -> getSupabaseServerClient()
--      (service_role; GRANT explícito abaixo garante EXECUTE).
--    - admin_update_user_role(uuid,text): sem uso no código (dead code) -> service_role apenas.
--    is_admin(): NÃO revogada de propósito — é usada por ~37 policies RLS
--      (user_profiles, cases, payments, etc.). REVOKE quebraria o app (permission denied em policy).
--      Já possui SET search_path TO 'public'. WARN 0028/0029 residual aceito, documentado.

-- search_path
ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
ALTER FUNCTION public.admin_update_user_role(uuid, text) SET search_path = 'public';
ALTER FUNCTION public.admin_update_user_role_by_email(text, text) SET search_path = 'public';

-- REVOKE EXECUTE anon/authenticated (funcões admin)
REVOKE EXECUTE ON FUNCTION public.admin_update_user_role(uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_update_user_role_by_email(text, text) FROM anon, authenticated;

-- GRANT EXECUTE service_role (backend)
GRANT EXECUTE ON FUNCTION public.admin_update_user_role(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_user_role_by_email(text, text) TO service_role;