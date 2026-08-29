-- 20260829100001_enable_rls_internal_tables.sql
-- Habilita RLS em tabelas internas do DefesAi.
-- Auditoria de consumo (2026-08-29):
--   - Backend (src/server, src/scraper-prospecting) acessa todas via service_role (bypassa RLS).
--   - Frontend (src/**/*.tsx usando supabase-js anon) toca APENAS user_profiles
--     (grep `.from(` em *.tsx -> somente user_profiles). Nenhuma destas 14 é lida/escrita via PostgREST anon.
-- Estratégia: RLS ON + nenhuma policy -> deny-all para anon/authenticated. service_role segue full.

ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_automation_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_lead_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_automation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_pricings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;