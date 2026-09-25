-- FASE 12.2: Adiciona colunas faltantes em public.cases para Case canônico
-- commercial_offer_id, notification_delivery_date, 15 flags de evidência/infração
-- Migration aditiva, sem DROP/DELETE, IF NOT EXISTS em constraints

-- 1. commercial_offer_id (FK para commercial_offers)
ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS commercial_offer_id uuid;

-- 2. notification_delivery_date (data de entrega da notificação - prazo decadencial)
ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS notification_delivery_date date;

-- 4-18. Flags de evidência/infração (15 campos)
ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS has_previous_infractions_last_12_months boolean;

ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS has_psychomotor_term boolean;

ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS has_agent_detailed_observations boolean;

ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS has_photo_proof boolean;

ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS has_r19_signage_proof boolean;

ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS has_regulatory_sign boolean;

ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS refused_test boolean;

ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS offered_retest boolean;

ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS cellphone_circumstance boolean;

ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS yellow_phase_crossing boolean;

ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS emergency_passage boolean;

ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS real_driver_name text;

ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS real_driver_cpf text;

ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS real_driver_cnh text;

ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS indication_within_deadline boolean;

-- Índices úteis para queries comuns
CREATE INDEX IF NOT EXISTS idx_cases_commercial_offer_id ON public.cases(commercial_offer_id);
CREATE INDEX IF NOT EXISTS idx_cases_notification_delivery_date ON public.cases(notification_delivery_date);

-- Constraint FK para commercial_offer_id (apenas se commercial_offers existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'commercial_offers' AND table_schema = 'public') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'cases_commercial_offer_id_fkey' 
      AND table_name = 'cases'
    ) THEN
      ALTER TABLE public.cases
      ADD CONSTRAINT cases_commercial_offer_id_fkey
      FOREIGN KEY (commercial_offer_id) REFERENCES public.commercial_offers(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;