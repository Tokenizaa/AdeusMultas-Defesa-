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
- validação de autenticidade usa o mecanismo SHA-256 documentado pelo PagBank
- não há `ordersStore`, `processedWebhookIds` ou `FALLBACK_PRICE` em `payments.ts`
- `cloudflare/routes/payments.test.ts` cobre primeiro webhook `PAID` e repetição do mesmo evento

## Correção de autenticidade PagBank

A implementação usa a especificação atual da API Order do PagBank:

- header recebido: `x-authenticity-token`
- assinatura: SHA-256 de `${tokenDaConta}-${payloadBruto}`
- comparação feita sobre o corpo bruto, sem reformatar o JSON
- em produção, ausência de assinatura ou token rejeita a notificação

Fonte oficial: documentação PagBank de confirmação de autenticidade da notificação. citeturn0search0

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

## Observação operacional — gate externo

A Fase 6 pode continuar sendo desenvolvida e auditada sem token real do PagBank. A homologação real depende da conclusão do cadastro/homologação da plataforma no PagBank e da disponibilização das credenciais necessárias.

Enquanto essas credenciais não estiverem disponíveis, a prova externa de:

1. criação de uma nova ordem PIX pelo Worker;
2. registro correspondente em `payment_orders`;
3. confirmação/recepção do webhook `PAID` real;
4. reconciliação de `payment_orders` e `cases`;
5. repetição do webhook sem nova transição;

fica registrada como **pendência externa de homologação PagBank**, e não como bloqueio técnico para as demais fases da migração.

## CI

O CI global pode conter falhas legadas do backend Express/Vercel que pertencem às fases posteriores de remoção do legado. Os testes específicos do fluxo Cloudflare/PagBank devem ser avaliados separadamente.

Até a homologação real, a Fase 6 permanece **RUNTIME CONCLUÍDO — GATE PENDENTE (PagBank)**.
