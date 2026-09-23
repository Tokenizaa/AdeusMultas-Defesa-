-- BASELINE TRIGGERS — 2026-09-23
-- Source: canonical Supabase project llmxnpgjpxcvyrqjkfwb
-- 11 public non-internal triggers observed.
-- Auth triggers are documented separately because they belong to auth.users.

CREATE TRIGGER trg_cases_updated BEFORE UPDATE ON public.cases
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_coupons_updated BEFORE UPDATE ON public.coupons
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_update_documenso_envelopes_updated_at BEFORE UPDATE ON public.documenso_envelopes
FOR EACH ROW EXECUTE FUNCTION public.update_documenso_envelopes_updated_at();

CREATE TRIGGER trg_editorial_content_updated BEFORE UPDATE ON public.editorial_content
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_marketing_campaigns_updated BEFORE UPDATE ON public.marketing_campaigns
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_meta_accounts_updated BEFORE UPDATE ON public.meta_accounts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_payment_orders_updated BEFORE UPDATE ON public.payment_orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_promotion_campaigns_updated BEFORE UPDATE ON public.promotion_campaigns
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_referral_config_updated BEFORE UPDATE ON public.referral_config
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_user_profiles_updated BEFORE UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Duplicate/legacy timestamp trigger. Preserved in baseline; candidate for later consolidation.
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auth triggers observed in canonical project:
-- auth.users.on_auth_user_created -> public.handle_new_user()
-- auth.users.on_auth_user_updated -> public.handle_user_update()
-- These are intentionally not emitted as public-schema CREATE TRIGGER statements.
