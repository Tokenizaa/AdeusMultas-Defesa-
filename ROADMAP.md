# Adeus Multa — Roadmap

## Migração 100% Cloudflare / remoção do legado Vercel

Documento executivo: [`docs/architecture/MIGRACAO-100-CLOUDFLARE.md`](docs/architecture/MIGRACAO-100-CLOUDFLARE.md)  
Baseline e evidências: [`docs/migration/PHASE-0-BASELINE-2026-09-14.md`](docs/migration/PHASE-0-BASELINE-2026-09-14.md)

**Meta final:** Cloudflare Worker + Supabase como arquitetura operacional única, sem proxy, fallback ou backend Vercel legado.

### Execução

| Fase | Escopo | Status | Gate |
|---|---|---|---|
| 0 | Baseline, inventário e congelamento | **CONCLUÍDA** | Inventário autoritativo |
| 1 | Contratos e kernel compartilhado | **CONCLUÍDA** | Contratos canônicos |
| 2 | OCR | **CONCLUÍDA** | OCR sem Vercel |
| 3 | Knowledge / RAG | **RUNTIME CONCLUÍDO — corpus pendente** | RAG sem Vercel |
| 4 | AI | **RUNTIME CONCLUÍDO — paridade pendente** | Análise + geração sem Vercel |
| 5 | Commercial / ofertas | **RUNTIME CONCLUÍDO — gate pendente** | Preço único |
| 6 | Payments / webhooks | **RUNTIME CONCLUÍDO — GATE EXTERNO PENDENTE (PagBank)** | Pagamento real sem Vercel |
| 7 | Documents / Storage | **RUNTIME CONCLUÍDO — gate pendente** | PDF persistido sem Vercel |
| 8 | Notifications / Audit | **RUNTIME CONCLUÍDO — gate CI/deploy pendente** | Persistência definitiva |
| 9 | Admin | ⬜ | Admin 100% Cloudflare |
| 10 | Marketing / Meta | ⬜ | Publicação sem Vercel |
| 11 | WhatsApp / comunicação | ⬜ | Comunicação sem Vercel |
| 12 | Automação / scraping / auxiliares | ⬜ | Rotas restantes classificadas |
| 13 | Analytics / monitoring / logs | ⬜ | Observabilidade sem Vercel |
| 14 | Frontend exclusivamente Cloudflare | ⬜ | 0 chamadas → Vercel |
| 15 | Remoção do proxy/fallback | ⬜ | 0 `proxyToVercel` |
| 16 | Remoção do backend legado | ⬜ | 0 `api/index.mjs` |
| 17 | Validação final / desligamento | ⬜ | Golden Path com Vercel off |

## Regras

- Não implementar novas features no backend Vercel.
- Não remover código legado sem prova de ausência de consumidores.
- Cada fase deve produzir evidência de teste e commit verificável.
- Não duplicar domínio em versões paralelas.
- A migração só termina quando o Golden Path funcionar com Vercel indisponível.
- Gates externos de terceiros podem permanecer pendentes sem bloquear fases independentes, desde que a dependência esteja documentada e não seja mascarada como concluída.

## Definition of Done

- [ ] 100% das rotas classificadas.
- [ ] 100% das rotas necessárias migradas ou removidas.
- [ ] 0 chamadas frontend → Vercel.
- [ ] 0 proxy/fallback Worker → Vercel.
- [ ] 0 `API_ORIGIN_FALLBACK`.
- [ ] 0 `proxyToVercel`.
- [ ] 0 `api/index.mjs`.
- [ ] 0 Express runtime legado.
- [ ] 0 cron/webhook crítico no Vercel.
- [ ] OCR/RAG/AI/Commercial/Payments/Documents/Storage sem Vercel.
- [ ] Notifications/Audit persistentes.
- [ ] Admin/Marketing/Meta/WhatsApp sem Vercel.
- [ ] Golden Path aprovado com Vercel indisponível.
- [ ] Busca negativa sem referências operacionais ao Vercel.

## Evidência Fase 4

- `cloudflare/routes/ai.ts`
- `cloudflare/routes/ai.test.ts`
- `docs/migration/PHASE-4-AI-2026-09-14.md`
- geração via `@cf/openai/gpt-oss-20b`
- contexto jurídico recuperado pelo Vectorize antes da geração

A fase não é declarada como paridade funcional final enquanto os consumidores reais e o corpus jurídico não forem validados em produção.

## Evidência Fase 5

- `cloudflare/routes/commercial.ts`
- `cloudflare/routes/commercial.test.ts`
- `docs/migration/PHASE-5-COMMERCIAL.md`
- resolução de ofertas/preços via `service_pricings`, `promotion_campaigns`, `coupons` e `cases` no Supabase
- `POST /api/offers/resolve`
- `GET /api/payments/resolve-price`

A fase permanece com gate pendente até a prova de preço real no checkout e a busca negativa de consumidores Vercel.

## Evidência Fase 6

- `cloudflare/routes/payments.ts`
- `cloudflare/routes/payments.test.ts`
- `docs/migration/PHASE-6-GATE.md`
- `payment_orders` como fonte persistente das ordens
- polling PIX sem estado em memória
- webhook PagBank idempotente por estado persistido
- autenticidade PagBank por SHA-256
- preço do pagamento resolvido exclusivamente pelo catálogo comercial Cloudflare/Supabase

A Fase 6 permanece aberta somente para homologação externa PagBank. A ausência do token real neste momento não bloqueia a execução das fases independentes.

## Evidência Fase 7

- `cloudflare/routes/documents.ts`
- `cloudflare/routes/documents.test.ts`
- `docs/migration/PHASE-7-DOCUMENTS-STORAGE.md`
- bucket privado `case-documents`
- `POST /api/documents/:caseId/generate`
- `GET /api/documents/:id`
- PDF persistido no Supabase Storage
- SHA-256 do arquivo persistido em `documents`
- URL de download assinada
- evento `case.document.generated`

A Fase 7 permanece com gate pendente até prova real de geração, armazenamento, download, hash e reconciliação no ambiente Cloudflare.

## Evidência Fase 8

- `cloudflare/routes/notifications.ts`
- `cloudflare/routes/audit.ts`
- `cloudflare/routes/notifications.test.ts`
- `docs/migration/PHASE-8-NOTIFICATIONS-AUDIT.md`
- subscriptions persistidas em `notification_subscriptions`
- histórico e leitura persistidos em `notifications`
- audit logs persistidos em `audit_logs`
- RLS verificado nas três tabelas
- workflow Cloudflare condicionado ao teste de persistência

A Fase 8 permanece aberta somente até o workflow de deploy Cloudflare concluir testes, build e deploy com sucesso. Não há fallback Vercel nas rotas implementadas da fase.
