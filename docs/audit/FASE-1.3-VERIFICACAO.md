# FASE 1.3 — Storage / Buckets / Policies — Verificação

## Veredito

**VERIFIED — 100% da subfase 1.3 concluída.**

## Projeto Supabase

- Project ref: `llmxnpgjpxcvyrqjkfwb`
- Migração aplicada no banco: `storage_access_policies_baseline`
- Migração versionada no repositório: `supabase/migrations/20260905000002_storage_access_policies_baseline.sql`

## Buckets reais validados

| Bucket | Público | Limite | MIME | Objetos |
|---|---:|---:|---|---:|
| `ai-policy` | não | 20 MB | PDF, Markdown, TXT | 0 |
| `lgpd-exports` | não | 50 MB | PDF, JSON | 0 |
| `marketing-assets` | sim | 50 MB | PNG, JPEG, WebP, MP4 | 8 |
| `skill-assets` | não | 5 MB | sem restrição MIME | 0 |
| `whatsapp-media` | não | 50 MB | sem restrição MIME | 0 |

## RLS real validado

`storage.objects` está com RLS habilitado e possui 8 políticas explícitas:

- `Public read marketing assets`
- `Admin insert marketing assets`
- `Admin update marketing assets`
- `Admin delete marketing assets`
- `Admin read ai policy assets`
- `Admin read lgpd exports`
- `Admin read skill assets`
- `Admin read whatsapp media`

### Modelo de acesso

- `marketing-assets`: leitura pública; escrita, alteração e remoção somente para `user_profiles.role = 'admin'` quando usando sessão autenticada.
- Buckets privados: leitura somente para administradores autenticados; backend continua usando `service_role`, que bypassa RLS.
- Nenhum acesso genérico para `authenticated` foi criado.
- Nenhuma política baseada em `owner_id` foi inventada para buckets sem fluxo de ownership comprovado no código.

## Dados existentes

Os 8 objetos existentes pertencem exclusivamente a `marketing-assets`, são PNGs e estão sem `owner_id`. Isso é compatível com o caráter público/compartilhado desse bucket.

Os quatro buckets privados não possuem objetos históricos; portanto não há backfill de ownership pendente nesta subfase.

## Código

O uso confirmado de `marketing-assets` está no fluxo de publicação do Marketing OS, que referencia os objetos por URL pública do Supabase Storage. Não foi encontrado fluxo de usuário final no repositório que justifique abrir acesso aos buckets privados.

## Critérios de fechamento

- [x] Buckets reais inventariados
- [x] Configuração real validada
- [x] RLS de `storage.objects` habilitado
- [x] Políticas explícitas por bucket/operação
- [x] Bucket público limitado a `marketing-assets`
- [x] Escrita pública/anônima não permitida
- [x] Buckets privados não expostos a usuários comuns
- [x] Objetos históricos avaliados
- [x] Migração versionada no Git
- [x] Migração aplicada no Supabase real
- [x] Evidência persistida em documentação de auditoria

## Próxima subfase

**FASE 1.4 — Nome / caminho / isolamento.**
