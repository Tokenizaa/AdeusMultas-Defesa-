-- Migration FASE 18 (follow-up) — versiona RLS de messaging_contacts/conversations
-- Repo: Tokenizaa/AdeusMultas-Defesa- | Supabase canônico: llmxnpgjpxcvyrqjkfwb
-- Data: 2026-09-21
-- Princípio: aditivo e idempotente. NADA destrutivo. Preserva fluxos existentes.
--
-- Contexto:
--   A migration 20260829130002_create_messaging_tables.sql criava as 3 tabelas
--   de messaging com RLS DISABLED. A 20260921000001_fase_18_auth_rls_storage.sql
--   reabilitou RLS apenas em messaging_messages. contacts/conversations foram
--   habilitadas fora da migration (via MCP durante FASE 18) — drift: re-executar
--   migrations a partir do repo recriaria as 2 tabelas SEM RLS.
--
--   Esta migration versiona o estado real do banco para replay idempotente
--   (supabase db reset / recreate). Sem policies — deny-all intencional:
--   acesso exclusivo service_role; zero policies = anon/authenticated bloqueados,
--   coerente com messaging_messages (0001).

-- ============================================================
-- messaging_contacts / messaging_conversations: RLS ON deny-all
--    Idempotente: ENABLE é no-op quando já habilitado.
-- ============================================================
ALTER TABLE public.messaging_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messaging_conversations ENABLE ROW LEVEL SECURITY;