# Procedimento de Backup — Antes de aplicar migração de FKs (cases/documents)

## Contexto
- Projeto Supabase (canônico): `llmxnpgjpxcvyrqjkfwb`
- Migrações alvo: `supabase/migrations/20261024000001_add_fk_cases_user_id_documents_case_id.sql`
- Branca: `main`, commit `59fda71`
- Nenhuma migração destrutiva será executada em produção. Este script prepara o backup ANTES de qualquer mudança estrutural.

## 1. Pré-requisitos
- Acesso ao Supabase CLI autenticado (`supabase login` com access token válido em `SUPABASE_ACCESS_TOKEN`)
- Rede alcançável ao endpoint do Supabase (o ambiente atual NÃO tem acesso direto ao PostgreSQL remoto: `db.llmxnpgjpxcvyrqjkfwb.supabase.co:5432` é inalcançável)
- psql disponível (`/usr/bin/psql`)

## 2. Backup completo (recomendado antes da migration)

```bash
# Exportar variáveis de ambiente do projeto
export SUPABASE_ACCESS_TOKEN="<seu_token_valido>"
export PGPASSWORD="<senha_do_banco_postgres>"

# Opção A: dump via Supabase CLI (recomendado — inclui schema + dados)
supabase db dump --linked --project-ref llmxnpgjpxcvyrqjkfwb \
  --file "supabase/recovery/backup-pre-fk-$(date +%Y%m%d%H%M%S).sql"

# Opção B: dump direto via psql (se rede estiver disponível)
pg_dump -h db.llmxnpgjpxcvyrqjkfwb.supabase.co \
  -p 5432 -U postgres -d postgres \
  --no-password --verbose \
  -f "supabase/recovery/backup-pre-fk-$(date +%Y%m%d%H%M%S).sql"

# Opção C: dump apenas das tabelas envolvidas (mais rápido)
pg_dump -h db.llmxnpgjpxcvyrqjkfwb.supabase.co \
  -p 5432 -U postgres -d postgres \
  --table=public.cases --table=public.documents --table=auth.users --table=public.user_profiles \
  --no-password --verbose \
  -f "supabase/recovery/backup-pre-fk-cases-documents-$(date +%Y%m%d%H%M%S).sql"
```

## 3. Verificar que o backup foi gerado
```bash
ls -lh supabase/recovery/backup-pre-fk-*.sql
head -20 supabase/recovery/backup-pre-fk-*.sql
```

## 4. (Opcional, se DB local disponível) Validar o restore do backup
```bash
# Criar banco temporário, restaurar o dump e rodar consultas de sanidade
createdb supabase_restore_check
psql -d supabase_restore_check -f supabase/recovery/backup-pre-fk-*.sql
psql -d supabase_restore_check -c "SELECT count(*) FROM public.cases; SELECT count(*) FROM public.documents;"
```

## 5. Rollback (se algo der errado após aplicar a migration)
Como a migration é aditiva (só ADD CONSTRAINT + CREATE INDEX), o rollback é:

```sql
-- Reverter FKs e índice (somente se necessário, APÓS validar impacto)
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_case_id_fkey;
ALTER TABLE public.cases DROP CONSTRAINT IF EXISTS cases_user_id_fkey;
DROP INDEX IF EXISTS public.idx_documents_case_id;
```

**Atenção:** Recriar dados perdidos NÃO é possível via `git revert` em banco stateful. Por isso o backup prévio é obrigatório.

## 6. Nota sobre este ambiente
O PostgreSQL remoto (`db.llmxnpgjpxcvyrqjkfwb.supabase.co:5432`) não é alcançável da rede atual e `SUPABASE_ACCESS_TOKEN` está como placeholder no `.env`. O backup **não pôde ser executado nesta sessão**. Execute o procedimento acima em um ambiente com rede e token válidos antes de aplicar a migration em produção.

## Backup existente na pasta recovery/
- `supabase/recovery/BASELINE-20260923.sql` — schema completo (50 KB)
- `supabase/recovery/BASELINE-20260923-POLICIES.sql` — políticas RLS
- `supabase/recovery/BASELINE-20260923-FUNCTIONS.sql` — funções públicas
- `supabase/recovery/BASELINE-20260923-TRIGGERS.sql` — triggers
- `supabase/recovery/VERIFY-RECOVERY-BACKUP-20260923.sql` — verificação de integridade
