-- FASE 1.2 CORREÇÃO: Persistir ownership de envelope em Supabase
-- Substitui o Map<envelopeId, {caseId, userId}> em memória que era perdido em restart.
--
-- Problema: server restart → Map vazio → authorizeEnvelope() = false para TODOS os envelopes
-- Solução: user_id no documenso_envelopes permite authorization via query direta ao banco,
-- sobrevivendo a restarts e funcionando em multi-instância.

-- 1. Adicionar coluna user_id para ownership direto
ALTER TABLE documenso_envelopes
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE;

-- 2. Índice composto para authorization lookups O(1) — evita JOIN com cases
-- Busca: "este envelope pertence a este usuário?"
CREATE INDEX IF NOT EXISTS idx_documenso_envelopes_envelope_user
ON documenso_envelopes(documenso_envelope_id, user_id);

-- 3. Tighten RLS: usuário só vê/manipula envelopes próprios (via user_id direto, não só via cases)
-- Replica a lógica de cases: admin bypass, fail closed para NULL user_id
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

-- 4. Permitir INSERT via service_role (webhook handler + API routes)
DROP POLICY IF EXISTS "Service role insert documenso_envelopes" ON documenso_envelopes;
CREATE POLICY "Service role insert documenso_envelopes" ON documenso_envelopes
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- 5. Permitir UPDATE via service_role
DROP POLICY IF EXISTS "Service role update documenso_envelopes" ON documenso_envelopes;
CREATE POLICY "Service role update documenso_envelopes" ON documenso_envelopes
    FOR UPDATE USING (auth.role() = 'service_role');
