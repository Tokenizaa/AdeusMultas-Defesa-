# Relatório DBRE — Preparação de FKs e Índice (cases / documents)

**Repositório:** `AdeusMultas-Defesa-` (branch `main`, commit `59fda71`)
**Projeto Supabase (canônico):** `llmxnpgjpxcvyrqjkfwb`
**Data:** 24/10/2026
**Responsável:** Database Reliability Engineer (subagent)

---

## 1. Arquivos inspecionados

### Migrações lidas (supabase/migrations/, 46 arquivos no total)
As migrações mais relevantes para o escopo desta tarefa:

| Arquivo | Conteúdo relevante |
|---------|-------------------|
| `20260908000001_create_cases_table.sql` | Cria `public.cases` com `user_id uuid` (sem FK), colunas sensíveis em texto plano (`client_cpf`, `vehicle_plate`, etc.) + versões `_enc` (bytea/pgcrypto) |
| `20260824164720_create_commercial_catalog.sql` | Cria `public.documents` com `case_id uuid NOT NULL` (sem FK, sem índice) |
| `20260817000002_update_profiles_table.sql` | Tabela `public.user_profiles` (user_id → auth.users, trigger on_auth_user_created) |
| `20260819000001_fix_user_profiles_trigger_and_role_enum.sql` | Recria trigger `on_auth_user_created/on_auth_user_updated`, backfill de perfis a partir de `auth.users` |
| `20260817000003_add_case_indexes.sql` | Índices parciais existentes: `idx_cases_user_id` (WHERE user_id IS NOT NULL), `idx_cases_claim_token`, `idx_cases_claim_token_user_id` |
| `20260921000001_fase_18_auth_rls_storage.sql` | Policies RLS de `documents` (leitura por ownership via cadeia case→user) |
| `20261013000001_security_hardening_and_indexes.sql` | Índices adicionais (não cobre `documents.case_id`) |

### Backup / recovery (supabase/recovery/)
- `BASELINE-20260923.sql` — schema completo reconstruído (50 KB)
- `BASELINE-20260923-POLICIES.sql`, `-FUNCTIONS.sql`, `-TRIGGERS.sql`
- `VERIFY-RECOVERY-BACKUP-20260923.sql` — verificação de integridade (confirma presença de `cases`, `documents`, `user_profiles`, `auth.users`)
- `VERIFY-BASELINE-SECURITY-20260923.sql`

---

## 2. Schema atual (estado real no banco canônico)

### public.cases
- `id uuid PK`
- `user_id uuid` — **sem FK**, índice parcial existente `idx_cases_user_id WHERE user_id IS NOT NULL`
- Colunas sensíveis em texto plano (retrocompatibilidade): `client_cpf`, `vehicle_plate`, `ait_number`, `client_phone`
- Versões criptografadas: `client_cpf_enc`, `vehicle_plate_enc`, `ait_number_enc`, `client_phone_enc` (bytea, pgcrypto, chave fora do banco)

### public.documents
- `id uuid PK DEFAULT gen_random_uuid()`
- `case_id uuid NOT NULL` — **sem FK, sem índice**
- `order_id uuid`, `service_type text`, `status text`, `created_at timestamptz`

### public.user_profiles
- `user_id` (espelho de `auth.users` via trigger `on_auth_user_created`)
- Não tem coluna `id` (usa `user_id` como identificador)

### auth.users
- Tabela de auth do Supabase (não exposta via REST, não acessível diretamente por psql nesta rede)

---

## 3. Verificação de registros órfãos (executada via API REST Supabase)

Não foi possível conectar via `psql` ao PostgreSQL remoto (rede inalcançável) nem usar `supabase db dump` (`SUPABASE_ACCESS_TOKEN` é placeholder). A verificação foi feita via API REST (`service_role`).

### Tabela `documents` — 0 registros
A tabela `documents` está vazia. **Zero órfãos possíveis** para `documents.case_id → cases(id)`.

### Tabela `cases` — 552 registros, 9 com `user_id` preenchido

| cases.id | cases.user_id | Existe em user_profiles (auth.users)? |
|----------|---------------|---------------------------------------|
| 5c200d40-... | 06fa537e-... | ✅ Sim |
| 7fb59de1-... | 0bfb4fcb-... | ✅ Sim |
| 2e43d496-... | 14c403bb-... | ✅ Sim |
| af1da20b-... | 200ee130-... | ✅ Sim |
| 975d729c-... | 635756a1-... | ✅ Sim |
| 57468c1c-... | 83dbc496-... | ✅ Sim |
| b176e1ff-... | 916c19cf-... | ✅ Sim |
| 2958b676-... | d246b823-... | ✅ Sim |
| 85fa4bee-... | ddf52ead-... | ✅ Sim |

**Resultado: zero órfãos.** Todos os 9 `user_id` de `cases` existem em `user_profiles` (espelho de `auth.users` via trigger). Todos os 0 registros de `documents` são triviais.

> **Conclusão:** É seguro criar as FKs. Nenhum dado de cliente precisa ser apagado ou alterado.

---

## 4. Migrações preparadas (arquivos criados, NÃO executados em produção)

### Nova migration: `supabase/migrations/20261024000001_add_fk_cases_user_id_documents_case_id.sql`

Conteúdo (idempotente, não destrutivo):

1. **PASSO 0 — Verificação de órfãos** (DO block, somente leitura):
   - Conta `cases` com `user_id` que não existe em `user_profiles`
   - Conta `documents` com `case_id` que não existe em `cases`
   - Se houver órfãos > 0, lança exceção com mensagem clara e aborta (não apaga dados)

2. **PASSO 1 — FK `cases_user_id_fkey`**:
   ```sql
   ALTER TABLE public.cases
     ADD CONSTRAINT cases_user_id_fkey
     FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
   ```
   - `ON DELETE SET NULL`: o caso é preservado sem dono quando o usuário de auth é removido (coluna nullable)

3. **PASSO 2 — FK `documents_case_id_fkey`**:
   ```sql
   ALTER TABLE public.documents
     ADD CONSTRAINT documents_case_id_fkey
     FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;
   ```
   - `ON DELETE CASCADE`: documentos são removidos com o caso pai (coluna NOT NULL)

4. **PASSO 3 — Índice `idx_documents_case_id`**:
   ```sql
   CREATE INDEX IF NOT EXISTS idx_documents_case_id ON public.documents(case_id);
   ```

5. **Comentários** no banco documentando cada constraint e índice.

### Script de backup (procedimento documentado): `scripts/BACKUP_BEFORE_FK_MIGRATION.md`

Como não há rede para o PostgreSQL remoto neste ambiente, o backup **não pôde ser executado nesta sessão**. O documento contém:
- Comandos `supabase db dump` e `pg_dump` prontos para execução
- Validação de restore em banco temporário
- Script de rollback (DROP CONSTRAINT / DROP INDEX)
- Referência ao backup existente em `supabase/recovery/`

---

## 5. Riscos identificados e mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Não foi possível executar backup direto (rede inalcançável, token placeholder) | Sem snapshot fresco antes da mudança | Executar `supabase db dump` em ambiente com rede e token válido **antes** de aplicar; usar `BASELINE-20260923.sql` como referência |
| `auth.users` não exposta via REST / não acessível via psql | Não foi possível verificar órfãos diretamente contra `auth.users` | Verificação feita contra `user_profiles` (espelho de `auth.users` por trigger `on_auth_user_created`). Todos os 9 user_ids conferem |
| `cases.user_id` tem 543 registros NULL | FK não afeta linhas NULL (permitidas) | Sem impacto — ON DELETE SET NULL só atinge linhas com user_id preenchido |
| `documents.case_id` NOT NULL com ON DELETE CASCADE | Exclusão de caso remove documentos | Comportamento intencional; documentado no comentário da constraint |
| Índice `idx_cases_user_id` já existe (parcial) | Não criar duplicado | Migration não recria este índice (já coberto por `20260817000003_add_case_indexes.sql`) |
| Dados pessoais em texto plano (`client_cpf`, `vehicle_plate`) | LGPD/exposição acidental | Fora do escopo desta migration; já existem versões `_enc` (bytea/pgcrypto). Mascaramento é responsabilidade da camada de aplicação |

---

## 6. Próximos passos (para aplicação em produção)

1. **Backup obrigatório:** Executar `supabase db dump --linked --project-ref llmxnpgjpxcvyrqjkfwb` em ambiente com rede e `SUPABASE_ACCESS_TOKEN` válido. Validar o restore em banco temporário.
2. **Drill de restore:** Restaurar o backup em ambiente isolado e confirmar integridade (RTO mensurado).
3. **Aplicar a migration:** `supabase migrations up` (ou equivalente) com `20261024000001_add_fk_cases_user_id_documents_case_id.sql`.
4. **Verificar pós-aplicação:** Confirmar que as FKs e o índice existem (`information_schema.table_constraints`, `pg_indexes`).
5. **Rollback (sempre que necessário):** Usar o script de DROP CONSTRAINT / DROP INDEX documentado em `scripts/BACKUP_BEFORE_FK_MIGRATION.md`.
6. **Seguinte (fora de escopo desta tarefa):** Criptografar dados pessoais em texto plano (`client_cpf`, `vehicle_plate`, etc.) removendo as colunas plaintext após backfill das versões `_enc`.

---

## 7. Arquivos alterados / criados nesta sessão

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/migrations/20261024000001_add_fk_cases_user_id_documents_case_id.sql` | **Criado** | Migration idempotente: verificação de órfãos + 2 FKs + índice |
| `scripts/BACKUP_BEFORE_FK_MIGRATION.md` | **Criado** | Procedimento de backup, validação e rollback |

**Nenhum arquivo existente foi modificado.** Nenhuma migration destrutiva foi executada. Nenhum registro de cliente foi apagado ou alterado.
