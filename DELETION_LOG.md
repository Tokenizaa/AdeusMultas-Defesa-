# DELETION LOG — Correção Separação Gateway GGPIX / PagBank

 Corrigida separação entre gateway de PRODUÇÃO (GGPIXAPI) e gateway de TESTE (PagBank Sandbox) no backend do projeto AdeusMultas-Defesa-.

## Código Removido

### 1. ggpix-adapter.ts (linha 142)
- **REMOVER:** `const amountInCents = input.amountInCents || 8990;`
- **MOTIVO:** Valor hardcoded `8990` como fallback removido. Agora retorna erro se `amountInCents` não for número válido (> 0).
- **SUBSTITUÍDO POR:** Validação explícita com throw de erro para valores inválidos.

### 2. payments.ts (linha 285) — fallback de gateway na consulta de status PIX
- **REMOVER:** `const order: GatewayId[] = [gatewayManager.getActiveGatewayId(), 'pagbank', 'ggpixapi'];`
- **MOTIVO:** Array de fallback automático para PagBank removido. Em produção, não é permitido fallback para PagBank Sandbox.
- **SUBSTITUÍDO POR:** Consulta exclusiva ao gateway ativo. Se GGPIX falhar, retornar erro operacional.

## Código Adicionado

### 3. gateway-manager.ts
- **ADICIONAR:** Método `isProductionGateway(id: GatewayId): boolean`
  - Retorna `true` SOMENTE para `'ggpixapi'`
- **ALTERAR:** `resolveActiveGatewayIdFromEnv()`
  - Em produção (`NODE_ENV === 'production'`): se `PAYMENT_ACTIVE_GATEWAY` não for `'ggpixapi'`, FORÇA retorno `'ggpixapi'`
  - Em dev/teste: mantém comportamento atual (fallback PagBank)

### 4. payments.ts — proteções de gateway PagBank
- **ADICIONAR:** Verificação de role admin nas rotas:
  - `POST /pix/create` (e alias `/pagbank/orders`): se gateway ativo for `'pagbank'`, exige role `admin`; senão retorna 403
  - `POST /credit-card/create`: se gateway ativo for `'pagbank'`, exige role `admin`; senão retorna 403
- **ADICIONAR:** Logs seguros no fluxo de pagamento (serviceType, commercialId, baseAmount, discounts, finalAmount, gateway, environment, userRole)
  - NÃO logar API keys, tokens ou secrets

## Arquivos Alterados

1. `src/server/integrations/gateway/gateway-manager.ts`
2. `src/server/integrations/gateway/ggpix-adapter.ts`
3. `src/server/routes/payments.ts`
## 2026-09-13 — Remoção do Onboarding V2 (erro estrutural)

**Decisão (usuário)**: o Onboarding V2 ("serviços/subserviços") foi um erro estrutural.
O canônico é o **V1** (`src/components/onboarding/OnboardingWizard.tsx` — ServiceStep +
USER_SITUATIONS, ativo em `/novo-caso` via App.tsx).

**Removidos**:
- `src/onboarding-v2/` (frontend órfão: UI/domain/application)
- `cloudflare/routes/onboarding-v2.ts` (+ desmontado do `cloudflare/worker.ts`)
- `src/server/routes/onboarding-v2.ts` (+ imports/mounts removidos de `src/server/app.ts`
  e `src/server/routes/onboarding.ts`)

**Validação**: build completo (vite + build-api Express + bundle worker) passou; dry-run 843 KiB.

**Observação (não removido)**: `src/onboarding/application/http-application.ts` (família
órfã `src/onboarding/`, sem importação ativa) ainda referencia endpoints `/api/onboarding-v2/*`.
Código morto, não compilado para produção — candidato a remoção futura junto de `src/onboarding/`.
