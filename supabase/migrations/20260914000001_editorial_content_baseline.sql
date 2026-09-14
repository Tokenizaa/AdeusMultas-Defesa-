-- 2026-09-14 — editorial_content baseline (aplicada via MCP em sgomwklorpzdwdubtmgg)
-- Cria tabelas de marketing (editorial_content + marketing_campaigns) que não existiam
-- no banco real. Idempotente. Suporta tipos post/reels/story e canal facebook.

CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    status text NOT NULL DEFAULT 'draft',
    goal text,
    platform text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.editorial_content (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    channel text NOT NULL CHECK (channel IN ('instagram','facebook','blog','tiktok','linkedin','email')),
    format text NOT NULL CHECK (format IN ('carrossel','artigo_seo','reels_roteiro','infografico','newsletter','post','post_imagem','reel','story')),
    legal_theme text,
    infraction_target_code text,
    status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','aprovado_qualidade','agendado','publicado')),
    scheduled_date timestamptz,
    estimated_reach integer NOT NULL DEFAULT 0,
    copy_text text,
    hashtags text[] NOT NULL DEFAULT '{}'::text[],
    visual_prompt text,
    author_agent text NOT NULL DEFAULT 'estrategico',
    quality_review_score numeric,
    meta_post_id text,
    published_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    campaign_id uuid REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
    image_url text,
    image_asset_id text,
    video_url text,
    video_asset_id text,
    media_type text CHECK (media_type IN ('image','video','carousel','reel','story')),
    format_detail text,
    generation_engine text NOT NULL DEFAULT 'nvidia_nim',
    generation_status text DEFAULT 'pending',
    generation_error text,
    mime_type text,
    width integer,
    height integer,
    duration_secs numeric,
    scheduled_at timestamptz,
    approved_by uuid,
    approved_at timestamptz,
    facebook_post_id text,
    instagram_post_id text,
    external_status text,
    external_error text,
    caption text,
    cta text,
    rejection_reason text,
    rejected_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_editorial_channel ON public.editorial_content (channel);
CREATE INDEX IF NOT EXISTS idx_editorial_content_campaign ON public.editorial_content (campaign_id);
CREATE INDEX IF NOT EXISTS idx_editorial_content_scheduled ON public.editorial_content (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_editorial_content_status ON public.editorial_content (status);

ALTER TABLE public.editorial_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;