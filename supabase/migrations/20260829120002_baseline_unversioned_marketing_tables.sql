-- Migration: baseline_unversioned_marketing_tables
-- Created: 2026-08-29
-- Description: P1.11 — tabelas criadas fora do versionamento no repo local.
--   editorial_content, meta_accounts, app_settings: sem baseline em migrations/ NEM no
--     histórico remoto (criadas via dashboard/manual). content_versions, publisher_jobs,
--     meta_tokens: têm baseline no histórico remoto (create_content_versions_table,
--     create_publisher_jobs_table, create_meta_tokens_table) mas os ARQUIVOS faltam no repo local.
--   Fix: baseline IDEMPOTENTE (CREATE TABLE IF NOT EXISTS) reconstruído DO SCHEMA REAL
--     (information_schema + pg_constraint + pg_indexes do projeto Defesai-AdeusMultas).
--     Em ambientes com as tabelas vivas, vira no-op (IF NOT EXISTS). Em deploy fresco
--     construído do repo local, cria as tabelas completas. Não toca dados existentes.
--   ⚠️ NOTA: meta_accounts.access_token e meta_tokens.access_token em plaintext (comportamento
--     existente preservado; recomendação de rotação/criptografia fica para @seguranca).
--   ⚠️ CHECKs reproduzidos FIÉIS ao schema real. editorial_content.status_check só permite
--     4 valores no DB real (rascunho/aprovado_qualidade/agendado/publicado) — workers que
--     escrevem 'em_revisao'/'reprovado_qualidade' quebrariam hoje; conflito de contrato
--     registrado na auditoria (§9) — decisão de convergência = @supervisor.

-- ============================================================
-- 1. editorial_content (conteúdo editorial B2C social)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.editorial_content (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                text NOT NULL,
  channel              text NOT NULL CHECK (channel IN ('instagram','blog','tiktok','linkedin','email')),
  format               text NOT NULL CHECK (format IN ('carrossel','artigo_seo','reels_roteiro','infografico','newsletter')),
  legal_theme          text,
  infraction_target_code text,
  status               text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','aprovado_qualidade','agendado','publicado')),
  scheduled_date       timestamptz,
  estimated_reach      integer NOT NULL DEFAULT 0,
  copy_text            text,
  hashtags             text[] NOT NULL DEFAULT '{}'::text[],
  visual_prompt        text,
  author_agent         text NOT NULL DEFAULT 'estrategico',
  quality_review_score numeric CHECK (quality_review_score IS NULL OR (quality_review_score >= 0 AND quality_review_score <= 100)),
  meta_post_id         text,
  published_at         timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  campaign_id          uuid REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  image_url            text,
  image_asset_id       text,
  video_url            text,
  video_asset_id       text,
  media_type           text CHECK (media_type IN ('image','video','carousel','reel')),
  format_detail        text,
  generation_engine    text NOT NULL DEFAULT 'google_genai',
  generation_status    text DEFAULT 'pending' CHECK (generation_status IN ('pending','processing','completed','failed','blocked')),
  generation_error     text,
  mime_type            text,
  width                integer,
  height               integer,
  duration_secs        numeric,
  scheduled_at         timestamptz,
  approved_by          uuid,
  approved_at          timestamptz,
  meta_album_id        text,
  facebook_post_id     text,
  instagram_post_id    text,
  external_status      text,
  external_error       text,
  caption              text,
  cta                  text,
  rejection_reason     text,
  rejected_at          timestamptz
);

CREATE INDEX IF NOT EXISTS idx_editorial_channel ON public.editorial_content (channel);
CREATE INDEX IF NOT EXISTS idx_editorial_content_campaign ON public.editorial_content (campaign_id);
CREATE INDEX IF NOT EXISTS idx_editorial_content_scheduled ON public.editorial_content (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_editorial_content_status ON public.editorial_content (status);
CREATE INDEX IF NOT EXISTS idx_editorial_status ON public.editorial_content (status, scheduled_date);

-- ============================================================
-- 2. content_versions (histórico de versões do conteúdo)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.content_versions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id     uuid NOT NULL REFERENCES public.editorial_content(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  title          text,
  copy_text      text,
  visual_prompt  text,
  hashtags       text[],
  image_url      text,
  video_url      text,
  status         text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','em_revisao','aprovado_qualidade','rejeitado','agendado','publicado')),
  review_notes   text,
  reviewed_by    uuid,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  UNIQUE (content_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_content_versions_content ON public.content_versions (content_id);

-- ============================================================
-- 3. publisher_jobs (fila/publicação Meta)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.publisher_jobs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id       uuid NOT NULL REFERENCES public.editorial_content(id) ON DELETE CASCADE,
  channel          text NOT NULL CHECK (channel IN ('facebook','instagram','both')),
  destination      text NOT NULL,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','published','failed','blocked','retry')),
  attempt_count    integer NOT NULL DEFAULT 0,
  max_attempts     integer NOT NULL DEFAULT 3,
  scheduled_at     timestamptz,
  published_at     timestamptz,
  external_post_id text,
  external_url     text,
  external_status  text,
  external_error   text,
  job_payload      jsonb,
  error_detail     text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_publisher_jobs_content ON public.publisher_jobs (content_id);
CREATE INDEX IF NOT EXISTS idx_publisher_jobs_scheduled ON public.publisher_jobs (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_publisher_jobs_status ON public.publisher_jobs (status);

-- ============================================================
-- 4. meta_accounts (conexão Meta persistida por usuário)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.meta_accounts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_connected          boolean NOT NULL DEFAULT false,
  meta_user_id          text,
  meta_user_name        text,
  meta_user_email       text,
  pages                 jsonb NOT NULL DEFAULT '[]'::jsonb,
  selected_page_id      text,
  selected_instagram_id text,
  access_token          text,
  token_expires_at      timestamptz,
  connected_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- ============================================================
-- 5. meta_tokens (tokens de página Meta)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.meta_tokens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id      text NOT NULL UNIQUE,
  page_name    text,
  access_token text NOT NULL,
  token_type   text DEFAULT 'page',
  expires_at   timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meta_tokens_expires_at ON public.meta_tokens (expires_at);

-- ============================================================
-- 6. app_settings (settings de aplicação — drift idêntico)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
  key         text PRIMARY KEY,
  category    text NOT NULL DEFAULT 'platform' CHECK (category IN ('platform','ai','pricing','promotions','referrals','payments','marketing','integrations','feature_flags')),
  value       jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  is_public   boolean NOT NULL DEFAULT false,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  text
);