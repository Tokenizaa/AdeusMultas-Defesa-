-- Migration: add_campaign_image_columns
-- Created: 2026-08-29
-- Description: Adiciona colunas de imagem/visual_prompt que faltavam no schema
-- (drift detectado: código inseria image_url/visual_prompt em marketing_campaigns,
--  mas colunas não existiam no schema original ni na migration de audience).
-- P0.3 auditoria: schema não versionado — este migration corrige o drift.

ALTER TABLE public.marketing_campaigns
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS visual_prompt text;

COMMENT ON COLUMN public.marketing_campaigns.image_url IS 'URL da imagem/thumbnail da campanha (para publicação social Meta)';
COMMENT ON COLUMN public.marketing_campaigns.visual_prompt IS 'Prompt de geração de imagem fallback via ComfyUI/Gemini';
