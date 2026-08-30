# ADR-015: Global Frequency Cap / Contact Outbox (P3.3) — Deferred

## Status
Deferred (Pending Router Implementation)

## Context
The marketing audit (P3.3) identifies a gap: **no global frequency cap per phone number** across all campaigns/channels. A lead could receive messages from multiple campaigns simultaneously (B2B prospecção + B2C editorial + transactional), violating LGPD/contact fatigue best practices.

The proposed solution is a `contact_outbox` table tracking every outbound send per normalized phone, with a sliding window (e.g., max 1 msg/24h per phone globally).

## Decision
**DEFER implementation until WhatsApp Journey Router (ADR-013) is complete.**

### Rationale
1. **Router is the enforcement point** — frequency check must happen at the gateway (`messaging-service.ts` → `sendMessage()`) for ALL channels, not just B2B automation worker
2. **Router defines the journey** — B2B_RELATIONSHIP vs B2C_AUTO may have different frequency rules
3. **Schema depends on router design** — `contact_outbox` needs to know: per phone? per contact? per journey type? The router clarifies this
4. **Single source of truth** — all outbound goes through `messaging-service.sendMessage()`; frequency guard belongs there

### Next Steps (after ADR-013 lands)
1. Design `contact_outbox` schema with `@banco`
2. Add frequency check in `messaging-service.sendMessage()` (before adapter dispatch)
3. Configure limits via `app_settings` (e.g., `max_msgs_per_phone_per_24h: 1`)
4. Add bypass for transactional/opt-in critical messages

## Owner
- **Future**: `@backend` (enforcement in messaging-service) + `@banco` (schema)

## References
- P3.3 in auditoria-marketingos-b2c-b2b-whatsapp.md
- ADR-013 (WhatsApp Journey Router) — prerequisite
- messaging-service.ts `sendMessage()` (lines 911-980) — enforcement point