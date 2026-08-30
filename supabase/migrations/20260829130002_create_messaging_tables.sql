-- Migration: create_messaging_tables
-- Created: 2026-08-29
-- Description: Tabelas de persistência do Inbox B2C (contatos, conversas, mensagens).
--   Compatível com o hybrid cache do MessagingService (mapId em metadata).
--   Todos os IDs são uuid PK. FKs com CASCADE. Índices para queries de inbox.

-- ============================================================
-- 1. messaging_contacts (contatos do inbox)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messaging_contacts (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text NOT NULL,
  phone                text,
  email                text,
  channel              text NOT NULL,
  external_id          text NOT NULL,
  avatar_url           text,
  vehicle_plate        text,
  metadata             jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, external_id)
);

CREATE INDEX IF NOT EXISTS idx_messaging_contacts_channel_ext ON public.messaging_contacts (channel, external_id);
CREATE INDEX IF NOT EXISTS idx_messaging_contacts_external ON public.messaging_contacts (external_id);

-- ============================================================
-- 2. messaging_conversations (conversas)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messaging_conversations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id            uuid NOT NULL REFERENCES public.messaging_contacts(id) ON DELETE CASCADE,
  channel               text NOT NULL,
  channel_label         text,
  status                text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','archived')),
  unread_count          integer NOT NULL DEFAULT 0,
  last_message_text     text,
  last_message_at       timestamptz,
  ai_mode               text NOT NULL DEFAULT 'auto' CHECK (ai_mode IN ('auto','copilot','off')),
  metadata              jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messaging_conversations_contact ON public.messaging_conversations (contact_id);
CREATE INDEX IF NOT EXISTS idx_messaging_conversations_channel ON public.messaging_conversations (channel);
CREATE INDEX IF NOT EXISTS idx_messaging_conversations_status ON public.messaging_conversations (status);
CREATE INDEX IF NOT EXISTS idx_messaging_conversations_last_msg ON public.messaging_conversations (last_message_at DESC);

-- ============================================================
-- 3. messaging_messages (mensagens)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messaging_messages (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id       uuid NOT NULL REFERENCES public.messaging_conversations(id) ON DELETE CASCADE,
  channel               text NOT NULL,
  direction             text NOT NULL CHECK (direction IN ('inbound','outbound')),
  sender_id             text NOT NULL,
  sender_name           text NOT NULL,
  text                  text,
  media_url             text,
  media_type            text,
  status                text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','read','failed')),
  external_message_id   text,
  raw_metadata          jsonb,
  metadata              jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messaging_messages_conversation ON public.messaging_messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messaging_messages_created ON public.messaging_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messaging_messages_direction ON public.messaging_messages (direction);

-- RLS desativado (service_role controla acesso via backend)
ALTER TABLE public.messaging_contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messaging_conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messaging_messages DISABLE ROW LEVEL SECURITY;