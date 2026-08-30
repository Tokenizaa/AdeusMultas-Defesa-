# Decision Log — DefesAi

> Registro cronológico de decisões arquiteturais tomadas pelo @supervisor.
> Cada entrada referencia o ADR correspondente.

---

## 2026-08-29 — ADR-013: WhatsApp Journey Router (P0.2)

**Decisão**: Criar router de jornada WhatsApp como módulo interno em `src/server/services/whatsapp-journey-router.ts`, invocado dentro de `messaging-service.ts::processIncomingMessage()` **antes** do auto-responder de IA.

**Detalhes**:
- Resolve telefone normalizado contra `marketing_leads` com `audience='B2B'`
- Match → jornada `B2B_RELATIONSHIP` (sem auto-resposta B2C, sem rebaixar cadence `responded→sent`)
- No match → jornada `B2C_AUTO` (fluxo atual in-memory)
- Owner: `@backend` (implementação) + `@banco` (índices em `phone_normalized` + `audience`)

**ADR**: [ADR-013-WhatsApp-Journey-Router.md](ADR-013-WhatsApp-Journey-Router.md)

---

## 2026-08-29 — ADR-014: Campaign Deduplication Cleanup

**Decisão**: APROVADA limpeza destrutiva das 6 campanhas duplicadas "Campanha Inaugural".

**Plano**:
1. `@banco` executa migration: `UPDATE editorial_content SET campaign_id = NULL WHERE campaign_id IN (SELECT id FROM marketing_campaigns WHERE name = 'Campanha Inaugural')` + `DELETE FROM marketing_campaigns WHERE name = 'Campanha Inaugural'`
2. `@backend` + `@frontend` recriam campanhas corretas via UI/API com: `audience='B2B'`, `lead_type` correto, imagens válidas

**ADR**: [ADR-014-Campaign-Deduplication-Cleanup.md](ADR-014-Campaign-Deduplication-Cleanup.md)

---

## 2026-08-29 — ADR-015: Global Frequency Cap / Contact Outbox (P3.3)

**Decisão**: ADIADA implementação até conclusão do Router (ADR-013).

**Rationale**: O ponto de enforcement é o gateway omnichannel (`messaging-service.sendMessage()`), que o router define. Frequência por jornada (B2B vs B2C) pode diferir. Schema depende do design do router.

**ADR**: [ADR-015-Frequency-Global-Contact-Outbox-Deferred.md](ADR-015-Frequency-Global-Contact-Outbox-Deferred.md)

---

## Próximos Handoffs

| Task | Agent | Contexto |
|------|-------|----------|
| Implementar `whatsapp-journey-router.ts` + integrar em `messaging-service.ts` | `@backend` | ADR-013, arquivo alvo: `src/server/services/messaging-service.ts` (linhas 895-900) |
| Migration limpeza campanhas duplicadas | `@banco` | ADR-014, SQL: UPDATE editorial_content + DELETE marketing_campaigns |
| Recriar campanhas corretas via API/UI | `@backend` + `@frontend` | ADR-014, novos parâmetros: `audience='B2B'`, `lead_type` correto, imagens válidas |
| Verificar índices `phone_normalized` + `audience` em `marketing_leads` | `@banco` | ADR-013, necessário para performance do router (<50ms p99) |