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
| 2 | OCR | ⬜ | OCR sem Vercel |
| 3 | Knowledge / RAG | ⬜ | RAG sem Vercel |
| 4 | AI | ⬜ | Análise + geração sem Vercel |
| 5 | Commercial / ofertas | ⬜ | Preço único |
| 6 | Payments / webhooks | ⬜ | Pagamento real sem Vercel |
| 7 | Documents / Storage | ⬜ | PDF persistido sem Vercel |
| 8 | Notifications / Audit | ⬜ | Persistência definitiva |
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
