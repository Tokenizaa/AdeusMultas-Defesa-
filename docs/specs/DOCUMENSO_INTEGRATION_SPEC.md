# Documenso Integration — Implementation Specification for Adeus Multa

> **For @backend agent** — Use skill `documenso-integration` to implement.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Adeus Multa Backend                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Envelope     │  │ Webhook      │  │ Polling              │  │
│  │ Service      │  │ Handler      │  │ Job (5min interval)  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│         ▼                 ▼                      ▼              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  DocumensoClient                         │  │
│  │  (fetch + Bearer token, ts-rest types from @documenso/api)│  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                    HTTPS + Bearer Token
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Documenso (Self-Hosted)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   App       │  │  PostgreSQL │  │  MinIO/S3               │ │
│  │  (Docker)   │  │  (Docker)   │  │  (Docker)               │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│         │                                                    │
│         │  Webhook (HTTPS)                                    │
│         └────────────────────────────────────────────────────▶│
└─────────────────────────────────────────────────────────────────┘
```

---

## Endpoints to Implement

### Backend API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/documenso/envelopes` | POST | Create envelope for a case |
| `/api/documenso/envelopes/:id/send` | POST | Send envelope for signing |
| `/api/documenso/envelopes/:id/signing-url/:recipientId` | GET | Get signing URL for frontend |
| `/api/documenso/envelopes/:id/download` | GET | Download completed PDF |
| `/api/documenso/envelopes/:id/status` | GET | Get envelope status |
| `/api/documenso/webhook` | POST | Webhook receiver (raw body) |
| `/api/documenso/embedding-token/:envelopeId/:recipientId` | GET | Presign token for iframe embed |

### Documenso API Calls (via DocumensoClient)

| Documenso Endpoint | Method | Use Case |
|-------------------|--------|----------|
| `/api/v2/envelopes` | POST | Create envelope with PDF, recipients, fields |
| `/api/v2/envelopes/:id` | GET | Get envelope details |
| `/api/v2/envelopes/:id/send` | POST | Send for signing |
| `/api/v2/envelopes/:id/recipients/:recipientId/signing-url` | GET | Get signing URL |
| `/api/v2/envelopes/:id/download` | GET | Download completed PDF |
| `/api/v2/embedding/create-presign-token` | POST | Get embed token |

---

## Data Models

### Database Schema (Supabase)

```sql
-- Envelope tracking
CREATE TABLE documenso_envelopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documenso_envelope_id TEXT UNIQUE NOT NULL,  -- env_xxx
  external_id TEXT NOT NULL,                     -- case ID
  case_id UUID REFERENCES cases(id),
  status TEXT NOT NULL CHECK (status IN (
    'DRAFT', 'PENDING', 'COMPLETED', 'REJECTED', 'CANCELLED', 'EXPIRED'
  )),
  envelope_data JSONB NOT NULL,                  -- Full envelope snapshot
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documenso_envelopes_case ON documenso_envelopes(case_id);
CREATE INDEX idx_documenso_envelopes_external ON documenso_envelopes(external_id);
CREATE INDEX idx_documenso_envelopes_status ON documenso_envelopes(status);

-- Recipient tracking
CREATE TABLE documenso_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  envelope_id UUID REFERENCES documenso_envelopes(id) ON DELETE CASCADE,
  documenso_recipient_id TEXT NOT NULL,          -- rec_xxx
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  signing_status TEXT NOT NULL,
  signing_url TEXT,
  signed_at TIMESTAMPTZ,
  read_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documenso_recipients_envelope ON documenso_recipients(envelope_id);

-- Webhook idempotency
CREATE TABLE documenso_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT UNIQUE NOT NULL,                -- env_xxx:DOCUMENT_COMPLETED
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documenso_webhook_events_key ON documenso_webhook_events(event_key);
-- TTL via pg_cron or application cleanup
```

### TypeScript Types

```typescript
// Shared types (src/types/documenso.ts)

export type EnvelopeStatus = 
  | 'DRAFT' 
  | 'PENDING' 
  | 'COMPLETED' 
  | 'REJECTED' 
  | 'CANCELLED' 
  | 'EXPIRED';

export type RecipientRole = 'SIGNER' | 'REVIEWER' | 'APPROVER' | 'RECIPIENT';
export type RecipientSigningStatus = 
  | 'NOT_SENT' 
  | 'SENT' 
  | 'NOT_OPENED' 
  | 'OPENED' 
  | 'NOT_SIGNED' 
  | 'SIGNED' 
  | 'REJECTED' 
  | 'COMPLETED';

export type FieldType = 'SIGNATURE' | 'INITIAL' | 'DATE' | 'TEXT' | 'CHECKBOX';

export interface CreateEnvelopeRequest {
  title: string;
  documents: {
    name: string;
    fileUrl: string;  // Will be replaced with presigned URL
  }[];
  recipients: {
    email: string;
    name: string;
    role: RecipientRole;
    signingOrder: number;
  }[];
  fields: {
    documentId: string;      // Matches documents[index]
    recipientId: string;     // Matches recipients[index] 
    type: FieldType;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
    required?: boolean;
  }[];
  settings?: {
    expiresInDays?: number;
    signingOrder?: 'SEQUENTIAL' | 'PARALLEL';
    reminderEnabled?: boolean;
  };
  externalId: string;        // Our case ID
  metadata?: Record<string, any>;
}

export interface EnvelopeResponse {
  id: string;                // env_xxx
  title: string;
  status: EnvelopeStatus;
  externalId: string;
  documents: Array<{
    id: string;
    name: string;
    uploadUrl?: string;      // Presigned URL for upload
  }>;
  recipients: Array<{
    id: string;              // rec_xxx
    email: string;
    name: string;
    role: RecipientRole;
    signingOrder: number;
    signingStatus: RecipientSigningStatus;
    readStatus: string;
    signingUrl?: string;
    signedAt?: string;
  }>;
  fields: any[];
  settings: any;
  createdAt: string;
  completedAt?: string;
}

export interface WebhookPayload {
  event: string;
  payload: {
    id: string;
    title: string;
    status: EnvelopeStatus;
    externalId: string;
    completedAt?: string;
    recipients: Array<{
      id: string;
      email: string;
      name: string;
      role: RecipientRole;
      signingStatus: RecipientSigningStatus;
      signedAt?: string;
      readStatus: string;
      rejectionReason?: string;
    }>;
    createdAt: string;
  };
  createdAt: string;
  webhookEndpoint: string;
}
```

---

## Webhook Handler

### Events to Handle

| Event | Action |
|-------|--------|
| `DOCUMENT_SENT` | Update envelope status → PENDING, store signing URLs |
| `DOCUMENT_OPENED` | Update recipient readStatus → OPENED |
| `DOCUMENT_SIGNED` | Update recipient signingStatus → SIGNED, signedAt |
| `DOCUMENT_RECIPIENT_COMPLETED` | Update recipient signingStatus → COMPLETED |
| `DOCUMENT_COMPLETED` | **Primary** — Download PDF, update case, notify |
| `DOCUMENT_REJECTED` | Update envelope → REJECTED, store reason, notify |
| `DOCUMENT_CANCELLED` | Update envelope → CANCELLED |
| `RECIPIENT_EXPIRED` | Update envelope → EXPIRED, notify |

### Handler Implementation Requirements

```typescript
// POST /api/documenso/webhook
// - express.raw({ type: 'application/json' }) for HMAC verification
// - Verify X-Documenso-Secret header
// - Idempotency: CHECK/SET documenso_webhook_events table
// - Respond 200 within 10s (process async)
// - Map Documenso status → Internal status
// - On COMPLETED: download PDF, attach to case, update case status
// - On REJECTED/EXPIRED: notify case owner, allow re-send
```

---

## Polling Fallback Job

### Schedule: Every 5 minutes
### Query: All envelopes with status `PENDING` older than 10 minutes
### Action: GET `/api/v2/envelopes/:id` → if COMPLETED/REJECTED/EXPIRED → process same as webhook

```typescript
// Background job (cron or BullMQ)
async function pollPendingEnvelopes() {
  const pending = await db.documensoEnvelopes.findMany({
    where: { 
      status: 'PENDING',
      updatedAt: { lte: new Date(Date.now() - 10 * 60 * 1000) }
    }
  });

  for (const envelope of pending) {
    try {
      const current = await documensoClient.getEnvelope(envelope.documensoEnvelopeId);
      if (current.status !== 'PENDING') {
        await processEnvelopeStatusChange(envelope, current);
      }
    } catch (err) {
      logger.error('Polling failed', { envelopeId: envelope.id, err });
    }
  }
}
```

---

## Security Checklist

- [ ] API token in `DOCUMENSO_API_TOKEN` env var (secrets manager)
- [ ] Webhook secret in `DOCUMENSO_WEBHOOK_SECRET` env var
- [ ] HMAC verification on every webhook request
- [ ] Idempotency keys for all webhook events (7-day TTL)
- [ ] HTTPS enforced for webhook endpoint
- [ ] Rate limiting on webhook endpoint (100/min)
- [ ] Self-hosted: Signing certificate configured
- [ ] Self-hosted: Reverse proxy with TLS
- [ ] Self-hosted: Database/S3 not public
- [ ] Audit logging for all envelope operations

---

## Testing Requirements

### Unit Tests
- [ ] `CreateEnvelopeRequest` builder (various field configs)
- [ ] HMAC signature verification (valid, invalid, missing)
- [ ] Status mapping (Documenso → Internal)
- [ ] Idempotency key generation
- [ ] Polling job logic

### Integration Tests
- [ ] Full lifecycle: create → upload → send → sign → complete
- [ ] Webhook processing with duplicate events
- [ ] Polling fallback recovery (simulate missed webhook)
- [ ] Rejection flow handling
- [ ] Expiration flow handling
- [ ] PDF download and attachment to case

### E2E Tests
- [ ] Self-hosted deployment with signing cert
- [ ] Frontend redirect to signing URL
- [ ] Frontend iframe embedding
- [ ] 100 concurrent envelopes load test

### Manual Verification
- [ ] Create envelope via API
- [ ] Upload PDF to presigned URL
- [ ] Send envelope
- [ ] Sign as recipient (email link)
- [ ] Verify webhook received
- [ ] Verify PDF downloaded and attached
- [ ] Verify case status updated

---

## Environment Variables

```bash
# Documenso
DOCUMENSO_BASE_URL=https://documenso.yourdomain.com
DOCUMENSO_API_TOKEN=dt_XXXXXXXXXXXX
DOCUMENSO_WEBHOOK_SECRET=whsec_XXXXXXXXXXXX

# Self-hosted (if applicable)
DOCUMENSO_SIGNING_CERT_P12_BASE64=...
DOCUMENSO_SIGNING_CERT_PASSWORD=...
```

---

## Files to Create/Modify

```
src/
├── lib/
│   └── documenso/
│       ├── client.ts              # DocumensoClient class
│       ├── types.ts               # Shared TypeScript types
│       ├── envelope-service.ts    # Envelope CRUD + send
│       ├── webhook-handler.ts     # Webhook processing
│       └── polling-job.ts         # Background polling
├── routes/
│   └── documenso.ts               # Express routes
├── middleware/
│   └── webhook-verification.ts    # HMAC verification
└── types/
    └── documenso.ts               # Exported types

supabase/
└── migrations/
    └── 202501xx_documenso_integration.sql

tests/
├── unit/
│   ├── documenso-client.test.ts
│   ├── webhook-verification.test.ts
│   └── envelope-service.test.ts
├── integration/
│   └── documenso-lifecycle.test.ts
└── e2e/
    └── documenso-signing.test.ts
```

---

## Implementation Order

1. **Types + Client** — Shared types, DocumensoClient with fetch
2. **Database Migration** — Tables for envelopes, recipients, webhook events
3. **Envelope Service** — Create, send, get status, download
4. **Webhook Handler** — Verification, idempotency, event processing
5. **Polling Job** — Background cron for missed webhooks
6. **Routes** — REST endpoints for frontend
7. **Tests** — Unit → Integration → E2E
8. **Deploy** — Self-hosted Documenso with cert, configure webhooks

---

*Specification ready for implementation. Use skill `documenso-integration`.*