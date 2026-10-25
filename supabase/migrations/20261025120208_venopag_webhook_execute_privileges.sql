-- Restrict the VenoPag webhook RPC to trusted server-side callers.
-- Applied in Supabase as migration 20261025120208_venopag_webhook_execute_privileges.
REVOKE ALL ON FUNCTION public.apply_venopag_webhook(uuid, text, timestamptz, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_venopag_webhook(uuid, text, timestamptz, text) TO service_role;
