# Fase 6 — Payments / Webhooks — Gate

Data: 2026-09-14

## Escopo

Fechar o ciclo de pagamento no Cloudflare Worker usando o Supabase como estado persistente e PagBank como gateway, sem estado de pagamento em memória e sem preço fallback.

## Implementação verificada

- `cloudflare/routes/payments.ts`
  - `POST /api/payments/pix/create`
  - `GET /api/payments/pix/status/:txId`
  - `POST /api/payments/credit-card/create`
  - `POST /api/webhooks/pagbank`
- oferta comercial resolvida por `cloudflare/routes/commercial.ts`
- ordens persistidas em `payment_orders`
- webhook `PAID` usa transição condicional persistida (`status != PAID`)
- atualização do caso só ocorre quando a transição para `PAID` foi efetivamente realizada
- não há `ordersStore`, `processedWebhookIds` ou `FALLBACK_PRICE` em `payments.ts`
- `cloudflare/routes/payments.test.ts` cobre primeiro webhook `PAID` e repetição do mesmo evento

## Verificação do banco de produção

Projeto Supabase: `llmxnpgjpxcvyrqjkfwb`

Consulta de reconciliação em 2026-09-14:

- `payment_orders`: 14 registros
- `payment_orders` com `PAID`: 14
- `payment_orders` não pagos: 0
- casos vinculados: 14
- casos vinculados com `is_paid = true`: 14
- casos vinculados sem pagamento: 0

Esses dados comprovam consistência do estado persistido existente, mas não constituem sozinhos uma nova homologação do Worker desta rodada.

## CI

O gate de onboarding `34901352793` falhou antes dos testes por usar `npm ci` em um repositório sem `package-lock.json`. O workflow foi corrigido para usar `bun install --frozen-lockfile`, alinhado ao `bun.lock` do projeto.

## Bloqueador restante para declarar CONCLUÍDA

Ainda é necessária uma execução real/homologada desta implementação contra o fluxo PagBank/Cloudflare, com evidência de:

1. criação de uma nova ordem PIX pelo Worker;
2. registro correspondente em `payment_orders`;
3. confirmação/recepção do webhook `PAID`;
4. reconciliação de `payment_orders` e `cases`;
5. repetição do webhook sem nova transição.

Até essa prova externa ser concluída, a Fase 6 permanece **RUNTIME CONCLUÍDO — GATE PENDENTE**. Não marcar a fase como concluída apenas com testes mockados ou com registros históricos do banco.
