-- Migration: create_marketing_automation
-- Created: 2026-08-27
-- Description: Automação autônoma de prospecção B2B — estado, fila, campanhas, mensagens.

-- ============================================================
-- 1. Estado da automação (worker)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.marketing_automation_state (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status        text      NOT NULL DEFAULT 'STOPPED' CHECK (status IN ('RUNNING','PAUSED','STOPPED','ERROR')),
  last_error    text,
  last_processed_at timestamptz,
  processed_count  integer NOT NULL DEFAULT 0,
  updated_at    timestamptz DEFAULT now()
);

INSERT INTO public.marketing_automation_state (id, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'STOPPED')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Campanhas de prospecção
-- ============================================================
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text      NOT NULL,
  description   text,
  status        text      NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','finished','draft')),
  lead_type     text      NOT NULL CHECK (lead_type IN ('despachante','advogado_transito')),
  target_cities jsonb     NOT NULL DEFAULT '[]'::jsonb,
  steps         jsonb     NOT NULL DEFAULT '[]'::jsonb,
  max_contacts  integer   NOT NULL DEFAULT 3,
  min_interval_hours integer NOT NULL DEFAULT 48,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- ============================================================
-- 3. Relacionamento lead x campanha x etapa
-- ============================================================
CREATE TABLE IF NOT EXISTS public.marketing_lead_campaigns (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       uuid      NOT NULL REFERENCES public.marketing_leads(id) ON DELETE CASCADE,
  campaign_id   uuid      NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  current_step  integer   NOT NULL DEFAULT 0,
  status        text      NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','read','responded','converted','error','exhausted','paused')),
  next_contact_at timestamptz,
  last_contact_at timestamptz,
  contact_count integer NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE(lead_id, campaign_id)
);

-- ============================================================
-- 4. Mensagens enviadas
-- ============================================================
CREATE TABLE IF NOT EXISTS public.marketing_messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       uuid      NOT NULL REFERENCES public.marketing_leads(id) ON DELETE CASCADE,
  campaign_id   uuid      NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  lead_campaign_id uuid   NOT NULL REFERENCES public.marketing_lead_campaigns(id) ON DELETE CASCADE,
  direction     text      NOT NULL CHECK (direction IN ('outbound','inbound')),
  text          text      NOT NULL,
  channel       text      NOT NULL DEFAULT 'whatsapp_evolution',
  status        text      NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','read','failed')),
  external_id   text,
  external_status jsonb   NOT NULL DEFAULT '{}'::jsonb,
  sent_at       timestamptz,
  created_at    timestamptz DEFAULT now()
);

-- ============================================================
-- 5. Fila persistente
-- ============================================================
CREATE TABLE IF NOT EXISTS public.marketing_automation_queue (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_campaign_id uuid  NOT NULL REFERENCES public.marketing_lead_campaigns(id) ON DELETE CASCADE,
  action        text      NOT NULL CHECK (action IN ('send_message','wait_response','update_status','finish')),
  scheduled_at  timestamptz NOT NULL DEFAULT now(),
  attempts      integer   NOT NULL DEFAULT 0,
  max_attempts  integer   NOT NULL DEFAULT 3,
  last_error    text,
  created_at    timestamptz DEFAULT now()
);

-- ============================================================
-- 6. Índices
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_marketing_lead_campaigns_status ON public.marketing_lead_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_lead_campaigns_next_contact ON public.marketing_lead_campaigns(next_contact_at);
CREATE INDEX IF NOT EXISTS idx_marketing_messages_lead_campaign ON public.marketing_messages(lead_campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_queue_scheduled ON public.marketing_automation_queue(scheduled_at);

COMMENT ON TABLE public.marketing_automation_state IS 'Estado global do worker de prospecção autônoma';
COMMENT ON TABLE public.marketing_campaigns IS 'Campanhas de prospecção B2B';
COMMENT ON TABLE public.marketing_lead_campaigns IS 'Progresso de cada lead na campanha';
COMMENT ON TABLE public.marketing_messages IS 'Mensagens enviadas/recebidas por lead e campanha';
COMMENT ON TABLE public.marketing_automation_queue IS 'Fila persistente de ações do worker';