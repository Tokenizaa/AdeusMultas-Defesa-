-- Migration: create_marketing_leads
-- Created: 2026-08-27
-- Description: Leads públicos para prospecção B2B (despachantes e advogados de trânsito).

CREATE TABLE IF NOT EXISTS public.marketing_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_type text NOT NULL CHECK (lead_type IN ('despachante', 'advogado_transito')),
  name text NOT NULL,
  phone text,
  phone_normalized text,
  whatsapp text,
  email text,
  website text,
  instagram text,
  facebook text,
  address text,
  city text,
  state text,
  zip_code text,
  google_maps_url text,
  rating numeric,
  review_count integer,
  category text,
  source text NOT NULL,
  source_url text,
  scraped_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Desativa RLS porque o acesso é controlado via service_role (backend only)
ALTER TABLE public.marketing_leads DISABLE ROW LEVEL SECURITY;

-- Unique constraints para deduplicação
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketing_leads_phone_normalized
  ON public.marketing_leads(phone_normalized)
  WHERE phone_normalized IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketing_leads_website
  ON public.marketing_leads(website)
  WHERE website IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketing_leads_email
  ON public.marketing_leads(email)
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketing_leads_source_url
  ON public.marketing_leads(source, source_url);

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketing_leads_name_address
  ON public.marketing_leads(name, address)
  WHERE address IS NOT NULL;

-- Índices para buscas comuns
CREATE INDEX IF NOT EXISTS idx_marketing_leads_lead_type
  ON public.marketing_leads(lead_type);

CREATE INDEX IF NOT EXISTS idx_marketing_leads_city
  ON public.marketing_leads(city);

CREATE INDEX IF NOT EXISTS idx_marketing_leads_state
  ON public.marketing_leads(state);

CREATE INDEX IF NOT EXISTS idx_marketing_leads_rating
  ON public.marketing_leads(rating);

COMMENT ON TABLE public.marketing_leads IS 'Leads públicos de prospecção B2B (despachantes e advogados de trânsito)';
COMMENT ON COLUMN public.marketing_leads.lead_type IS 'Tipo: despachante | advogado_transito';
COMMENT ON COLUMN public.marketing_leads.phone_normalized IS 'Telefone normalizado (só dígitos, DDD+numero)';
COMMENT ON COLUMN public.marketing_leads.scraped_at IS 'Data/hora da coleta automatizada';
COMMENT ON COLUMN public.marketing_leads.source IS 'Fonte da coleta (ex: google_maps, oab_sp, detran_sp)';
COMMENT ON COLUMN public.marketing_leads.source_url IS 'URL pública do registro na fonte';
COMMENT ON COLUMN public.marketing_leads.google_maps_url IS 'URL do Google Maps quando disponível';
COMMENT ON COLUMN public.marketing_leads.rating IS 'Nota pública (ex: do Google Maps)';
COMMENT ON COLUMN public.marketing_leads.review_count IS 'Qtd de avaliações públicas';