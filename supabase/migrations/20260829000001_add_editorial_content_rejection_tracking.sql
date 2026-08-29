-- Migration: add_editorial_content_rejection_tracking
-- Created: 2026-08-29
-- Description: Rastreio de rejeição pelo gate de qualidade de imagem (W1 — trilha no conteúdo).
--   - rejection_reason: motivos da rejeição (ex. 'resolution_too_low, blurred')
--   - rejected_at: quando o gate moveu a peça para 'reprovado_qualidade'
-- Aditivo e idempotente (ADD COLUMN IF NOT EXISTS). A coluna status permanece text frouxa
-- (workers usam valores fora da union TS, ex. 'em_revisao'); 'reprovado_qualidade' é aceito.

ALTER TABLE public.editorial_content
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz;