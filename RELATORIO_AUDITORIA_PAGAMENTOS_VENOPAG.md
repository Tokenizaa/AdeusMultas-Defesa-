# Relatório de Auditoria — Fluxo de Pagamentos e Financeiro (DefesAi)

**Projeto:** AdeusMultas-Defesa- (DefesAi)  
**Branch analisada:** `main`  
**Commit base:** `47d079a` — feat(payments): conclui migração para gateway VenoPag (descontinua PagBank e GGPIXAPI)  
**Escopo de leitura:** Apenas estática local. Sem pagamentos reais. Sem dados reais de cartão/PIX.  
**Auditor:** Payments & Billing Engineer  
**Data:** 21/10/2026  

---

## Veredito Geral: **FAIL** (BLOQUEADO PARA PRODUÇÃO)

O fluxo de pagamentos **não está pronto para produção**. Existe um achado **CRÍTICO** (ausência de idempotência no webhook VenoPag), múltiplos achados **ALTO** (código morto de gateways descontinuados ainda ativo, email de confirmação nunca disparado, inconsistência de gateway ativo) e achados **MÉDIO/BAIXO** que comprometem auditoria, reconciliação e segurança. A migração para VenoPag está **parcial**: o código de PagBank e GGPIXAPI permanece exposto e executável.

---

## Sumário de Achados

| Severidade | Quantidade | Título Resumido |
|------------|------------|-----------------|
| CRÍTICO | 1 | Webhook VenoPag sem idempotência durável — risco de dupla cobrança |
| ALTO | 3 | Código morto PagBank/GGPIXAPI ainda exposto e executável; email Resend nunca disparado; inconsistência gateway declarado vs. ativo |
| MÉDIO | 3 | payment_orders não preenchido na criação PIX nem em webhooks PagBank/VenoPag; payment_repository fire-and-forget sem confirmação; VenoPag env vars ausentes do .env.example |
| BAIXO | 3 | ipHash hardcoded em auditoria; fallbacks de preço em pricing.ts; GGPIXAPI sem HMAC (só IP allowlist) |

---

## Achados Detalhados

### CRÍTICO

#### C-1. Webhook VenoPag sem idempotência durável nem verificação de pagamento já confirmado (risco de dupla cobrança)

**Arquivo:linha:** `src/server/routes/payments.ts:1132-1244`

O handler de webhook `/api/webhooks/venopag` chama `venopagAdapter.processWebhook()` (que valida a assinatura HMAC) e, em seguida, processa os efeitos colaterais diretamente: define `domain.isPaid = true`, gera a defesa, grava o case, chama `commercialService.processPaymentConfirmationEvent()` e grava audit log.

**Problemas:**
1. Não chama `webhookRepository.acceptEvent()` — não há detecção de evento duplicado. Se o VenoPag reenviar o mesmo webhook (retry por timeout, rede instável), o caso será pago novamente, a defesa gerada novamente e a comissão/bonus processada novamente.
2. Não verifica `alreadyPaid` (diferentemente dos handlers PagBank linha 604 e GGPIXAPI linha 1028, que verificam). Mesmo que o caso já esteja `isPaid === true` com a mesma transação, o handler sobrescreve e reaplica efeitos colaterais.
3. Não chama `webhookRepository.completeEvent()` — não há rastreamento de processamento.

**Impacto:** Cada entrega duplicada de webhook do VenoPag resulta em dupla cobrança lógica (mesmo pagamento processado mais de uma vez), geração duplicada de peça jurídica e emissão dupla de comissão/bonus.

**Referência de boas prática:** O handler PagBank (linha 586) e GGPIXAPI (linha 1015) já usam `webhookRepository.acceptEvent()` com `UNIQUE(event_id)` e verificação de `alreadyPaid`. O VenoPag deve seguir o mesmo padrão.

---

### ALTO

#### A-1. Código morto de PagBank e GGPIXAPI ainda exposto e executável (migração incompleta)

**Arquivos:linhas:**
- `src/server/routes/payments.ts:3` — `import { pagBankIntegration } from '../integrations/pagbank';`
- `src/server/routes/payments.ts:6` — `import type { PagBankWebhookPayload } from '../integrations/pagbank';`
- `src/server/routes/payments.ts:407-545` — endpoint `/credit-card/create` chama `pagBankIntegration.createCreditCardOrder()` diretamente, **bypassing o `gatewayManager`** (que só suporta `'venopag'`). Cartão de crédito continua funcionando via PagBank mesmo com VenoPag ativo.
- `src/server/routes/payments.ts:548` — endpoint `/pagbank/orders/:id` ainda exposto.
- `src/server/routes/payments.ts:559` — webhook `/webhooks/pagbank` ainda ativo (HMAC).
- `src/server/routes/payments.ts:987` — webhook `/webhooks/ggpix` ainda ativo (IP allowlist).
- `src/server/observability/health-service.ts:583, 1054+` — health check ainda consulta API do PagBank (`PAGBANK_TOKEN`, `https://api.pagbank.com/`).
- `src/core/integrations/pagbank-client.ts` — ainda existe e é importável.
- `src/server/integrations/pagbank/` — pasta inteira ainda presente (`client.server.ts`, `orders.ts`, `types.ts`).
- `.env.example.example:79-112` — ainda documenta `PAGBANK_TOKEN`, `GGPIX_API_KEY`, `GGPIX_ENABLED`, `GGPIX_WEBHOOK_ALLOWED_IPS`.

**Impacto:** Superfície de ataque desnecessária. Chaves antigas (PagBank, GGPIXAPI) ainda podem ser configuradas e usadas. O endpoint de cartão de crédito ignora o gateway ativo (VenoPag não suporta cartão), criando uma porta aberta para pagamento via gateway descontinuado.

#### A-2. Email de confirmação de pagamento (Resend) implementado mas nunca disparado

**Arquivo:linha:** `src/server/services/email-service.ts:272-287` (definição de `sendPaymentConfirmation`)

**Busca:** `sendPaymentConfirmation` e `sendDefenseReady` (email) **não são chamados em nenhum lugar do codebase** (confirmedo via grep: apenas definidos, nunca invocados). Os webhooks de pagamento (PagBank, GGPIXAPI, VenoPag) atualizam o case e geram a defesa, mas **não enviam email de confirmação de pagamento** ao comprador.

**Impacto:** O cliente paga via PIX e não recebe confirmação por email. Quebra de experiência e falta de comprovante documental para o consumidor.

**Referência:** O template `paymentConfirmationTemplate` (linha 126-168) e o tipo `PaymentConfirmationEmailData` (linha 43-49) estão prontos; falta apenas a chamada nos webhooks após confirmação de pagamento.

#### A-3. Inconsistência entre gateway declarado no ambiente e gateway ativo real

**Arquivos:linhas:**
- `src/server/integrations/gateway/gateway-manager.ts:24` — `resolveActiveGatewayIdFromEnv()` **sempre retorna `'venopag'`**, ignorando `PAYMENT_ACTIVE_GATEWAY`.
- `src/server/config/config-service.ts:315-329` — definição de `PAYMENT_ACTIVE_GATEWAY` com default `'ggpixapi'` e opções `'pagbank'` / `'ggpixapi'`. **Não há opção `'venopag'`**.
- `.env.example.example:97` — `PAYMENT_ACTIVE_GATEWAY="ggpixapi"`.
- `src/types/integrations/gateway/types.ts:19` — `export type GatewayId = 'venopag';` (apenas VenoPag).

**Impacto:** O administrador pode configurar `PAYMENT_ACTIVE_GATEWAY=ggpixapi` (ou pagbank) esperando que esse gateway seja usado, mas o sistema sempre usa VenoPag. Configuração enganosa que pode levar a acreditar que PagBank/GGPIXAPI estão ativos quando não estão (ou vice-versa). Além disso, `config-service` não reconhece `'venopag'` como valor válido de `PAYMENT_ACTIVE_GATEWAY`.

---

### MÉDIO

#### M-1. payment_orders não é preenchido na criação do pedido PIX (VenoPag) nem nos webhooks PagBank e VenoPag

**Arquivos:linhas:**
- `src/server/routes/payments.ts:281-367` (`/pix/create`) — cria a ordem no VenoPag e retorna, mas **não persiste em `payment_orders`** (não chama `paymentRepository.persistOrder()`).
- `src/server/routes/payments.ts:599-686` (webhook PagBank) — atualiza o case e chama `commercialService`, mas **não insere em `payment_orders`**.
- `src/server/routes/payments.ts:1153-1235` (webhook VenoPag) — atualiza o case, mas **não insere em `payment_orders`**.
- Apenas o webhook GGPIXAPI (linha 1060-1087) e `/simulate-payment` (linha 840-865) inserem em `payment_orders`.

**Impacto:** Falha na trilha de auditoria e reconciliação financeira. Não é possível fazer three-way match (pedido ↔ ledger ↔ processador) para pagamentos PIX via VenoPag, pois o pedido nunca é registrado na tabela `payment_orders` no momento da criação ou confirmação.

#### M-2. paymentRepository usa fire-and-forget para Supabase sem confirmação de escrita

**Arquivo:linha:** `src/server/db/payment-repository.ts:62-73` (método `fire`)

Todas as escritas em `payment_orders` e `payment_webhook_events` são feitas via `this.fire()` — `Promise.resolve(query).then(...).catch(...)` que **engole todos os erros** e nunca aguarda confirmação. Se o processo cair ou o Supabase estiver indisponível no momento exato, o pedido de pagamento ou o evento de webhook podem ser perdidos silenciosamente.

**Impacto:** Perda silenciosa de dados financeiros. Um pedido criado no gateway pode nunca ser registrado localmente; um webhook processado pode não ter seu evento marcado como concluído, levando a reprocessamento infinito ou perda de rastreamento.

#### M-3. Variáveis de ambiente do VenoPag ausentes do .env.example

**Arquivo:** `.env.example.example`

O adapter VenoPag (`src/server/integrations/gateway/venopag-adapter.ts:42-46`) requer:
- `VENO_CLIENT_ID`
- `VENO_CLIENT_SECRET`
- `VENO_WEBHOOK_SECRET`
- `VENO_ENABLED`

Nenhuma dessas variáveis está documentada em `.env.example.example`. O arquivo só documenta `PAGBANK_*` e `GGPIX_*`.

**Impacto:** Em produção, se essas variáveis não forem configuradas manualmente, `gatewayManager.getActiveGateway()` lançará erro (`VENO_CLIENT_ID / VENO_CLIENT_SECRET não configurados`) e **nenhum pagamento PIX poderá ser criado**. Documentação de configuração incompleta para o gateway que é, de fato, o único ativo.

---

### BAIXO

#### B-1. `ipHash` hardcoded em registros de auditoria de pagamento

**Arquivo:linha:** `src/server/routes/payments.ts:681, 1082, 1233`

O campo `ipHash` dos `auditLogs` é sempre `'3a88c42b109e'` (valor fixo, não é um hash real de IP do cliente).

**Impacto:** Auditoria financeira não consegue identificar a origem IP de quem efetuou o pagamento. Baixo impacto funcional, mas compromete rastreabilidade forense.

#### B-2. Fallbacks de preço em `src/config/pricing.ts` podem ser confundidos com preço de produção

**Arquivo:linha:** `src/server/config/pricing.ts:12-18`

`PRICING.FALLBACK_PRICE = 89.90` e `PRICING.REFERENCE_PRICE = 197.00`. O arquivo próprio diz "NUNCA usar estes valores como preço de cobrança em produção sem antes consultar o commercial-service", e de fato o checkout usa `commercialService.resolveCommercialOffer()`. Porém, o valor `89.90` aparece hardcoded no endpoint `/simulate-payment` (linha 775) e `/simulate-confirm` (linha 921) como valor padrão de simulação.

**Impacto:** Baixo, pois o backend é autoridade de preço e o fallback não é usado em cobranças reais. Recomenda-se remover ou isolar estes fallbacks do caminho de produção.

#### B-3. GGPIXAPI depende apenas de IP allowlist (sem assinatura criptográfica)

**Arquivo:linha:** `src/server/routes/payments.ts:987-1005`

O webhook GGPIXAPI valida apenas IP allowlist (`GGPIX_WEBHOOK_ALLOWED_IPS`), sem HMAC. Se `GGPIX_WEBHOOK_ALLOWED_IPS` estiver vazio, `ipOk` é `true` (linha 997: `allowedIps.length === 0 || ...`) — aceitando webhooks de qualquer IP.

**Impacto:** GGPIXAPI não é o gateway ativo (sempre é VenoPag), então este achado é latente. Se o gateway for trocado no futuro, a segurança do webhook depende exclusivamente de allowlist de IP, que é falsificável.

---

## Área por Área (checklist da missão)

| Área | Status | Observação |
|------|--------|------------|
| 1. Migração VenoPag | ⚠️ PARCIAL | Código morto PagBank/GGPIXAPI ainda exposto; endpoint cartão bypassa gateway manager |
| 2. Idempotência de webhooks | ❌ FALHA CRÍTICA | VenoPag sem dedup durável; PagBank e GGPIXAPI têm |
| 3. payment_orders | ⚠️ PARCIAL | Não preenchido na criação PIX; ausente em webhooks PagBank e VenoPag |
| 4. Resolve price / pricing | ✅ OK | Backend é autoridade; preço consistente; oferta bônus 3 docs implementada |
| 5. Webhook security | ⚠️ PARCIAL | VenoPag HMAC OK; GGPIXAPI só IP allowlist; VenoPag env vars não documentadas |
| 6. Sandbox vs produção | ⚠️ PARCIAL | Default sandbox; sem hardcoding de chave de produção; VenoPag vars ausentes do .env |
| 7. Falha e repetição | ⚠️ PARCIAL | Fail closed na criação; webhook VenoPag não trata retry duplicado |
| 8. Emails Resend | ❌ FALHA | `sendPaymentConfirmation` definido mas nunca chamado |

---

## Recomendações

### Idempotência (obrigatório antes de produção)

1. **Adicionar `webhookRepository.acceptEvent()` ao webhook VenoPag** (`src/server/routes/payments.ts:1132`), usando o `stableEventId` já gerado pelo adapter (`venopag_${request_number}_${status}`), antes de aplicar efeitos colaterais.
2. **Adicionar verificação de `alreadyPaid`** no webhook VenoPag (mesmo padrão dos handlers PagBank linha 604 e GGPIXAPI linha 1028), pular efeitos se o caso já estiver quitado com a mesma transação.
3. **Chamar `webhookRepository.completeEvent()`** após processamento bem-sucedido no handler VenoPag.
4. Garantir que todo efeito colateral de webhook seja idempotente (safe to replay): `upsert` em `payment_orders` por `case_id`, verificação de `isPaid` antes de gravar, geração de defesa apenas se ainda não existir.

### Segurança de webhook

5. Manter HMAC-SHA256 do VenoPag com tolerância de 5 minutos e `constantTimeEqual` (já implementado no adapter). Validar `client_id` vs `VENO_CLIENT_ID`.
6. Remover ou desativar os endpoints webhook `/webhooks/pagbank` e `/webhooks/ggpix` se os gateways foram realmente descontinuados, para reduzir superfície de ataque.
7. Se GGPIXAPI for reativado no futuro, substituir IP allowlist por HMAC assinado.

### Sandbox / Configuração

8. Adicionar `VENO_CLIENT_ID`, `VENO_CLIENT_SECRET`, `VENO_WEBHOOK_SECRET`, `VENO_ENABLED` ao `.env.example.example` com placeholders.
9. Alinhar `PAYMENT_ACTIVE_GATEWAY` no `config-service` (que lista pagbank/ggpixapi) com o gateway real (`venopag`), ou tornar o `GatewayManager` sensível à variável de ambiente.
10. Garantir que `PAYMENT_MODE=production` bloqueie simulações (já feito para `/simulate-payment` e `/sandbox/trigger-webhook` via `NODE_ENV`, mas verificar que `PAYMENT_MODE` também é checado).

### payment_orders e reconciliação

11. Persistir o pedido em `payment_orders` no momento da criação do PIX via VenoPag (`/pix/create`), usando `paymentRepository.persistOrder()` com status `PENDING`.
12. Inserir/atualizar `payment_orders` nos webhooks PagBank e VenoPag ao confirmar pagamento (status `PAID`), com `onConflict: 'case_id'` para idempotência.
13. Substituir `fire-and-forget` por escrita aguardada (ou pelo menos com retry e DLQ) para eventos financeiros críticos, ou implementar job de reconciliação diária que compare `payment_orders` com webhooks recebidos.

### Emails (Resend)

14. Chamar `emailService.sendPaymentConfirmation()` nos webhooks de pagamento após confirmação de `isPaid`, passando `userName`, `caseId`, `amount`, `paymentMethod`, `transactionId`.
15. Garantir que o email seja enviado apenas uma vez (vinculado à idempotência do webhook — só no primeiro processamento, não em duplicatas).

### Limpeza de código morto

16. Remover `src/server/integrations/pagbank/`, `src/core/integrations/pagbank-client.ts`, e as importações de PagBank em `payments.ts` se PagBank foi realmente descontinuado.
17. Remover endpoints `/pagbank/orders/:id`, `/webhooks/pagbank`, `/webhooks/ggpix` do router de pagamentos.
18. Remover referências a PagBank em `health-service.ts`.

---

## Evidências dos testes E2E existentes

Os testes em `tests/e2e-reconstruction/*.spec.ts` chamam `POST /api/payments/pix/create` (linha ~101 de cada spec), confirmando que o fluxo PIX via VenoPag é o caminho coberto por E2E. Não há testes de webhook, idempotência ou falha de pagamento na suíte local.

---

## Conclusão

**Veredito: FAIL.** O sistema não está pronto para receber pagamentos reais em produção devido ao achado CRÍTICO (webhook VenoPag sem idempotência — risco de dupla cobrança) e aos achados ALTO (código morto de gateways descontinuados exposto, email de confirmação nunca disparado, inconsistência de gateway ativo). Recomenda-se bloquear o go-live de pagamentos até que C-1, A-1, A-2 e A-3 sejam resolvidos, seguidos de M-1 a M-3 antes do lançamento estável.

---
*Relatório gerado por análise estática local. Nenhum arquivo foi modificado. Nenhum pagamento real foi executado.*