# FASE 5 — Backup de Segurança para Reconstrução — 2026-09-23

## Resultado

A Fase 5 foi fechada como **CONCLUÍDA COM RESSALVA CONTROLADA**.

O snapshot foi materializado no mesmo projeto Supabase canônico `llmxnpgjpxcvyrqjkfwb`, sem criação de projeto/branch e sem apagar ou truncar produção.

## Evidências verificadas

- 52 tabelas públicas presentes.
- 55 tabelas no schema `recovery_backup_20260923`: 52 tabelas públicas + `auth_users` + `storage_buckets` + `storage_objects`.
- Todas as 52 tabelas públicas possuem correspondente no backup.
- As contagens foram comparadas individualmente nas 52 tabelas e não houve divergência.
- `auth.users`: 4; backup: 4.
- `storage.buckets`: 6; backup: 6.
- `storage.objects`: 8; backup: 8.
- Objetos relevantes: `cases` 60, `user_profiles` 4, `payment_orders` 14, `payment_webhook_events` 2, `app_settings` 28, `marketing_leads` 102, `collection_runs` 45, `editorial_content` 7, `content_versions` 12, `messaging_messages` 14, `e2e_test_results` 36.
- Os 8 objetos físicos existentes estão todos no bucket público `marketing-assets`; seus metadados no catálogo incluem tamanho, MIME e ETag.

## Ressalva do Storage

O conector disponível não fornece uma operação de download/verificação dos bytes do Storage. Uma tentativa de acesso HTTP externa também não foi possível neste ambiente por resolução de DNS.

Portanto, a evidência disponível prova **existência e integridade do catálogo/metadados**, mas não constitui hash/backup independente dos bytes dos 8 arquivos.

Consequência: os objetos do Storage **não serão apagados nem recriados durante a próxima limpeza**. O catálogo e os arquivos existentes serão preservados no projeto canônico.

## Ordem de reconstrução aprovada

A reconstrução deve ocorrer em etapas controladas, sempre preservando os dados do snapshot:

1. **Inventário estrutural final** — tabelas, tipos/enums, sequences, índices, constraints, FKs, views e grants.
2. **Correção da baseline executável** — a baseline estrutural anterior deve ser saneada/validada antes de qualquer DROP. Não executar cegamente o arquivo atual.
3. **Mapeamento de dependências** — determinar ordem de remoção/recriação sem tocar em `auth` nem no Storage físico.
4. **Reconstrução estrutural** — criar schema/tabelas/tipos/índices/constraints.
5. **Objetos de segurança** — functions, triggers, RLS e 153 policies.
6. **Storage** — manter buckets/objetos; reaplicar somente políticas se necessário.
7. **Restauração dos dados** — somente após schema e segurança estarem validados; restaurar a partir de `recovery_backup_20260923`.
8. **Verificação Golden Path** — auth → case → análise → documents/storage → download → delete → isolamento.
9. **Validação de advisors e build/testes**.
10. **Somente depois** remover o schema temporário de backup, após evidência de restauração completa.

## Regra de segurança

A Fase 5 **não autoriza DROP/TRUNCATE** por si só.

A primeira operação destrutiva da reconstrução exige uma fase própria, com checklist de pré-condições concluído e SQL controlado.

## Próxima fase

**FASE 6 — Inventário estrutural final + saneamento da baseline executável**, ainda sem destruição do canônico.


## Resultado

A Fase 5 foi fechada como **CONCLUÍDA COM RESSALVA CONTROLADA**.

O snapshot foi materializado no mesmo projeto Supabase canônico `llmxnpgjpxcvyrqjkfwb`, sem criação de projeto/branch e sem apagar ou truncar produção.

## Evidências verificadas

- 52 tabelas públicas presentes.
- 55 tabelas no schema `recovery_backup_20260923`: 52 tabelas públicas + `auth_users` + `storage_buckets` + `storage_objects`.
- Todas as 52 tabelas públicas possuem correspondente no backup.
- As contagens foram comparadas individualmente nas 52 tabelas e não houve divergência.
- `auth.users`: 4; backup: 4.
- `storage.buckets`: 6; backup: 6.
- `storage.objects`: 8; backup: 8.
- Objetos relevantes: `cases` 60, `user_profiles` 4, `payment_orders` 14, `payment_webhook_events` 2, `app_settings` 28, `marketing_leads` 102, `collection_runs` 45, `editorial_content` 7, `content_versions` 12, `messaging_messages` 14, `e2e_test_results` 36.
- Os 8 objetos físicos existentes estão todos no bucket público `marketing-assets`; seus metadados no catálogo incluem tamanho, MIME e ETag.

## Ressalva do Storage

O conector disponível não fornece uma operação de download/verificação dos bytes do Storage. Uma tentativa de acesso HTTP externa também não foi possível neste ambiente por resolução de DNS.

Portanto, a evidência disponível prova **existência e integridade do catálogo/metadados**, mas não constitui hash/backup independente dos bytes dos 8 arquivos.

Consequência: os objetos do Storage **não serão apagados nem recriados durante a próxima limpeza**. O catálogo e os arquivos existentes serão preservados no projeto canônico.

## Ordem de reconstrução aprovada

A reconstrução deve ocorrer em etapas controladas, sempre preservando os dados do snapshot:

1. **Inventário estrutural final** — tabelas, tipos/enums, sequences, índices, constraints, FKs, views e grants.
2. **Correção da baseline executável** — a baseline estrutural anterior deve ser saneada/validada antes de qualquer DROP. Não executar cegamente o arquivo atual.
3. **Mapeamento de dependências** — determinar ordem de remoção/recriação sem tocar em `auth` nem no Storage físico.
4. **Reconstrução estrutural** — criar schema/tabelas/tipos/índices/constraints.
5. **Objetos de segurança** — functions, triggers, RLS e 153 policies.
6. **Storage** — manter buckets/objetos; reaplicar somente políticas se necessário.
7. **Restauração dos dados** — somente após schema e segurança estarem validados; restaurar a partir de `recovery_backup_20260923`.
8. **Verificação Golden Path** — auth → case → análise → documents/storage → download → delete → isolamento.
9. **Validação de advisors e build/testes**.
10. **Somente depois** remover o schema temporário de backup, após evidência de restauração completa.

## Regra de segurança

A Fase 5 **não autoriza DROP/TRUNCATE** por si só.

A primeira operação destrutiva da reconstrução exige uma fase própria, com checklist de pré-condições concluído e SQL controlado.

## Próxima fase

**FASE 6 — Inventário estrutural final + saneamento da baseline executável**, ainda sem destruição do canônico.
