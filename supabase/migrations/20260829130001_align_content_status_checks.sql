-- supabase/migrations/20260829130001_align_content_status_checks.sql
-- Align editorial_content.status CHECK with content_versions.status (7 values)
-- Current editorial_content: rascunho, aprovado_qualidade, agendado, publicado
-- content_versions: draft, em_revisao, aprovado_qualidade, rejeitado, agendado, publicado
-- Target: rascunho, em_revisao, aprovado_qualidade, reprovado_qualidade, agendado, publicado, arquivado

ALTER TABLE public.editorial_content
  DROP CONSTRAINT IF EXISTS editorial_content_status_check;

ALTER TABLE public.editorial_content
  ADD CONSTRAINT editorial_content_status_check
  CHECK (status IN ('rascunho','em_revisao','aprovado_qualidade','reprovado_qualidade','agendado','publicado','arquivado'));