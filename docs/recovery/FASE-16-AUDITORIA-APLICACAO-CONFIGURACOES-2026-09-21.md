# FASE 16 — AUDITORIA DA APLICAÇÃO E CONFIGURAÇÕES

Data: 2026-09-21
Branch: `recovery/sgom-db-reconstruction`

## 1. Resultado da execução

Status: **EXECUTADA — diagnóstico concluído; nenhuma alteração em produção realizada.**

A auditoria foi feita contra:
- código/configuração da branch `recovery/sgom-db-reconstruction`;
- configuração Supabase declarada no repositório;
- projeto Supabase alvo `llmxnpgjpxcvyrqjkfwb`;
- schema, migrations, extensões e Edge Functions do projeto alvo;
- advisors atuais de segurança e performance.

O projeto Supabase alvo está **ACTIVE_HEALTHY**, região `sa-east-1`, PostgreSQL 17.6.1.141.

## 2. Canonicalização encontrada

| Recurso | Estado encontrado | Alvo |
|---|---|---|
| `supabase/config.toml` | `project_id = llmxnpgjpxcvyrqjkfwb` | LLMX |
| `vercel.json` / `SUPABASE_URL` | `https://sgomwklorpzdwdubtmgg.supabase.co` | **Divergente: precisa ser LLMX** |
| `vercel.json` / `VITE_SUPABASE_URL` | `https://sgomwklorpzdwdubtmgg.supabase.co` | **Divergente: precisa ser LLMX** |
| `src/lib/supabase.ts` | cliente usa `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` | LLMX após reconexão controlada |
| `.env.example` | placeholders; contém variáveis Supabase server/client | revisar antes do cutover |
| Banco alvo | ACTIVE_HEALTHY | preservado |

### Conclusão crítica

O repositório contém **duas referências Supabase diferentes**:

1. configuração canônica local: LLMX `llmxnpgjpxcvyrqjkfwb`;
2. configuração Vercel hardcoded: projeto antigo `sgomwklorpzdwdubtmgg`.

Isto impede considerar a configuração de produção canônica neste momento. A correção deve ocorrer somente no fluxo controlado da Fase 17, após validação das variáveis reais da Vercel.

## 3. Cliente Supabase

O cliente encontrado em `src/lib/supabase.ts`:
- importa `createClient` de `@supabase/supabase-js`;
- usa `VITE_SUPABASE_URL`;
- usa `VITE_SUPABASE_ANON_KEY`;
- cria cliente tipado quando as variáveis existem;
- mantém fallback de autenticação local via `localStorage`.

### Risco arquitetural

O fallback local mantém:
- `defesai_auth_session_v1`;
- `defesai_registered_users_v1`;
- usuários e sessão no `localStorage`.

Isso não deve ser tratado como Auth de produção. A Fase 18 deverá canonizar Auth real do Supabase e retirar qualquer caminho que possa mascarar falhas de Auth/RLS.

## 4. Variáveis e segurança

O `.env.example` contém:
- `SUPABASE_URL`;
- `SUPABASE_PROJECT_ID`;
- `SUPABASE_ANON_KEY`;
- `SUPABASE_SERVICE_ROLE_KEY`;
- `SUPABASE_ACCESS_TOKEN`;
- variáveis `VITE_*`.

Foi identificado também `VITE_SUPABASE_SERVICE_ROLE_KEY`.

### Ação obrigatória

`SERVICE_ROLE`/secret key **não pode existir como variável Vite pública nem chegar ao browser**. A Fase 17 deve remover essa possibilidade da configuração efetiva e da documentação de ambiente. Chaves públicas devem ficar limitadas ao cliente; chaves secretas somente no servidor.

## 5. Estado real do banco LLMX

Projeto: `Defesai-AdeusMultas`
Ref: `llmxnpgjpxcvyrqjkfwb`
Status: **ACTIVE_HEALTHY**
Região: `sa-east-1`
PostgreSQL: 17.6.1.141

O banco possui atualmente dezenas de tabelas do domínio reconstruído, incluindo:
- knowledge/RAG;
- user_profiles;
- cases;
- documentos;
- pagamentos;
- pedidos;
- comercial;
- marketing;
- observabilidade;
- Documenso;
- messaging;
- E2E.

As tabelas retornadas pelo catálogo estão sem dados nas consultas de contagem expostas pela API de administração, portanto a auditoria de Fase 16 não presume recuperação de dados históricos apenas pela existência do schema.

## 6. RLS — bloqueadores encontrados

O Supabase reportou **3 tabelas públicas sem RLS**:

- `public.messaging_contacts`
- `public.messaging_conversations`
- `public.messaging_messages`

O advisor classifica isso como **ERROR/CRITICAL** porque essas tabelas estão expostas ao Data API sem proteção de RLS.

**Não foi aplicado SQL automaticamente.**

SQL recomendado pelo advisor, para execução somente em fase própria e após definição das políticas:

```sql
ALTER TABLE "public"."messaging_contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."messaging_conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."messaging_messages" ENABLE ROW LEVEL SECURITY;
```

Não executar isoladamente sem as policies correspondentes, pois habilitar RLS sem policies pode bloquear o acesso legítimo.

## 7. Outros achados de segurança do banco

O advisor identificou:
- 15 tabelas com RLS habilitado mas sem policies;
- 2 funções com `search_path` mutável;
- extensões `vector`, `pg_trgm` e `citext` no schema `public`;
- proteção contra senhas vazadas desabilitada;
- grande quantidade de policies permissivas sobrepostas.

Esses itens entram no mapa da Fase 18/22 e não foram alterados nesta fase.

## 8. Migrations

O projeto possui histórico de migrations até:

`20260914223516 — phase_8_notifications_audit`

O histórico inclui reconstrução de:
- RAG;
- core platform;
- commercial;
- payments;
- integrations/marketing;
- observability;
- RLS;
- storage;
- cases;
- notifications/audit.

A existência das migrations foi validada no projeto LLMX. Não foram aplicadas novas migrations nesta fase.

## 9. Edge Functions

A consulta administrativa retornou **nenhuma Edge Function atualmente registrada** no projeto LLMX.

Isso precisa ser comparado com o código e com a arquitetura esperada antes de qualquer cutover.

## 10. Integrações/configuração

O `.env.example` ainda descreve integrações adicionais:
- NVIDIA;
- 9Router;
- Evolution API;
- PagBank;
- GGPIXAPI;
- Meta;
- Documenso;
- Redis/BullMQ;
- mídia remota/local.

Nesta fase nenhuma credencial foi lida, rotacionada ou gravada.

## 11. Matriz de ação

| Item | Risco | Fase de ação |
|---|---|---|
| Vercel aponta para projeto antigo | CRÍTICO | 17 |
| Cliente frontend depende de VITE Supabase | ALTO | 17/18 |
| Fallback Auth em localStorage | ALTO | 18 |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` documentada | CRÍTICO | 17 |
| 3 tabelas públicas sem RLS | CRÍTICO | 18 |
| 15 tabelas com RLS sem policies | ALTO | 18 |
| Policies permissivas sobrepostas | ALTO | 18/22 |
| search_path mutável em 2 funções | MÉDIO | 18/22 |
| Edge Functions ausentes | MÉDIO | 17/20 |
| Integrações externas ainda declarativas | MÉDIO | 20 |
| Dados históricos não comprovados pela auditoria | CRÍTICO para cutover | 19/22 |

## 12. Critério de saída

A Fase 16 **não autoriza cutover**.

Ela entrega o mapa dos principais pontos de reconexão e identifica o bloqueador mais importante para a Fase 17:

> **O código local está apontando para LLMX, mas o `vercel.json` ainda contém o projeto antigo `sgomwklorpzdwdubtmgg`.**

Portanto, a próxima execução deve ser a **Fase 17 — Reconexão controlada ao LLMX**, começando pela inspeção/ajuste das variáveis de ambiente da Vercel e validação do runtime, sem alterar schema ou dados do LLMX.

## Regra preservada

Nenhuma tabela, migration, policy, credencial, produção ou dado do LLMX foi alterado durante esta auditoria.
