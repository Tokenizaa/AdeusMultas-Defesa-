# FASE 5 — Backup de Segurança para Reconstrução — 2026-09-23

## Objetivo

Preparar a reconstrução no próprio projeto canônico, sem criar projeto/branch com custo adicional e sem apagar o banco antes de existir uma cópia de segurança verificável.

## Estratégia

Foi criada no projeto canônico a estrutura temporária `recovery_backup_20260923`.

Ela contém cópias de dados das 52 tabelas públicas atuais, além de:

- `auth_users`: cópia de `auth.users`
- `storage_buckets`: cópia de `storage.buckets`
- `storage_objects`: cópia de `storage.objects`

Total materializado: 55 tabelas de backup.

## Verificação

Snapshot confirmado no banco:

- Tabelas públicas atuais: 52
- Tabelas no backup: 55
- `auth.users`: 4 registros
- `storage.buckets`: 6 registros
- `storage.objects`: 8 registros
- `cases`: 60 registros
- `user_profiles`: 4 registros
- `payment_orders`: 14 registros

A migration remota criada para registrar esta operação é:

`20260923202505_recovery_backup_20260923`

## Limitação importante

Este backup é um **snapshot de dados dentro do próprio banco**, não um dump físico completo do PostgreSQL.

Ele não copia os bytes físicos dos arquivos armazenados no Storage; copia somente o catálogo `storage.objects` e os metadados dos buckets. Portanto, os 8 objetos devem ser tratados separadamente antes de qualquer limpeza que possa remover seus arquivos.

Também não substitui os baselines estruturais já versionados em `supabase/recovery/`.

## Regra para a próxima fase

**NÃO executar DROP/TRUNCATE ainda.**

Antes da limpeza:

1. validar todos os snapshots;
2. validar os objetos reais do Storage;
3. registrar a correspondência entre backup e baseline;
4. preparar a ordem de reconstrução;
5. somente então executar a limpeza controlada.

## Estado

**FASE 5 — BACKUP E PREPARAÇÃO: EM VALIDAÇÃO.**

Nenhuma tabela de produção foi apagada ou truncada.

| 2026-09-23 | FASE 5 — Fechamento do backup e preparação da reconstrução | **CONCLUÍDA COM RESSALVA CONTROLADA** — snapshot no mesmo canônico validado: 52/52 tabelas públicas com contagens idênticas no backup; 4 auth.users, 6 buckets e 8 storage.objects preservados; metadados dos 8 arquivos registrados. Não foi possível obter verificação independente dos bytes do Storage neste ambiente, portanto nenhum objeto físico será apagado na próxima fase. Criado `supabase/recovery/VERIFY-RECOVERY-BACKUP-20260923.sql` e manifesto com ordem de reconstrução. Nenhum DROP/TRUNCATE executado. **Próxima:** FASE 6 — inventário estrutural final e saneamento da baseline executável. |
