# PAYMENT-AUDIT.md
## Auditoria Completa do Sistema de Pagamentos — DefesAi

---

## SUMÁRIO EXECUTIVO

| Item | Produção | Admin/Dev (Sandbox) |
|------|----------|---------------------|
| **Provider Ativo** | GGPIXAPI | PagBank (PagSeguro) |
| **Gateway Ativo (env)** | `ggpixapi` | `pagbank` (forçado em não-produção) |
| **Endpoint** | `https://ggpixapi.com/api/v1` (backup: `ggatepixapi.com`) | `https://sandbox.api.pagseguro.com` |
| **Credencial** | `GGPIX_API_KEY` (X-API-Key) | `PAGBANK_TOKEN` (Bearer) + `PAGBANK_WEBHOOK_SECRET` |
| **Métodos** | PIX In **apenas** | PIX + Cartão de Crédito |
| **Webhook Path** | `/api/webhooks/ggpix` | `/api/webhooks/pagbank` |
| **Verificação Webhook** | Idempotência por `externalId` (sem HMAC) | HMAC-SHA256 (`X-Hub-Signature-256`) |
| **Status Config** | ✅ Configurado (`.env`: `GGPIX_ENABLED=true`, key presente) | ✅ Configurado (`.env`: `PAGBANK_TOKEN`, `PAGBANK_ENV=sandbox`) |

---

## 1. PRODUÇÃO — GGPIXAPI

### 1.1 Configuração Ativa (.env)
```bash
PAYMENT_ACTIVE_GATEWAY="ggpixapi"
GGPIX_ENABLED="true"
GGPIX_API_KEY="gk_516e36242c63d600682ab357a12e0382f94502150fd0f73f"
```

### 1.2 Gateway Manager — Resolução
**Arquivo:** `src/server/integrations/gateway/gateway-manager.ts`

```typescript
// Prioridade:
1. PAYMENT_ACTIVE_GATEWAY (env) → 'ggpixapi'
2. Fallback produção → 'ggpixapi' (linha 53-55)
3. Fallback dev → 'pagbank' (linha 57)
```

**Regra crítica (linha 46-48):** Em produção, **NUNCA** permite `pagbank` como gateway ativo — força `ggpixapi`.

### 1.3 Adapter GGPIXAPI
**Arquivo:** `src/server/integrations/gateway/ggpix-adapter.ts`

| Item | Detalhe |
|------|---------|
| Base URL | `https://ggpixapi.com/api/v1` |
| Backup URL | `https://ggatepixapi.com/api/v1` |
| Auth | Header `X-API-Key: ${GGPIX_API_KEY}` |
| Endpoint PIX | `POST /pix/in` |
| Endpoint Status | `GET /transactions/{txId}` |
| Webhook Payload | `{ transactionId, externalId, status, type, amount, paidAt }` |
| Suporta Cartão | ❌ Lança `Error` |

### 1.4 Fluxo PIX Produção
```
Frontend (DocumentCheckoutStep)
    → POST /api/payments/pix/create
    → GatewayManager.getActiveGateway() → ggpixAdapter
    → ggpixAdapter.createPix() → POST https://ggpixapi.com/api/v1/pix/in
    → Retorna: { gatewayTransactionId, pixCopyPaste, qrCodeDataUrl, status }
    → Frontend exibe QR Code
    → Usuário paga no app do banco
    → GGPIXAPI POST /api/webhooks/ggpix
    → processGatewayWebhook() → ggpixAdapter.processWebhook()
    → Normaliza evento → Atualiza case (isPaid=true, status=defesa_pronta)
    → Gera defesa automaticamente (RagPipeline)
```

### 1.5 Webhook GGPIXAPI
- **Path:** `/api/webhooks/ggpix` (registrado em `payments.ts` linha 210, 629)
- **Detecção:** Por path (`/ggpix`) ou payload (`transactionId` + `type`)
- **Idempotência:** Por `externalId` (referenceId) — **sem HMAC**
- **Normalização:** `mapGGPixStatus()` → `PENDING|PAID|DECLINED|CANCELED`

---

## 2. ADMIN / DEV — PAGBANK SANDBOX

### 2.1 Configuração Ativa (.env)
```bash
PAGBANK_TOKEN="c79e3809-90e3-4353-ab32-b98ffc2e45991ac8f9f04816a7093eccaf250bcc843060b5-7cae-4037-9c89-cac83c6abff7"
PAGBANK_ENV="sandbox"
PAGBANK_WEBHOOK_SECRET=""  # ⚠️ VAZIO — permissivo em dev, BLOQUEIA em prod
```

### 2.2 Integração PagBank
**Arquivo:** `src/server/integrations/pagbank.ts` (service direto) + `src/server/integrations/gateway/pagbank-adapter.ts` (adapter)

| Item | Detalhe |
|------|---------|
| Base URL Sandbox | `https://sandbox.api.pagseguro.com` |
| Base URL Produção | `https://api.pagseguro.com` |
| Auth | Bearer `PAGBANK_TOKEN` |
| Endpoint Orders | `POST /orders` |
| Webhook Secret | `PAGBANK_WEBHOOK_SECRET` (HMAC-SHA256) |
| Suporta Cartão | ✅ `createCreditCardOrder()` |
| Token Mock Block | Prefixo `mock_` **bloqueado em produção** (linha 214-218) |

### 2.3 Fluxo Admin/Teste (CheckoutView)
**Arquivo:** `src/components/checkout/CheckoutView.tsx`

```typescript
// Guard admin-only (linha 45-65)
if (!isAdmin) return <AdminOnlyMessage />;

// Cria PIX via /api/payments/pix/create
// Verifica status via /api/payments/pix/status/:txId
// Cartão via CreditCardForm → /api/payments/credit-card/create
```

**Importante:** `CheckoutView` é **exclusivamente admin** — não usado por usuários finais.

### 2.4 Fluxo Usuário Real (DocumentCheckoutStep)
**Arquivo:** `src/components/onboarding/generation/DocumentCheckoutStep.tsx`

```typescript
// Usado no onboarding etapa 10 (pós-análise, pré-defesa)
// Carrega gateway status → /api/payments/gateway/status
// Resolve preço → /api/payments/resolve-price
// Cria PIX → /api/payments/pix/create
// Polling status → /api/payments/pix/status/:txId (até 90s)
// Finaliza → POST /api/cases + POST /api/cases/:id/generate-defense
```

**Este é o fluxo real de usuários** — não admin.

---

## 3. MAPEAMENTO COMPLETO DE ENDPOINTS

| Método | Path | Handler | Gateway | Auth |
|--------|------|---------|---------|------|
| GET | `/api/payments/resolve-price` | `payments.ts:170` | Agnóstico | `prodAuth` (dev bypass) |
| POST | `/api/payments/pix/create` | `payments.ts:222` | Ativo | `prodAuth` |
| POST | `/api/payments/pagbank/orders` | `payments.ts:222` (alias) | PagBank | `prodAuth` |
| GET | `/api/payments/pix/status/:txId` | `payments.ts:309` | Ativo | `prodAuth` |
| POST | `/api/payments/credit-card/create` | `payments.ts:345` | PagBank | `prodAuth` |
| GET | `/api/payments/pagbank/orders/:id` | `payments.ts:485` | PagBank | Nenhuma |
| POST | `/api/webhooks/pagbank` | `payments.ts:494` | PagBank | HMAC-SHA256 |
| POST | `/api/webhooks/ggpix` | `payments.ts:629` | GGPIXAPI | Sem HMAC |
| GET | `/api/payments/gateway/status` | `payments.ts:753` | Info | Nenhuma |
| POST | `/api/payments/gateway/switch` | `payments.ts:766` | Admin | `requireAdmin` |

---

## 4. VARIÁVEIS DE AMBIENTE — MAPEAMENTO

| Variável | Produção (.env) | Exemplo (.env.example) | Uso |
|----------|-----------------|------------------------|-----|
| `PAYMENT_ACTIVE_GATEWAY` | `ggpixapi` | `pagbank` | Gateway ativo |
| `GGPIX_ENABLED` | `true` | `false` | Habilita GGPIX |
| `GGPIX_API_KEY` | `gk_516e...` | `YOUR_GGPIX_API_KEY` | Auth GGPIX |
| `PAGBANK_TOKEN` | `c79e38...` | `YOUR_PAGBANK_TOKEN` | Auth PagBank |
| `PAGBANK_ENV` | `sandbox` | `sandbox` | Sandbox/Prod PagBank |
| `PAGBANK_WEBHOOK_SECRET` | `""` (vazio) | *(não listado)* | HMAC webhook PagBank |
| `PAGBANK_WEBHOOK_SECRET` | *(config-service)* | *(não listado)* | Secret rotativo |

**⚠️ DIVERGÊNCIA CRÍTICA:** `.env.example` tem `PAYMENT_ACTIVE_GATEWAY="pagbank"` mas `.env` real tem `"ggpixapi"`.

---

## 5. CRIAÇÃO DE COBRANÇA — DETALHES

### 5.1 PIX (Gateway-Agnóstico)
```typescript
// payments.ts:259-270
const gateway = gatewayManager.getActiveGateway();
const orderResult = await gateway.createPix({
  caseId,
  referenceId: `defesai_case_${caseId}_${Date.now()}`,
  payer: { name, email, document },
  amountInCents: Math.round(finalAmount * 100),
  description: `DefesAi - ${offer.name}`,
  webhookUrl: `${APP_URL}/api/webhooks/${gateway.id === 'ggpixapi' ? 'ggpix' : 'pagbank'}`,
});
```

### 5.2 Cartão de Crédito (Apenas PagBank)
```typescript
// payments.ts:419-433
if (gateway.id !== 'pagbank') return 400; // Bloqueia GGPIX
const orderResult = await pagBankIntegration.createCreditCardOrder({
  caseId, referenceId, customer, amount, installments,
  cardToken, authenticationMethod, softDescriptor,
  notificationUrls: [`${APP_URL}/api/webhooks/pagbank`],
});
```

---

## 6. CONSULTA DE COBRANÇA

### 6.1 Polling Frontend
```typescript
// CheckoutView.tsx:279-301 / DocumentCheckoutStep.tsx:307-341
GET /api/payments/pix/status/:txId
→ gatewayManager.getActiveGateway().getPaymentStatus(txId)
```

### 6.2 Status PagBank (Legacy)
```typescript
// payments.ts:485-491
GET /api/payments/pagbank/orders/:id → pagBankIntegration.getOrder()
```

---

## 7. CONFIRMAÇÃO DE PAGAMENTO (WEBHOOKS)

### 7.1 PagBank — HMAC-SHA256
```typescript
// pagbank.ts:115-146 verifyWebhookSignature()
const expectedSignature = `sha256=${crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex')}`;
return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
```
- **Produção:** BLOQUEIA se `PAGBANK_WEBHOOK_SECRET` não configurado (linha 117-119)
- **Dev:** Permite sem secret (linha 121-122)

### 7.2 GGPIXAPI — Sem HMAC
```typescript
// ggpix-adapter.ts:273-294 processWebhook()
return {
  gatewayEventId: `ggpix_${payload.transactionId}_${payload.status}_${Date.now()}`,
  gateway: 'ggpixapi',
  gatewayTransactionId: payload.transactionId,
  referenceId: payload.externalId,
  status: mapGGPixStatus(payload.status),
  isDuplicate: false, // Idempotência por externalId
};
```

---

## 8. CANCELAMENTO / EXPIRAÇÃO

| Gateway | Expiração PIX | Cancelamento |
|---------|---------------|--------------|
| GGPIXAPI | 30 min (hardcoded `expiresAt`) | Via webhook `status: CANCELED` |
| PagBank | 30 min (definido no `createPixOrder`) | Via webhook `status: CANCELED` |

**Nota:** Não há endpoint de cancelamento ativo — depende de webhook ou expiração natural.

---

## 9. ATUALIZAÇÃO STATUS PEDIDO / CASO

### 9.1 Webhook PagBank → Case Update
```typescript
// payments.ts:525-589
if (caseId && webhookResult.status === 'PAID') {
  domain.isPaid = true;
  domain.paidAt = new Date().toISOString();
  domain.status = 'defesa_pronta';
  domain.currentStage = 3;
  domain.payment = { status: 'approved', amount, paidAt, transactionId, paymentMethod };
  // Gera defesa automática (try/catch não-bloqueante)
  // Atualiza caseRepository + databaseRows (memória)
  // commercialService.processPaymentConfirmationEvent()
  // auditLogs.unshift()
}
```

### 9.2 Webhook GGPIXAPI → Case Update
```typescript
// payments.ts:648-739 (mesma lógica, gateway='ggpixapi')
// Adicional: INSERT em payment_orders (Supabase) para KPIs/reconciliação
```

---

## 10. FRONTEND — MOCK / SIMULAÇÃO

### 10.1 CheckoutView (Admin Only)
- **Propósito:** Ferramenta de teste para admins simular pagamentos
- **Guard:** `if (!isAdmin) return <AdminOnlyMessage />` (linha 45-65)
- **Não usado por usuários reais**

### 10.2 DocumentCheckoutStep (Usuário Real)
- **Propósito:** Etapa 10 do onboarding — checkout real
- **Modo teste detectado:** Via `/api/payments/gateway/status` → `testMode` (linha 88-98)
- **Não usa mocks hardcoded** — chama APIs reais

### 10.3 CreditCardForm
- **Integração:** PagSeguroDirectPayment (SDK client-side)
- **Tokenização:** Cartão → `cardToken` → backend `/credit-card/create`
- **Apenas funciona com gateway PagBank ativo**

---

## 11. ADMIN USA PAGBANK SANDBOX?

**SIM — Parcialmente**

| Contexto | Gateway |
|----------|---------|
| `CheckoutView` (ferramenta admin) | Usa **gateway ativo** (pode ser GGPIXAPI se configurado) |
| `DocumentCheckoutStep` (onboarding usuário) | Usa **gateway ativo** |
| Gateway Switch UI (`/gateway/switch`) | Admin pode trocar runtime |
| Variável `PAGBANK_ENV=sandbox` | Força sandbox em dev/teste |

**Porém:** Em produção, `gateway-manager.ts` **impede** ativar PagBank (linha 46-48).

---

## 12. PRODUÇÃO USA GGPIX?

**SIM — Configurado como padrão**

- `.env`: `PAYMENT_ACTIVE_GATEWAY="ggpixapi"`
- `.env`: `GGPIX_ENABLED="true"`  
- `.env`: `GGPIX_API_KEY` presente (formato `gk_...`)
- Config-service default: `'ggpixapi'` (linha 304)
- Gateway Manager fallback produção: `'ggpixapi'` (linha 54-55)

---

## 13. ISOLAMENTO DE CREDENCIAIS — VERIFICAÇÃO

| Credencial | Produção | Admin/Dev | Isolamento |
|------------|----------|-----------|------------|
| `GGPIX_API_KEY` | ✅ Usada | ❌ Não usada (gateway inativo) | **OK** — só backend |
| `PAGBANK_TOKEN` | ❌ Não usada (gateway bloqueado) | ✅ Usada (sandbox) | **OK** — ambientes separados |
| `PAGBANK_WEBHOOK_SECRET` | ⚠️ Vazio (bloqueia webhook prod) | ✅ Permissivo (dev) | **RISCO** — secret ausente em prod |

**RISCO P0:** `PAGBANK_WEBHOOK_SECRET` vazio em `.env` — se alguém ativar PagBank em produção, webhooks serão rejeitados (linha 117-119).

---

## 14. MOCKS / FALLBACKS IDENTIFICADOS

| Local | Tipo | Risco |
|-------|------|-------|
| `pagbank.ts:174-190` | EMV PIX string hardcoded (fallback local) | **DEV ONLY** — bloqueado em prod (linha 214-218) |
| `pagbank.ts:277` | API falha → mantém ordem local | **DEV ONLY** — erro em prod (linha 273-276) |
| `pagbank.ts:482-488` | Sandbox simulação cartão | **DEV ONLY** — erro em prod (linha 479-481) |
| `ggpix-adapter.ts:148` | pixCopyPaste local hardcoded | **DEV ONLY** — erro em prod se API falhar (linha 181-187) |
| `ggpix-adapter.ts:199` | API falha → dados locais | **DEV ONLY** — erro em prod (linha 195-197) |
| `payments.ts:150` | `isTestMode()` = `NODE_ENV !== 'production'` | **OK** — bypass auth apenas em dev |

---

## 15. DIVERGÊNCIAS E RISCOS

### P0 — Críticos (Bloqueiam Produção)

| ID | Risco | Local | Ação |
|----|-------|-------|------|
| **P0-1** | `PAGBANK_WEBHOOK_SECRET` vazio — webhook PagBank falha em produção | `.env` linha 77, `pagbank.ts:117` | Configurar secret real |
| **P0-2** | `.env.example` tem `PAYMENT_ACTIVE_GATEWAY="pagbank"` (errado para prod) | `.env.example:84` | Corrigir para `ggpixapi` |
| **P0-3** | GGPIXAPI webhook sem HMAC — vulnerável a spoofing | `ggpix-adapter.ts:292` | Implementar assinatura ou validar IP fonte |

### P1 — Altos (Degradam Confiabilidade)

| ID | Risco | Local | Ação |
|----|-------|-------|------|
| **P1-1** | Idempotência GGPIXAPI só por `externalId` — sem dedup server-side robusto | `ggpix-adapter.ts:292` | Adicionar tabela `ggpix_webhook_events` com UNIQUE |
| **P1-2** | `paymentRepository` usa Map em memória (`databaseRows`) — não persiste entre reinícios | `payment-repository.ts`, `pagbank.ts:207` | Migrar 100% para Supabase `payment_orders` |
| **P1-3** | `gatewayManager.activeOverride` em memória — não persiste entre reinícios | `gateway-manager.ts:86` | Persistir no ConfigService/DB |
| **P1-4** | CreditCardForm usa `window.PagSeguroDirectPayment` — SDK carrega externamente | `CreditCardForm.tsx:23,56` | Verificar CSP, fallback se SDK indisponível |

### P2 — Médios (Qualidade/Observabilidade)

| ID | Risco | Local |
|----|-------|-------|
| **P2-1** | Logs de webhook não incluem `caseId` consistentemente | `payments.ts:573, 712` |
| **P2-2** | `effectivePrice` no frontend tem 3 fallbacks — pode divergir do backend | `DocumentCheckoutStep.tsx:128-132` |
| **P2-3** | Health check PagBank faz `fetch('https://api.pagbank.com/')` — não valida token | `health-service.ts:1055` |

---

## 16. TESTES EXISTENTES

| Arquivo | Cobertura |
|---------|-----------|
| `tests/onboarding.spec.ts:453` | PIX QR load — **SKIPPED** (requer PagBank real) |
| `tests/audit/commercial-integrity.test.ts` | Catálogo comercial, math descontos — **PASS** |
| `tests/invariants/no-raw-secrets-in-bundle.test.ts` | Verifica secrets não vazam no bundle — **PASS** |

**Gap:** Nenhum teste E2E de webhook (PagBank ou GGPIXAPI), nenhum teste de troca de gateway, nenhum teste de idempotência.

---

## 17. PLANO DE CORREÇÃO (FASE 2)

### 17.1 Imediato (Pré-Testes)
- [ ] Corrigir `.env.example`: `PAYMENT_ACTIVE_GATEWAY="ggpixapi"`
- [ ] Configurar `PAGBANK_WEBHOOK_SECRET` real em `.env` (produção)
- [ ] Adicionar `GGPIX_WEBHOOK_SECRET` (se GGPIX suportar) ou validar IP origem

### 17.2 Separação Explícita GGPIX / PagBank Sandbox
- [ ] Remover `prodAuth` bypass — usar config explícita `PAYMENT_MODE=production|sandbox`
- [ ] Criar `PaymentEnvironment` enum: `production | sandbox`
- [ ] Garantir que `PAGBANK_ENV=production` **nunca** coexista com `PAYMENT_ACTIVE_GATEWAY=ggpixapi`
- [ ] Documentar: PagBank = apenas sandbox/teste; GGPIXAPI = apenas produção

### 17.3 Persistência e Idempotência
- [ ] Migrar `paymentRepository` para Supabase 100% (remover Map em memória)
- [ ] Criar tabela `ggpix_webhook_events` com `UNIQUE(external_id, status)`
- [ ] Persistir `gatewayManager.activeOverride` no ConfigService

### 17.4 Testes Automatizados (FASE 3)
- [ ] Unit: `gateway-manager.ts` (resolução, switch, produção block)
- [ ] Unit: `ggpix-adapter.ts` (createPix, getStatus, processWebhook)
- [ ] Unit: `pagbank.ts` (createPixOrder, createCreditCardOrder, verifyWebhookSignature)
- [ ] Integration: Webhook PagBank → case update (mock HMAC)
- [ ] Integration: Webhook GGPIXAPI → case update (mock payload)
- [ ] E2E: Fluxo onboarding → DocumentCheckoutStep → PIX → webhook → defesa pronta

### 17.5 Testes Reais Sandbox (FASE 4)
- [ ] Configurar PagBank Sandbox real (token válido)
- [ ] Testar PIX Sandbox ponta a ponta (QR → pagamento simulado → webhook)
- [ ] Testar Cartão Sandbox (token de teste aprovado/negado)
- [ ] Validar HMAC webhook em sandbox

### 17.6 Teste Controlado GGPIX Produção (FASE 5)
- [ ] Transação PIX real de baixo valor (R$ 1,00)
- [ ] Verificar webhook recebido, case atualizado, defesa gerada
- [ ] Reconciliação `payment_orders` no Supabase

### 17.7 Teste Webhook (FASE 6)
- [ ] Simular webhook duplicado → idempotência
- [ ] Simular webhook assinatura inválida → rejeição (PagBank)
- [ ] Simular webhook GGPIXAPI spoofed → validação IP/origem

### 17.8 Auditoria Final (FASE 7)
- [ ] Rodar suite completa
- [ ] Verificar logs de auditoria (`auditLogs`, `commercialService`)
- [ ] Confirmar `payment_orders` consistente com webhooks
- [ ] Documentar runbook de troca de gateway em produção

---

## 18. ARQUIVOS-CHAVE PARA REFERÊNCIA

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/server/routes/payments.ts` | Rotas HTTP, webhook handlers, gateway switch |
| `src/server/integrations/gateway/gateway-manager.ts` | Resolução gateway ativo, registry, status |
| `src/server/integrations/gateway/ggpix-adapter.ts` | Adapter GGPIXAPI (PIX only) |
| `src/server/integrations/gateway/pagbank-adapter.ts` | Adapter PagBank (PIX + Cartão) |
| `src/server/integrations/pagbank.ts` | Service PagBank direto (legacy, usado por cartão) |
| `src/server/db/payment-repository.ts` | Persistência dual-engine (orders + webhooks) |
| `src/components/checkout/CheckoutView.tsx` | Admin-only simulation UI |
| `src/components/onboarding/generation/DocumentCheckoutStep.tsx` | User-facing checkout (onboarding step 10) |
| `src/components/checkout/CreditCardForm.tsx` | PagSeguro Direct Payment SDK integration |
| `src/server/config/config-service.ts:298-377` | Config schema pagamentos (Admin UI) |

---

## 19. PRÓXIMOS PASSOS RECOMENDADOS

1. **Aprovar este audit** — Validar achados com time
2. **Executar FASE 2** — Correções P0/P1 acima
3. **Rodar `npm run test`** — Garantir baseline verde
4. **Agendar FASE 4** — Teste real PagBank Sandbox (requer credenciais válidas)
5. **Agendar FASE 5** — Teste controlado GGPIX produção (R$ 1,00)
6. **Atualizar `.env.example`** — Refletir configuração de produção correta

---

*Gerado em 2026-08-29 via auditoria automatizada + revisão manual*
*Auditor: @agent-testing + @backend + @frontend*