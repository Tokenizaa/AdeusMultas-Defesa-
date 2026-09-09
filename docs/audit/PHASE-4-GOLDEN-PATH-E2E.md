# FASE 4 — GOLDEN PATH E2E — RESULTADO DE EXECUÇÃO

**Data:** 2026-09-09  
**Ambiente-alvo:** produção Vercel — `https://www.defesai.shop`  
**Supabase canônico:** `sgomwklorpzdwdubtmgg`

## Veredito

**🔴 BLOQUEADA — Golden Path não comprovado em produção.**

A Fase 4 foi executada nesta rodada até o limite verificável pela integração disponível. O ambiente de produção foi recuperado para um deployment `READY`, mas a jornada vertical completa não pode ser declarada executada/aprovada porque não existe evidência de uma execução Playwright de produção concluída com criação real de caso → análise → PIX → pagamento confirmado → documento persistido.

## Evidências confirmadas

### 1. Produção está acessível e foi recuperada

`GET /api/health` em `https://www.defesai.shop` respondeu HTTP 200 após o novo deployment de produção `dpl_DVXqj5PYNjwHGzq4myEQuT9ykusN`.

O deployment foi criado a partir do commit `8aa42558986071828d75c53dd5f8ac40e13d7d0a` e terminou em estado `READY`, com os aliases de produção `www.defesai.shop`, `adeusmultas.defesai.shop`, `adeusmultasdefesai.vercel.app` e `defesai.shop`.

A resposta identifica o serviço como `DefesAi API` e a política CSP ativa referencia o Supabase canônico `sgomwklorpzdwdubtmgg.supabase.co`.

### 2. Bloqueador de build corrigido

O deployment anterior falhava no `bun install` porque `package.json` declarava `ioredis@^6.3.4`, enquanto o registro npm atualmente publica `ioredis` 6.0.0 como versão estável da linha 6. O `bun.lock` já estava alinhado em `ioredis@^6.0.0`.

A correção foi aplicada no `package.json` e commitada em:

`8aa42558986071828d75c53dd5f8ac40e13d7d0a`

O novo deployment concluiu build e deploy com sucesso. O warning de chunk JavaScript grande não bloqueou a publicação.

### 3. Rotas de produção respondem

`GET /novo-caso` respondeu HTTP 200 e entregou o bundle atual de produção.

`GET /api/health` respondeu HTTP 200.

### 4. O banco canônico não contém resultado de Golden Path

Consulta direta ao Supabase canônico confirmou:

| Entidade | Registros |
|---|---:|
| `cases` | 9 |
| `payment_orders` | 0 |
| `documents` | 0 |

Os casos existentes verificados não apresentam `payment_order` nem `document` associados. Não foi encontrado no banco canônico um encadeamento vertical completo que pudesse ser reutilizado como evidência.

### 5. O teste de produção está definido para ser real

`tests/golden-path-production.spec.ts` executa contra `PLAYWRIGHT_BASE_URL`, autentica com credenciais externas, cria dados sintéticos únicos, realiza upload real, aguarda análise do backend, cria PIX no gateway configurado, reconcilia `payment_orders`, aguarda estado pago e exige documento persistido em `documents`.

O workflow `.github/workflows/golden-path-production.yml` está configurado para produção, exige o projeto Playwright `chromium-production` e executa especificamente `tests/golden-path-production.spec.ts`.

## Bloqueio de execução E2E

O workflow de Golden Path é deliberadamente `workflow_dispatch`/`workflow_call`; a integração GitHub disponível nesta sessão não oferece disparo manual de workflow. O ambiente local desta sessão também não fornece um executor Playwright de produção utilizável nem as variáveis externas de execução (`E2E_TEST_EMAIL`/`USER_TEST_LOGIN` e `E2E_TEST_PASSWORD`/`USER_TEST_PASSWORD`).

Consequentemente, **não foi fabricada uma aprovação** e nenhum pagamento/documento foi inserido artificialmente no banco para simular sucesso.

## P0/P1 ainda abertos

1. Executar Playwright real em produção com conta E2E externa disponível.
2. Criar e reconciliar `payment_order` + `payment_attempt` reais.
3. Confirmar o PIX real pelo gateway, sem simulação.
4. Gerar e persistir efetivamente o documento em Storage + `documents.document_url`/`storage_path`.
5. Reconciliar os IDs reais de caso, análise, pagamento e documento após a jornada.
6. Cobrir o caminho de recuperação quando pagamento confirmado não produz documento.

## Critério de saída da Fase 4

A Fase 4 permanece **🔴 BLOQUEADA** até existir uma execução concluída cujo relatório contenha os IDs reais de:

- `cases.id`
- identidade/versionamento da análise
- `payment_orders.id` e/ou `payment_attempts.id`
- `documents.id`
- evidência do documento persistido no Storage

Nenhum estado `ready`, `paid` ou `document` deve ser aceito somente por UI, fixture ou inserção direta no banco.
