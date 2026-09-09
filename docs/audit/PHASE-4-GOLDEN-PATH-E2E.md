# FASE 4 — GOLDEN PATH E2E — RESULTADO DE EXECUÇÃO

**Data:** 2026-09-09  
**Ambiente-alvo:** produção Vercel — `https://www.defesai.shop`  
**Supabase canônico:** `sgomwklorpzdwdubtmgg`

## Veredito

**🔴 BLOQUEADA — Golden Path não comprovado em produção.**

A Fase 4 foi iniciada com verificação do ambiente de produção e reconciliação do banco canônico. A jornada completa não pode ser declarada executada/aprovada porque não existe, nesta sessão, uma execução Playwright de produção concluída com criação real de caso → análise → PIX → pagamento confirmado → documento persistido.

## Evidências confirmadas

### 1. Produção está acessível

`GET /api/health` em `https://www.defesai.shop` respondeu HTTP 200 em 2026-09-09.

A resposta identifica o serviço como `DefesAi API` e a política CSP ativa referencia o Supabase canônico `sgomwklorpzdwdubtmgg.supabase.co`.

### 2. O banco canônico não contém resultado de Golden Path

Consulta direta ao Supabase canônico retornou:

| Entidade | Registros |
|---|---:|
| `cases` | 9 |
| `payment_orders` | 0 |
| `payment_attempts` | 0 |
| `payments` | 0 |
| `documents` | 0 |

Também foi verificado que os casos existentes não possuem `payment_order` nem `document` associados. Portanto não há evidência de uma jornada vertical já concluída no banco canônico.

### 3. O teste de produção está definido para ser real

`tests/golden-path-production.spec.ts` executa contra `PLAYWRIGHT_BASE_URL`, autentica com credenciais externas, cria dados sintéticos únicos, realiza upload real, aguarda análise do backend, cria PIX no gateway configurado, reconcilia `payment_orders`, aguarda estado pago e exige documento persistido em `documents`.

O workflow `.github/workflows/golden-path-production.yml` está configurado para produção, exige o projeto Playwright `chromium-production` e executa especificamente `tests/golden-path-production.spec.ts`.

## Bloqueio de execução

O workflow de Golden Path é deliberadamente `workflow_dispatch`/`workflow_call`; não existe nesta integração uma operação disponível para disparar manualmente um workflow. O ambiente local desta sessão também não possui `agent-browser`, nem as variáveis externas de execução (`E2E_TEST_EMAIL`/`USER_TEST_LOGIN` e `E2E_TEST_PASSWORD`/`USER_TEST_PASSWORD`).

Consequentemente, **não foi fabricada uma aprovação** e nenhum pagamento/documento foi inserido artificialmente no banco para simular sucesso.

## Evidência CI anterior

Os check-runs recentes relacionados ao Golden Path ficaram `skipped`, enquanto validações unitárias falharam antes de produzir evidência funcional do caminho completo. Isso não constitui aprovação E2E.

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

Nenhum estado `ready`, `paid` ou `document` deve ser aceito somente por UI ou fixture.
