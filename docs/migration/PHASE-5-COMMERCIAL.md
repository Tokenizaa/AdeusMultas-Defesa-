# Fase 5 — Commercial / ofertas

**Status:** runtime migrado; gate de paridade operacional pendente.

## Objetivo

Retirar a resolução de oferta/preço do caminho Vercel sem criar um segundo catálogo comercial.

## Implementação

O Worker Cloudflare agora expõe:

- `GET /api/offers/health`
- `POST /api/offers/resolve`
- `GET /api/payments/resolve-price`

A fonte de dados é o catálogo existente do Supabase:

- `service_pricings`
- `promotion_campaigns`
- `coupons`
- `cases` para contagem dos documentos do usuário

A regra de preço preservada é a mesma do `OfferService`: normalização de procedure, preço-base, promoção vigente, benefício dos três primeiros documentos e cupom.

## Regra de migração

Não foi criada tabela paralela nem novo preço hardcoded no Worker. O Worker consulta o catálogo persistido e mantém o domínio comercial legado congelado até a prova de paridade.

## Testes

`cloudflare/routes/commercial.test.ts` cobre validação e health do endpoint. A resolução real depende do catálogo Supabase e deverá ser comprovada no ambiente de produção no gate.

## Gate

A fase só pode ser marcada como `CONCLUÍDA` depois de:

1. Cloudflare responder `/api/offers/resolve` com o catálogo real;
2. checkout usar essa resposta sem depender do backend Vercel;
3. preço final coincidir com o `OfferService` para os serviços comerciais;
4. nenhum consumidor crítico de oferta/preço continuar apontando para Vercel.

O `api/index.mjs` permanece congelado e não foi removido nesta fase.
