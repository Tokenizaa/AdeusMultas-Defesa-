-- Migration: add_audience_segmentation_and_opt_out
-- Created: 2026-08-29
-- Description: Segmentação B2C/B2B como dado de primeira classe (P0.3 auditoria) + opt-out LGPD (P3.2).
--   audience: público macro 'B2C'|'B2B' em editorial_content, marketing_campaigns, marketing_leads.
--     text + CHECK (padrão do projeto — sem enum; únicos enums públicos hoje: user_role).
--     NOT NULL DEFAULT 'B2C' faz backfill das linhas existentes (7 peças editorial, 8 campanhas, 97 leads);
--     DROP DEFAULT a seguir torna o valor OBRIGATÓRIO para novas inserções (sem fallback que misture,
--     critério de aceite da auditoria). INSERT paths devem passar audience explicitamente.
--   opt_out_at: timestamp de opt-out em marketing_leads (NULL = ativo). Mínimo para @backend
--     não enviar a quem opt-out. Frequência global por número (P3.3) fica gap — depende de decisão
--     de router/gov (@supervisor). opt_out_reason: não adicionado (mínimo necessário).
-- Aditivo e idempotente.

ALTER TABLE public.editorial_content
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'B2C'
    CONSTRAINT editorial_content_audience_check CHECK (audience IN ('B2C','B2B'));

ALTER TABLE public.editorial_content
  ALTER COLUMN audience DROP DEFAULT;

ALTER TABLE public.marketing_campaigns
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'B2C'
    CONSTRAINT marketing_campaigns_audience_check CHECK (audience IN ('B2C','B2B'));

ALTER TABLE public.marketing_campaigns
  ALTER COLUMN audience DROP DEFAULT;

ALTER TABLE public.marketing_leads
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'B2C'
    CONSTRAINT marketing_leads_audience_check CHECK (audience IN ('B2C','B2B'));

ALTER TABLE public.marketing_leads
  ALTER COLUMN audience DROP DEFAULT;

ALTER TABLE public.marketing_leads
  ADD COLUMN IF NOT EXISTS opt_out_at timestamptz;