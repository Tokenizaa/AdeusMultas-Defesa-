-- FASE 1.2 CORREÇÃO: Persistir ownership de envelope em Supabase
-- Substitui o Map<envelopeId, {caseId, userId}> em memória que era perdido em restart.
--
-- Problema: server restart → Map vazio → authorizeEnvelope() = false para TODOS os envelopes
-- Solução: user_id no documenso_envelopes permite authorization via query direta ao banco,
-- sobrevivendo a restarts e funcionando em multi-instância.
--
-- BACKFILL de user_id para envelopes históricos:
-- - Join direto via case_id (UUID) → cases.id para registros onde case_id é UUID
-- - Para registros onde case_id é domain ID (case_*): usa domain_to_uuid() para
--   computar o UUID e fazer o join (backward compat com dados antigos)
-- - Registros sem case_id ou caso não encontrado: user_id = NULL (fail closed)
--
-- Namespace UUID v5 = DEFESAI_UUID_NAMESPACE = 6f0a9d2e-8c47-4b3a-9f15-d7e0b2c4a681
-- (mesmo valor de src/server/db/uuid-v5.ts — sincronizado manualmente)

-- 0. Garantir extensão pgcrypto (fornece sha1(), sha256(), digest(), etc.)
-- Supabase já tem pgcrypto habilitado por padrão; IF NOT EXISTS é idempotente.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Adicionar coluna user_id para ownership direto
ALTER TABLE documenso_envelopes
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE;

-- 2. Índice composto para authorization lookups O(1)
CREATE INDEX IF NOT EXISTS idx_documenso_envelopes_envelope_user
ON documenso_envelopes(documenso_envelope_id, user_id);

-- 3. RLS: usuário só vê/manipula envelopes próprios (via user_id direto, não só via cases)
DROP POLICY IF EXISTS "User view own documenso_envelopes" ON documenso_envelopes;
CREATE POLICY "User view own documenso_envelopes" ON documenso_envelopes
    FOR SELECT USING (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 4. service_role para insert/update
DROP POLICY IF EXISTS "Service role insert documenso_envelopes" ON documenso_envelopes;
CREATE POLICY "Service role insert documenso_envelopes" ON documenso_envelopes
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role update documenso_envelopes" ON documenso_envelopes;
CREATE POLICY "Service role update documenso_envelopes" ON documenso_envelopes
    FOR UPDATE USING (auth.role() = 'service_role');

-- 5. BACKFILL user_id para envelopes históricos
--
-- Estratégia de join:
-- (a) case_id é UUID válido → JOIN direto com cases.id
-- (b) case_id é domain ID (case_*) → domain_to_uuid(case_id) para JOIN com cases.id
-- (c) case_id NULL ou sem caso correspondente → user_id = NULL (fail closed seguro)
--
-- NOTA: external_id não é atualizado aqui — não é necessário para authorization
-- (authorizeEnvelope usa documenso_envelope_id + user_id). Records históricos
-- created via webhook têm external_id = domain ID; records novos (pós-correção)
-- têm external_id = UUID por design do API routes.

-- 5a. Função UUID v5 (RFC 4122 §4.3) — espelha domainIdToUuid() do TypeScript
-- Recebe domain ID (ex: 'case_xxx') e devolve UUID v5 determinístico.
--
-- Funções pgcrypto usadas (documentação: https://www.postgresql.org/docs/current/pgcrypto.html):
--   digest(data bytea, type text) → bytea  (SHA-1, retorna bytes crus, não hex string)
--   get_byte(bytea, offset)      → int    (byte individual, 0-255)
--   set_byte(bytea, offset, int) → bytea  (substitui byte individual)
--   decode(text, encoding)       → bytea  (hex string → bytes)
--   encode(bytea, encoding)      → text   (bytes → hex string)
CREATE OR REPLACE FUNCTION domain_to_uuid(domain_id TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    -- DEFESAI_UUID_NAMESPACE: 6f0a9d2e-8c47-4b3a-9f15-d7e0b2c4a681
    ns_hex TEXT := '6f0a9d2e8c474b3a9f15d7e0b2c4a681';
    ns_raw BYTEA;
    name_raw BYTEA;
    sha_bytes BYTEA;      -- 20 bytes crus (SHA-1 output)
    versioned BYTEA;      -- 16 bytes após truncate
    result TEXT;
BEGIN
    -- Converter namespace hex string → bytes crus
    ns_raw := decode(ns_hex, 'hex');
    -- Converter domain ID string → bytes UTF-8
    name_raw := domain_id::BYTEA;
    -- SHA-1 de namespace || name — digest() retorna bytes crus (não hex string)
    sha_bytes := digest(ns_raw || name_raw, 'sha1');
    -- Truncar para 16 bytes e ajustar versão=5 (byte 6) + variante RFC 4122 (byte 8)
    -- Versão 5: nibble superior do byte 6 = 5  → (byte & 15) | 80
    -- Variante RFC 4122: nibble superior do byte 8 = 8  → (byte & 63) | 128
    versioned := substring(sha_bytes, 1, 16);
    versioned := set_byte(versioned, 6, (get_byte(versioned, 6) & 15) | 80);
    versioned := set_byte(versioned, 8, (get_byte(versioned, 8) & 63) | 128);
    -- Converter bytes → hex string → UUID formatado
    result := encode(versioned, 'hex');
    RETURN substr(result, 1, 8)  || '-' ||
           substr(result, 9,  4)  || '-' ||
           substr(result, 13, 4)  || '-' ||
           substr(result, 17, 4)  || '-' ||
           substr(result, 21);
END;
$$;

-- 5b. Backfill (a): registros onde case_id é UUID válido → JOIN direto
UPDATE documenso_envelopes env
SET user_id = c.user_id
FROM cases c
WHERE
    env.user_id IS NULL
    AND env.case_id IS NOT NULL
    -- UUID canônico: 8-4-4-4-12 hex
    AND env.case_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'i
    AND c.id = env.case_id;

-- 5c. Backfill (b): registros onde case_id é domain ID (case_*) → UUID v5 → JOIN
UPDATE documenso_envelopes env
SET user_id = c.user_id
FROM cases c
WHERE
    env.user_id IS NULL
    AND env.case_id IS NOT NULL
    AND env.case_id ~ '^case_'  -- domain ID (não é UUID)
    AND c.id = domain_to_uuid(env.case_id);
