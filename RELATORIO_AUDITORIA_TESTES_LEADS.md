# Relatório de Auditoria — Cobertura de Testes e Qualidade (Captação de Leads B2C/B2B)

**Projeto:** DefesAi  
**Branch:** `main`  
**SHA atual:** `41dd4a8 fix(auth): remove insert manual user_profiles — trigger handle_new_user() já cria [DEPLOY-PRODUCTION]`  
**Estado da árvore de trabalho:** há modificações não commitadas na área de gateway de pagamentos (ggpix-adapter.ts deletado, pagbank-adapter.ts deletado, gateway-manager/index/types/webhook-handler modificados, venopag-adapter.ts novo).  
**Auditor:** Test Automation Engineer (especialista E2E/Playwright/Cypress)  
**Data:** 21/10/2026

---

## 1. Resumo Executivo (PASS / FAIL / BLOCKED por área)

| Área | Status | Motivo principal |
|------|--------|------------------|
| Testes de unidade/integração (vitest) | **PASS (com ressalva)** | 167 testes verdes em 24 arquivos; `cloudflare/routes/payments.test.ts` não carrega (módulo `ggpix-adapter` deletado na árvore de trabalho) |
| Testes de endpoints de captação de leads | **FAIL** | Vários endpoints críticos sem teste (webhooks Meta/PagBank/VenoPag/GGPIX, onboarding-v2, scrape, commercial leads) |
| Testes de webhook HMAC | **PARCIAL** | PagBank e VenoPag cobertos (cloudflare). WhatsApp Evolution coberto (integração + unidade). GGPIX não tem teste de assinatura |
| Testes de idempotência de pagamento | **PARCIAL** | PagBank: teste de `isDuplicate` existe (cloudflare). VenoPag/GGPIX: idempotência delegada ao repository, sem teste de endpoint |
| Fluxo E2E cadastro→onboarding→checkout | **BLOCKED** | Suíte E2E canônica (70 cenários) definida em docs/testing mas **não implementada**. playwright.config.ts aponta apenas para `tests/e2e-reconstruction` (7 specs de recursos de trânsito, não leads) |
| Fluxo B2B scraping→lead→campanha→whatsapp | **FAIL** | scrape-worker, marketing-automation worker, meta-publisher têm testes parciais; não há E2E do fluxo completo |
| Qualidade TypeScript (tsc --noEmit) | **FAIL** | 2 erros na área de gateway (import de `ggpix-adapter` deletado; tipo de resposta incompatível em venopag-adapter.ts) |
| Testes de frontend (AuthPageView, SharedAuthForm, OnboardingWizard, CheckoutView) | **FAIL** | Zero testes de componente/frontend encontrados |
| Testes de LGPD (opt-out/consentimento) | **PARCIAL** | Apenas `opt_out_at` unitário em eligibility.test.ts; nenhum teste de endpoint de opt-out ou consentimento |
| Testes de segurança (rate limiting, auth admin, RLS) | **PARCIAL** | Rate limiting coberto em cases.test.ts (Cloudflare). Sem teste de RLS nem auth admin dedicado a endpoints de leads |

---

## 2. Arquivos de Teste Auditados (caminho absoluto)

Testes automatizados encontrados relacionados a leads/marketing/onboarding/commercial/payments:

1. `/home/lg/workspace/projects/AdeusMultas-Defesa-/cloudflare/routes/marketing.test.ts`
2. `/home/lg/workspace/projects/AdeusMultas-Defesa-/cloudflare/routes/commercial.test.ts`
3. `/home/lg/workspace/projects/AdeusMultas-Defesa-/cloudflare/routes/payments.test.ts`
4. `/home/lg/workspace/projects/AdeusMultas-Defesa-/cloudflare/pagbank.signature.test.ts`
5. `/home/lg/workspace/projects/AdeusMultas-Defesa-/cloudflare/venopag.test.ts`
6. `/home/lg/workspace/projects/AdeusMultas-Defesa-/cloudflare/routes/cases.test.ts` (rate limiting / claim / qualificação)
7. `/home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/routes/whatsapp-webhook.integration.test.ts`
8. `/home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/shared/webhook/evolution-webhook-auth.test.ts`
9. `/home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/services/marketing-service.test.ts`
10. `/home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/services/marketing-automation/eligibility.test.ts`
11. `/home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/workers/meta-publisher.worker.test.ts`
12. `/home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/services/tests/messaging-service.test.ts`
13. `/home/lg/workspace/projects/AdeusMultas-Defesa-/src/scraper-prospecting/scraper-prospecting.test.ts`
14. `/home/lg/workspace/projects/AdeusMultas-Defesa-/tests/e2e-reconstruction/*.spec.ts` (7 specs de recursos de trânsito, não leads)

Arquivos de cenário/dados (não são testes automatizados executáveis como suíte):
- `/home/lg/workspace/projects/AdeusMultas-Defesa-/onboarding-test-scenarios.ts` (gerador de dados para verificação manual)
- `/home/lg/workspace/projects/AdeusMultas-Defesa-/test-onboarding-flow.js` (script auxiliar raiz)

---

## 3. Matriz de Cobertura: Endpoint → Tem Teste?

**Endpoints de captação de leads (B2C/B2B):**

| Endpoint | Método | Cobertura | Observação |
|----------|--------|-----------|------------|
| /api/marketing/contents | GET/POST | Sim | cloudflare/routes/marketing.test.ts |
| /api/marketing/publish/:id | POST | Sim | cloudflare/routes/marketing.test.ts |
| /api/marketing/status | GET | Sim | cloudflare/routes/marketing.test.ts |
| /api/marketing/inbox/* | GET/POST/PATCH | Não | Sem teste de integração |
| /api/marketing/automation/status | GET | Não | Não testado |
| /api/marketing/automation/start|pause|stop | POST | Não |
| /api/marketing/automation/campaigns | GET/POST/PATCH | Não | Não testado |
| /api/marketing/automation/campaigns/:id/start | POST | Não |
| /api/marketing/automation/stats | GET | Não |
| /api/marketing/automation/leads | GET/PATCH | Não | Não testado |
| /api/marketing/automation/leads/:id | GET | Não |
| /api/marketing/automation/health | GET | Não |
| /api/marketing/automation/queue | GET | Não |
| /api/marketing/automation/scrape | POST | Não |
| /api/marketing/automation/scrape/:jobId | GET | Não |
| /api/marketing/automation/export | GET | Não |
| /api/meta/webhook | GET/POST | Não | Endpoint existe (meta.ts) mas sem teste de integração no vitest |
| /api/webhooks/whatsapp | POST | Sim (integração) | whatsapp-webhook.integration.test.ts + evolution-webhook-auth.test.ts |
| /api/communication/whatsapp/send* | POST | Não | Não testado |
| /api/onboarding-v2/draft | POST/PUT/GET | Não | Não testado |
| /api/onboarding-v2/cases/:id/* | POST/GET/PUT | Não | Não testado |
| /api/payments/resolve-price | GET | Sim | cloudflare/routes/payments.test.ts |
| /api/payments/pix/create | POST | Sim | cloudflare/routes/payments.test.ts |
| /api/payments/credit-card/create | POST | Sim | cloudflare/routes/payments.test.ts |
| /api/payments/pix/status/:txId | GET | Não |
| /api/payments/pagbank/orders/:id | GET | Não |
| /api/webhooks/pagbank | POST | Sim (HMAC + idempotência) | cloudflare/routes/payments.test.ts |
| /api/webhooks/venopag | POST | Sim (HMAC rejeita sem assinatura) | cloudflare/routes/payments.test.ts |
| /api/webhooks/ggpix | POST | Parcial | IP allowlist testado; HMAC/idempotência não |
| /api/payments/simulate-payment | POST | Não |
| /api/payments/gateway/status | GET | Sim | cloudflare/routes/payments.test.ts |
| /api/cases/anonymous | POST | Sim | cloudflare/routes/cases.test.ts (rate limit, claim, qualificação) |
| /api/cases/:id/* | GET/PUT | Parcial | cases.test.ts cobre anonymous; qualificação coberta |

**Serviços:**

| Serviço | Cobertura |
|---------|-----------|
| marketing-service | Sim (marketing-service.test.ts) |
| marketing-automation worker | Não testado diretamente (apenas eligibility unit) |
| scrape-worker | Não testado |
| meta-publisher worker | Sim (meta-publisher.worker.test.ts) |
| messaging-service | Sim (tests/messaging-service.test.ts) |
| whatsapp-service | Não testado diretamente |
| email-service (Resend) | **Não tem teste** |
| settings-service | Sim (tests/settings-service.test.ts) |

---

## 4. Gaps de Teste (Endpoints Críticos Sem Teste)

**Alta prioridade (captação de leads / pagamento / webhook):**

1. **`POST /api/meta/webhook`** — Webhook de leadgen da Meta (captação B2C principal). Não há teste de integração, nem de HMAC `x-hub-signature-256`, nem de ingestão de lead.
2. **`POST /api/webhooks/pagbank`** — Idempotência só coberta parcialmente (`isDuplicate` no cloudflare). Não há teste de replay completo nem de caso já pago.
3. **`POST /api/webhooks/venopag`** — HMAC coberto (rejeita sem assinatura). Idempotência por `request_number` delegada ao repository, sem teste de endpoint.
4. **`POST /api/webhooks/ggpix`** — HMAC/idempotência não testados. Apenas IP allowlist.
5. **`POST /api/onboarding-v2/draft` e casos/evidence/analysis/qualification** — Zero testes. Fluxo de cadastro B2C sem cobertura.
6. **`POST /api/marketing/automation/scrape` + fluxo leads→campanha→whatsapp** — Zero testes E2E do fluxo B2B.
7. **`POST /api/communication/whatsapp/send*`** — Envio de WhatsApp (outbound) sem teste.
8. **`GET /api/payments/pix/status/:txId`** — Polling de status sem teste.
9. **`POST /api/payments/simulate-payment`** — Simulação de pagamento sem teste.

**Média prioridade:**

10. Testes de frontend: `AuthPageView`, `SharedAuthForm`, `OnboardingWizard`, `CheckoutView` — zero testes de componente.
11. Testes de LGPD: endpoint de opt-out/consentimento não testado além do unitário `opt_out_at`.
12. Testes de RLS (Row Level Security) no Supabase para leads/casos — não encontrados.

**Baixa prioridade:**

13. `/api/marketing/inbox/*` — conversas/mensagens sem teste de integração.
14. `/api/marketing/automation/collection-runs/:id` — sem teste.

---

## 5. Erros TypeScript (`npx tsc --noEmit`)

Resultado: **2 erros**, ambos na área de gateway de pagamentos (refletem as modificações não commitadas na árvore de trabalho):

```
cloudflare/routes/payments.ts(9,30): error TS2307: Cannot find module '../../src/server/integrations/gateway/ggpix-adapter' or its corresponding type declarations.
src/server/integrations/gateway/venopag-adapter.ts(295,7): error TS2740: Type 'VenoCashInResponse & { ok?: boolean; error?: string; }' is missing the following properties from type 'Response': headers, redirected, statusText, type, and 10 more.
```

**Contexto:** `ggpix-adapter.ts` foi deletado da árvore de trabalho (está como `D` no `git status`) mas ainda é importado por `cloudflare/routes/payments.ts`. O `venopag-adapter.ts` retorna um objeto tipado como `Response` que não satisfaz a interface. **Nenhum erro TypeScript nos arquivos de domínio de leads/marketing/onboarding/commercial/payments fora dessa área de gateway.**

---

## 6. Resultados de Execução

**`npx vitest run`:**
- Test Files: **1 failed | 24 passed** (25)
- Tests: **167 passed** (167)
- Duração: ~64s
- A falha é `cloudflare/routes/payments.test.ts` que não carrega devido ao erro TS2307 do módulo `ggpix-adapter` deletado.

**`npx tsc --noEmit`:** 2 erros (listados acima).

---

## 7. Recomendações de Prioridade

### Alta (bloqueante para release)

1. **Restaurar ou remover `ggpix-adapter.ts`** e corrigir `venopag-adapter.ts` para zerar `tsc --noEmit`. A árvore de trabalho está quebrada; qualquer CI de tipo falha.
2. **Implementar teste de integração de `POST /api/meta/webhook`** (leadgen Meta) com HMAC `x-hub-signature-256` e ingestão de lead — principal ponto de captação B2C sem cobertura.
3. **Implementar testes de idempotência de webhook de pagamento** (PagBank replay completo, VenoPag `request_number`, GGPIX) — um webhook duplicado não deve criar pagamento duplo.
4. **Implementar testes de `POST /api/onboarding-v2/draft` e qualificação** — fluxo de cadastro B2C totalmente sem teste.

### Média

5. **Testes de frontend** para `AuthPageView`, `SharedAuthForm`, `OnboardingWizard`, `CheckoutView` (React Testing Library / Vitest).
6. **Teste de LGPD/opt-out** em endpoint dedicado (além do unitário `opt_out_at` em eligibility).
7. **Teste de RLS** no Supabase para isolamento de leads/casos por usuário.
8. **Teste de `email-service` (Resend)** — serviço existe, zero testes.

### Baixa

9. Completar testes de `/api/marketing/inbox/*`, scrape-worker, whatsapp-service.
10. Implementar a suíte E2E canônica de 70 cenários (docs/testing/E2E-CERTIFICACAO-CANONICA.md) — atualmente apenas especificação, zero cenários executáveis.

---

## 8. SHA do Commit Atual

`41dd4a8 fix(auth): remove insert manual user_profiles — trigger handle_new_user() já cria [DEPLOY-PRODUCTION]`

---

## 9. Conclusão

A camada de unidade/integração (vitest) está **funcional (167 testes verdes)** e cobre bem webhooks de pagamento (HMAC PagBank/VenoPag, idempotência parcial), mensageria WhatsApp/Meta/Instagram, elegibilidade de leads e rate limiting de casos anônimos. Porém, **a cobertura de endpoints de captação de leads é incompleta**: o webhook de leadgen da Meta, todo o fluxo onboarding-v2, o fluxo B2B scraping→campanha→whatsapp, e os testes de frontend/LGPD/RLS/email-service estão ausentes. Além disso, a árvore de trabalho tem 2 erros de TypeScript na área de gateway que bloqueiam a CI de tipos. A suíte E2E canônica de 70 cenários existe apenas como especificação.
