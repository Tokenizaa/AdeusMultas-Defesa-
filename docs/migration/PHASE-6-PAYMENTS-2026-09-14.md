# Fase 6 — Payments / Webhooks — 2026-09-14

## Implementação

- preço e descontos são resolvidos pelo `cloudflare/routes/commercial.ts`;
- `payments.ts` não mantém catálogo ou preço fallback próprio;
- criação PIX e cartão grava `payment_orders` no Supabase;
- polling PIX consulta `payment_orders` no Supabase;
- webhook PagBank consulta a ordem persistida por `reference_id`;
- transição `PAID` atualiza `payment_orders` e `cases`;
- webhook repetido após `PAID` retorna `isDuplicate=true` usando o estado persistido;
- não existe mais `ordersStore` ou `processedWebhookIds` no runtime de pagamentos;
- assinatura PagBank continua obrigatória em produção;
- pagamentos continuam sandbox quando configurados como sandbox.

## Gate

Ainda pendente até o CI confirmar testes, typecheck e build. Depois disso deve ser feita a validação real do fluxo PIX em produção/homologação e reconciliação Supabase.

## Commits

- `5467887` — persistência inicial em `payment_orders`
- `c7721f4` — resolução comercial exclusivamente pelo resolver canônico
- `3516497` — teste de idempotência persistida do webhook
