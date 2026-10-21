-- Migration: Setup auth schema (histórico)
-- NOTA DE SEGURANÇA (CRIT-02): A tabela `profiles` (PK genérica `id`,
-- policies `auth.uid() = id` e triggers duplicados sobre auth.users) foi
-- DESCONTINUADA. A tabela canônica de perfis é `user_profiles`, cujo identificador
-- auth é a coluna `user_id` (FK -> auth.users), nunca a PK genérica `id`.
-- Esta migração é mantida apenas como registro histórico; não cria mais a tabela
-- `profiles`, nem as políticas `auth.uid() = id`, nem as funções/triggers
-- handle_new_user/handle_user_update e on_auth_user_created/on_auth_user_updated,
-- que agora são de responsabilidade exclusiva da tabela `user_profiles`
-- (migrações 20260819000001 e 20260817000002).

SET search_path TO public;

-- Intencionalmente sem objetos: user_profiles é a tabela canônica de perfis.
