-- ============================================================================
-- Migration: Add FKs + index for cases.user_id and documents.case_id
-- Contexto (auditoria anterior):
--   * cases.user_id SEM foreign key para auth.users
--   * documents.case_id SEM foreign key para cases
--   * documents.case_id SEM índice
-- Princípios aplicados (DBRE):
--   * NÃO destrutivo: nenhum DROP/DELETE de dados
--   * Não apaga nem altera registros de clientes
--   * Verifica órfãos ANTES de criar FK; se houver, falha com mensagem clara
--   * Idempotente: usa IF NOT EXISTS / DO blocks para ser reaplicável com segurança
--   * Apenas prepara arquivos SQL — não executa em produção diretamente
-- ============================================================================

SET search_path TO public;

-- ---------------------------------------------------------------------------
-- PASSO 0: Verificação de órfãos (somente leitura, não destrutivo)
-- Executa ANTES de criar qualquer FK. Se encontrar órfãos, aborta com exceção
-- para que a resolução seja feita manualmente — nunca apagando dados de cliente.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  orphan_cases INTEGER;
  orphan_documents INTEGER;
BEGIN
  -- cases.user_id que não existe em user_profiles (espelho de auth.users via trigger on_auth_user_created)
  SELECT COUNT(*) INTO orphan_cases
  FROM public.cases c
  WHERE c.user_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.user_profiles up WHERE up.user_id = c.user_id
    );

  -- documents.case_id que não existe em cases
  SELECT COUNT(*) INTO orphan_documents
  FROM public.documents d
  WHERE NOT EXISTS (
    SELECT 1 FROM public.cases c WHERE c.id = d.case_id
  );

  IF orphan_cases > 0 OR orphan_documents > 0 THEN
    RAISE EXCEPTION
      'Órfãos encontrados antes de criar FKs: cases=% documentos=%. '
      'Não remova nem altere registros de clientes para fazer a migração passar. '
      'Investigue a origem dos órfãos e resolva manualmente antes de aplicar esta migration.',
      orphan_cases, orphan_documents;
  END IF;

  RAISE NOTICE 'Verificação de órfãos concluída: cases=% documentos=% (zero órfãos esperado).',
    orphan_cases, orphan_documents;
END $$;

-- ---------------------------------------------------------------------------
-- PASSO 1: FK cases.user_id -> auth.users(id) ON DELETE SET NULL
--   cases.user_id é nullable, então ON DELETE SET NULL preserva o caso
--   quando o usuário de auth é removido.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
     AND tc.table_schema = ccu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'cases'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.column_name = 'user_id'
  ) THEN
    ALTER TABLE public.cases
      ADD CONSTRAINT cases_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  ELSE
    RAISE NOTICE 'FK cases_user_id_fkey já existe em public.cases; pulando criação.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- PASSO 2: FK documents.case_id -> cases(id) ON DELETE CASCADE
--   documents.case_id é NOT NULL. ON DELETE CASCADE remove os documentos
--   quando o caso pai é excluído (mantém integridade referencial).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
     AND tc.table_schema = ccu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'documents'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.column_name = 'case_id'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_case_id_fkey
      FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;
  ELSE
    RAISE NOTICE 'FK documents_case_id_fkey já existe em public.documents; pulando criação.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- PASSO 3: Índice idx_documents_case_id
--   documents.case_id não tem índice. O índice suporta:
--   * JOIN documents -> cases (busca de documentos de um caso)
--   * Verificação da FK na exclusão de cases
--   * Consultas de listagem de documentos por caso
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_documents_case_id ON public.documents(case_id);

-- ---------------------------------------------------------------------------
-- COMENTÁRIOS (documentação no próprio banco)
-- ---------------------------------------------------------------------------
COMMENT ON CONSTRAINT cases_user_id_fkey ON public.cases IS
  'FK para auth.users(id). ON DELETE SET NULL: o caso é preservado sem dono quando o usuário de auth é removido.';
COMMENT ON CONSTRAINT documents_case_id_fkey ON public.documents IS
  'FK para cases(id). ON DELETE CASCADE: documentos são removidos com o caso pai.';
COMMENT ON INDEX idx_documents_case_id IS
  'Índice em documents.case_id para JOIN com cases e integridade da FK ON DELETE CASCADE.';
