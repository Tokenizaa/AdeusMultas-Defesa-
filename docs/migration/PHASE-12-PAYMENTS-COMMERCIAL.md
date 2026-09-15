# Fase 12 — Payments / Comercial no Cloudflare

Data: 2026-09-15

## Objetivo

Migrar a superfície HTTP de payments e precificação comercial do runtime legado para o Cloudflare Worker, mantendo o PagBank como gateway e o Supabase como fonte de verdade de ordens e casos.

## Implementado

- `GET /api/payments/resolve-price` → preço calculado via `commercialRoutes` no Worker.
- `POST /api/payments/pix/create` → ordem PIX PagBank + persistência em `payment_orders`.
- `POST /api/payments/credit-card/create` → ordem cartão PagBank + persistência em `payment_orders`.
- `GET /api/payments/pix/status/:txId` → consulta de ordem persistida (escopo do usuário autenticado).
- `POST /api/webhooks/pagbank` → webhook canônico no Worker com validação de assinatura (`x-authenticity-token`) via `verifyWebhookSignature`.
- Idempotência: webhook PAID repetido não realiza transição duplicada (`neq('status','PAID')`).
- Preço é sempre **server-authoritative**: `credit-card/create` rejeita `amount` divergente da oferta comercial.
- Sem fallback para Vercel.

## Fontes de verdade

- `payment_orders` no Supabase: ordens persistidas, transição `PAID` e `paid_at`.
- `cases.is_paid`/`paid_at`: atualizados apenas quando o webhook confirma pagamento.
- Ofertas e preços: `commercialRoutes` (service_pricings/promotion_campaigns/coupons).

## Gate autoritativo

1. `resolve-price` sem `serviceType` → 400.
2. `pix/create` sem `caseId` → 400.
3. `credit-card/create` sem `cardToken` → 400.
4. `credit-card/create` com `amount` divergente da oferta → 400 (preço server-authoritative).
5. `pix/create` cria ordem PagBank e persiste `payment_orders`.
6. Webhook PAID transiciona uma vez; repetição é tratada como duplicata.
7. `cloudflare/routes/payments.test.ts` é a suíte autoritativa da Fase 12.
8. GitHub Actions deve executar a suíte e o deploy Cloudflare antes de fechar o gate.

## Configuração externa

Secrets/bindings necessários no ambiente Cloudflare:

- `PAGBANK_TOKEN` (ou token de sessão PagBank)
- `PAGBANK_WEBHOOK_SECRET` (assinatura do webhook)
- `PAYMENT_MODE` (`sandbox`/`production`)
- `APP_URL` (origem do webhook público)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`