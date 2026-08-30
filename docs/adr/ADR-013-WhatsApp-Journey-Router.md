# ADR-013: WhatsApp Journey Router (P0.2 — Architectural Blocker)

## Status
Accepted

## Context
The omnichannel gateway (`messaging-service.ts`) currently processes ALL incoming messages through a single `processIncomingMessage()` flow that triggers an AI auto-response for B2C conversations. However, B2B leads (despachantes/advogados from `marketing_leads` with `audience='B2B'`) must NOT receive B2C auto-responses, must NOT have their cadence state downgraded from `responded`→`sent`, and must follow a separate `B2B_RELATIONSHIP` journey.

The router must sit **inside/within** `messaging-service.ts`, called **before** any auto-response logic in `processIncomingMessage()`.

## Decision

### 1. Router Location & Interface
- **New file**: `src/server/services/whatsapp-journey-router.ts`
- **Export**: `whatsappJourneyRouter` (singleton instance)
- **Main function**: `resolveJourney(incoming: NormalizedIncomingMessage): Promise<JourneyType>`
- **JourneyType enum**: `'B2C_AUTO' | 'B2B_RELATIONSHIP'`

### 2. Resolution Logic
```typescript
async function resolveJourney(incoming: NormalizedIncomingMessage): Promise<JourneyType> {
  // 1. Normalize phone from incoming.externalContactId
  const phone = normalizePhone(incoming.externalContactId);
  
  // 2. Query marketing_leads where phone_normalized = phone AND audience = 'B2B'
  const lead = await supabase
    .from('marketing_leads')
    .select('id, lead_type, audience')
    .eq('phone_normalized', phone)
    .eq('audience', 'B2B')
    .maybeSingle();
  
  // 3. If match → B2B_RELATIONSHIP, else → B2C_AUTO
  return lead ? 'B2B_RELATIONSHIP' : 'B2C_AUTO';
}
```

### 3. Integration Point in `messaging-service.ts`
In `processIncomingMessage()`, **after** contact/lead/conversation resolution (line ~855) but **BEFORE** the AI auto-response trigger (line ~895):

```typescript
// 4b. WhatsApp Journey Router (P0.2)
const journey = await whatsappJourneyRouter.resolveJourney(incoming);

// Store journey type on conversation for downstream logic
conversation.metadata = { ...conversation.metadata, journeyType: journey };

// 5. AI Auto-Response — ONLY for B2C_AUTO
if (conversation.aiMode === 'auto' && incoming.text && journey === 'B2C_AUTO') {
  setImmediate(async () => {
    await this.triggerAIAutoResponse(conversation!, contact!, incoming.text || '');
  });
}

// For B2B_RELATIONSHIP: persist inbound, emit event, but NO auto-response
// Cadence state in marketing_lead_campaigns remains 'responded' (not downgraded)
```

### 4. Owner
- **Primary**: `@backend` (owns `messaging-service.ts` and new router file)
- **Database queries**: `@banco` (ensures `marketing_leads` has proper indexes on `phone_normalized` + `audience`)

### 5. Testing
- Unit tests for `whatsapp-journey-router.ts` with mocked Supabase
- Integration test: send Evolution webhook with B2B lead phone → verify no auto-response sent
- Integration test: send Evolution webhook with non-B2B phone → verify auto-response sent

## Consequences

### Benefits
- Clean separation of B2B vs B2C journeys at the gateway level
- No auto-response pollution for B2B prospects
- Cadence integrity preserved for B2B automation
- Single decision point, testable in isolation

### Risks
- Adds DB query to hot path (mitigated: `phone_normalized` + `audience` indexed)
- Router must be fast (<50ms p99)

## References
- P0.2 in auditoria-marketingos-b2c-b2b-whatsapp.md
- ADR-001 (Agent Architecture Patterns) — shared kernel ownership
- messaging-service.ts lines 758-902 (processIncomingMessage)