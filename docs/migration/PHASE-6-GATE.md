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

## Correção de autenticidade PagBank

A implementação foi corrigida para a especificação atual da API Order do PagBank:

- header recebido: `x-authenticity-token`
- assinatura: SHA-256 de `${tokenDaConta}-${payloadBruto}`
- comparação feita sobre o corpo bruto, sem reformatar o JSON
- em produção, ausência de assinatura ou token rejeita a notificação

Fonte oficial: documentação PagBank de confirmação de autenticidade da notificação.

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

## Testes adicionados

`cloudflare/pagbank.signature.test.ts` cobre:

1. assinatura SHA-256 válida;
2. assinatura com e sem prefixo `sha256=`;
3. assinatura forjada;
4. ausência de assinatura em produção.

## CI

O CI global anterior falhou nos testes legados. A nova correção disparou o run `34904283509` (`CI/CD Pipeline`), ainda em execução no momento deste registro.

## Bloqueador restante para declarar CONCLUÍDA

Ainda é necessária uma execução real/homologada desta implementação contra o fluxo PagBank/Cloudflare, com evidência de:

1. criação de uma nova ordem PIX pelo Worker;
2. registro correspondente em `payment_orders`;
3. confirmação/recepção do webhook `PAID` usando `x-authenticity-token` real;
4. reconciliação de `payment_orders` e `cases`;
5. repetição do webhook sem nova transição.

Até essa prova externa ser concluída, a Fase 6 permanece **RUNTIME CONCLUÍDO — GATE PENDENTE**. Não marcar a fase como concluída apenas com testes mockados ou com registros históricos do banco.
