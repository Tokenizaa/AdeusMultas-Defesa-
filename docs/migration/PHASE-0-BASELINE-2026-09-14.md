# Fase 0 — Baseline, inventário e congelamento

**Data:** 2026-09-14  
**Status:** CONCLUÍDA  
**Epic:** #15 — Migração 100% Cloudflare e remoção completa do legado Vercel

## 1. Baseline autoritativo

A referência da execução da migração é o estado de `main` imediatamente antes da documentação desta Fase 0:

- **Baseline funcional:** `5882e91ca2ed9eda7304ad0cfb1f03a3682834f0`
- **Documentação da migração:** `e9e374bda5cac672a69046c669a52d0b615c1c28`
- **Roadmap:** `85ca69ab12eab421e4a01e1743a09a513e2ba756`

A partir desta fase, nenhuma nova funcionalidade deve ser adicionada ao backend legado `api/index.mjs`.

## 2. Estado arquitetural encontrado

### Cloudflare Worker

O Worker é `cloudflare/worker.ts` e já possui módulos nativos para:

- Auth
- Onboarding
- Cases
- Payments
- Notifications
- Audit
- Settings
- Admin
- Marketing

Também possui fallback transitório para `/api/admin/*` e `/api/marketing/*` via `proxyToVercel`.

### Configuração Cloudflare

`wrangler.jsonc` ainda contém:

- `API_ORIGIN_PRIMARY=https://adeusmulta.defesai.com.br`
- `API_ORIGIN_FALLBACK=https://www.defesai.shop`
- cron `*/5 * * * *`

O `API_ORIGIN_FALLBACK` é legado e só poderá ser removido após as fases de migração e o gate final.

### Backend legado

O repositório ainda contém:

- `api/index.mjs`
- tamanho aproximado: **1,58 MB**
- runtime Express
- scripts de build/start que ainda geram/executam o backend legado

O arquivo não será removido nesta fase.

## 3. Matriz autoritativa de famílias de API

| Família | Estado | Destino final | Fase |
|---|---|---|---:|
| health | Cloudflare | Cloudflare | 0 / existente |
| auth | Cloudflare | Cloudflare | existente |
| onboarding | Cloudflare | Cloudflare | existente |
| cases | Cloudflare | Cloudflare | existente |
| payments | Cloudflare parcial | Cloudflare | 6 |
| notifications | Cloudflare, memória | Cloudflare + Supabase | 8 |
| audit | Cloudflare, memória | Cloudflare + Supabase | 8 |
| settings | Cloudflare | Cloudflare | existente |
| admin | híbrido | Cloudflare | 9 |
| marketing | híbrido | Cloudflare | 10 |
| OCR | Vercel-only | Cloudflare | 2 |
| Knowledge / RAG | Vercel-only | Cloudflare | 3 |
| AI | Vercel-only | Cloudflare | 4 |
| Commercial / Offers | Vercel-only | Cloudflare | 5 |
| Documents / Documenso | Vercel-only/parcial | Cloudflare | 7 |
| Meta | Vercel-only/parcial | Cloudflare | 10 |
| WhatsApp / communication | Vercel-only | Cloudflare | 11 |
| marketing-automation | Vercel-only | Cloudflare ou remoção | 12 |
| scraping | Vercel-only | Cloudflare ou remoção | 12 |
| transit-database | Vercel-only | Cloudflare ou remoção | 12 |
| sync/offline | Vercel-only | Cloudflare ou remoção | 12 |
| governance | Vercel-only | Cloudflare ou remoção | 12 |
| agents | Vercel-only | Cloudflare ou remoção | 12 |
| analytics | Vercel-only | Cloudflare | 13 |
| monitoring / logs | Vercel-only/parcial | Cloudflare | 13 |

## 4. Rotas Vercel-only identificadas

A auditoria do monólito identificou, entre outras, estas dependências que não podem ser perdidas durante a migração:

- `/api/ocr/analyze`
- `/api/ai/analyze-infraction`
- `/api/ai/generate-defense`
- `/api/ai/chat-consultant`
- `/api/ai/consult-traffic`
- `/api/offers/resolve`
- `/api/communication/whatsapp/send`
- `/api/transit-database/query`
- `/api/analytics/dashboard`
- `/api/sync/offline-batch`
- `/scrape`
- `/scrape/:jobId`
- `/scrape/:jobId/cancel`
- `/scrape/:jobId/results`
- `/scrapes`
- `/export`
- `/api/marketing-automation/status`
- `/api/marketing-automation/start`
- `/api/marketing-automation/pause`

A lista completa deverá ser refinada na Fase 1 por contrato e consumidor, antes de qualquer remoção.

## 5. Consumidores críticos conhecidos

### Golden Path

O fluxo crítico da aplicação depende de:

```text
login
  → onboarding
  → case
  → análise
  → pagamento PIX
  → confirmação
  → geração de defesa
  → documento
  → Storage
  → reconciliação Supabase
```

Portanto, OCR, Knowledge/RAG, AI, Commercial, Payments e Documents são classificados como **P0 funcional** para a migração.

### Admin / Marketing

Admin e Marketing não podem ser considerados 100% migrados enquanto `proxyToVercel` permanecer ativo.

## 6. Jobs, webhooks e integrações

Inventário inicial conhecido:

- Cloudflare Cron: `*/5 * * * *` configurado em `wrangler.jsonc`.
- PagBank webhook: já existe rota Worker para `/api/webhooks/pagbank`.
- Marketing publication cron: integrado ao runtime Cloudflare, mas ainda deve ser validado contra todos os consumidores.
- Integrações Meta e comunicação ainda possuem dependências legadas a migrar.

Nenhum cron/webhook crítico será declarado independente do Vercel até validação em produção.

## 7. Dependências de runtime legado

`package.json` ainda contém dependências explicitamente associadas ao runtime legado, incluindo:

- `express`
- `@types/express`
- `helmet`
- `express-rate-limit`
- `bullmq`
- `ioredis`
- scripts `start: node api/index.mjs`
- `postinstall/build: scripts/build-api.mjs`

Estas dependências **não devem ser removidas na Fase 0**, porque podem possuir consumidores ainda não migrados.

## 8. Regra de congelamento

A partir deste baseline:

1. `api/index.mjs` é somente fonte de referência/paridade.
2. Não adicionar novas features ao backend Vercel.
3. Correções críticas no legado devem ser excepcionais e registradas no Epic #15.
4. Novas implementações devem ser feitas no destino Cloudflare.
5. Remoções só ocorrem após prova de consumidor migrado ou rota explicitamente descartada.

## 9. Gates da Fase 0

- [x] Baseline registrado.
- [x] Worker atual registrado.
- [x] Configuração Wrangler registrada.
- [x] Backend legado identificado.
- [x] Famílias de API classificadas.
- [x] Rotas Vercel-only críticas identificadas.
- [x] Golden Path identificado como consumidor P0.
- [x] Cron/webhooks conhecidos registrados.
- [x] Dependências de runtime legado registradas.
- [x] Regra de congelamento definida.

## 10. Resultado

**Fase 0 aprovada para avançar à Fase 1.**

O legado permanece ligado. Nenhum proxy/fallback será removido ainda.

O próximo gate obrigatório é a criação dos **contratos canônicos e matriz rota → consumidor → contrato → destino**, que constituirá a Fase 1.
