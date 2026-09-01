# Documenso Integration — Research Report

## Executive Summary

Documenso is an open-source DocuSign alternative with a modern API v2 based on **Envelopes** (unified Document/Template model). The platform provides REST API, webhooks, embedding SDKs, and self-hosting via Docker. **Critical finding**: Legacy `/api/v1/documents` and `/api/v1/templates` endpoints are deprecated; all new integrations must use `/api/v2/envelopes`.

---

## 1. Current Architecture

### API Version
- **Current**: API v2 (Envelope-based)
- **Deprecated**: API v1 (Document/Template-based)
- **Migration Guide**: https://docs.documenso.com/docs/developers/api/migrate-to-envelopes

### Core Entities
| Entity | Description | API Endpoint |
|--------|-------------|--------------|
| Envelope | Unified document/template container | `/api/v2/envelopes` |
| Document | PDF file within envelope | Included in envelope |
| Template | Pre-configured envelope | Envelope with `type: TEMPLATE` |
| Recipient | Signer/reviewer/approver | `/api/v2/envelopes/:id/recipients` |
| Field | Signature/initial/date/text/checkbox | Included in envelope creation |
| Signing URL | Unique per-recipient signing link | `/api/v2/envelopes/:id/recipients/:recipientId/signing-url` |

### Authentication
- Bearer token (API tokens from Team Settings)
- Organization/team scoped
- Required on all requests

### Base URLs
- Cloud: `https://api.documenso.com`
- Self-hosted: `https://your-domain.com`

---

## 2. Envelope Lifecycle

```
PDF Upload
    │
    ▼
CREATE ENVELOPE (POST /api/v2/envelopes)
    │  - title, documents[], recipients[], fields[], settings, externalId, metadata
    │  - Returns: envelopeId, presigned upload URLs for documents
    ▼
UPLOAD PDFs to presigned URLs (PUT)
    │
    ▼
SEND ENVELOPE (POST /api/v2/envelopes/:id/send)
    │  - Triggers DOCUMENT_SENT webhook
    │  - Status: PENDING
    ▼
RECIPIENT OPENS (DOCUMENT_OPENED webhook)
    │
    ▼
RECIPIENT SIGNS (DOCUMENT_SIGNED webhook)
    │
    ▼
ALL COMPLETE (DOCUMENT_COMPLETED webhook)
    │  - Status: COMPLETED
    ▼
DOWNLOAD PDF (GET /api/v2/envelopes/:id/download)
```

### Envelope States
| State | Description |
|-------|-------------|
| `DRAFT` | Created, not sent |
| `PENDING` | Sent, awaiting signatures |
| `COMPLETED` | All recipients completed |
| `REJECTED` | A recipient rejected |
| `CANCELLED` | Cancelled by owner |
| `EXPIRED` | Deadline passed |

---

## 3. Webhooks

### Events (14 Total)
| Event | Trigger | Critical for Adeus Multa |
|-------|---------|-------------------------|
| `DOCUMENT_CREATED` | Envelope created | No |
| `DOCUMENT_SENT` | Envelope sent | Yes — track sent status |
| `DOCUMENT_OPENED` | Recipient opens | Optional — engagement |
| `DOCUMENT_SIGNED` | Recipient signs | Yes — partial progress |
| `DOCUMENT_RECIPIENT_COMPLETED` | Recipient done | Yes — track per-signer |
| `DOCUMENT_COMPLETED` | All done | **YES — primary completion** |
| `DOCUMENT_REJECTED` | Recipient rejects | Yes — handle rejection |
| `DOCUMENT_CANCELLED` | Cancelled/deleted | Yes — cleanup |
| `RECIPIENT_EXPIRED` | Deadline passed | Yes — follow up |
| `DOCUMENT_REMINDER_SENT` | Reminder email | Optional |
| `TEMPLATE_CREATED/UPDATED/DELETED/USED` | Template lifecycle | No |

### Payload Structure
```json
{
  "event": "DOCUMENT_COMPLETED",
  "payload": {
    "id": "env_abc123",
    "title": "Contract",
    "status": "COMPLETED",
    "externalId": "case-12345",
    "completedAt": "2024-01-15T10:30:00Z",
    "recipients": [...],
    "createdAt": "2024-01-10T08:00:00Z"
  },
  "createdAt": "2024-01-15T10:30:00Z",
  "webhookEndpoint": "https://your-app.com/webhooks/documenso"
}
```

### Security
- **Signature**: HMAC-SHA256 in `X-Documenso-Secret` header
- **Secret**: Configured per webhook in dashboard
- **Verification**: Compare computed HMAC with header
- **Idempotency**: Use `${envelopeId}:${event}` as dedup key
- **Timeout**: 10 seconds max response time
- **Retries**: 4 attempts (local), exponential (BullMQ), 5 (Inngest)

### Polling Fallback (Official Recommendation)
```typescript
// For critical workflows, poll envelope status
// Interval: 1 minute, Timeout: 24 hours
GET /api/v2/envelopes/:id → check status === 'COMPLETED'
```

---

## 4. Self-Hosting

### Requirements
- Docker + Docker Compose
- PostgreSQL 15+
- S3-compatible storage (MinIO for local)
- HTTPS domain (required for webhooks)
- **Signing Certificate (P12) — MANDATORY**

### Critical: Signing Certificate
> Without `SIGNING_CERTIFICATE_P12_BASE64`, app starts but **signing fails**.

```bash
# Generate self-signed cert for development
openssl genrsa -out key.pem 2048
openssl req -new -key key.pem -out csr.pem -subj "/CN=Documenso Signing"
openssl x509 -req -in csr.pem -signkey key.pem -out cert.pem -days 3650
openssl pkcs12 -export -in cert.pem -inkey key.pem -out signing.p12 -password pass:your-password
base64 -w 0 signing.p12 > signing.p12.b64
```

### Required Environment Variables
| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection |
| `NEXTAUTH_SECRET` | Yes | 32+ char random string |
| `NEXTAUTH_URL` | Yes | Public HTTPS URL |
| `SIGNING_CERTIFICATE_P12_BASE64` | **YES** | Base64 P12 cert |
| `SIGNING_CERTIFICATE_PASSWORD` | **YES** | P12 password |
| `S3_ENDPOINT` | For S3 | MinIO/S3 endpoint |
| `S3_BUCKET` | For S3 | Bucket name |
| `NEXT_PRIVATE_JOBS_PROVIDER` | No | `local` \| `bullmq` \| `inngest` |
| `NEXT_PRIVATE_WEBHOOK_SSRF_BYPASS_HOSTS` | For internal | Comma-separated hosts |

### Network Architecture
```
Internet → Reverse Proxy (HTTPS) → Documenso App (3000)
                                    ├── PostgreSQL (internal)
                                    ├── MinIO/S3 (internal)
                                    └── Webhook endpoint (public)
```

---

## 5. Real-World Integration Cases

### 1. Nextcloud Integration (Official)
- **Repo**: `nextcloud/integration_documenso`
- **Language**: PHP
- **Pattern**: Uses deprecated V1 API (`/api/v1/documents`)
- **Issue**: Needs migration to v2 envelopes
- **Webhook**: Not implemented

### 2. Documenso Zapier (Official)
- **Repo**: `documenso/zapier`
- **Language**: TypeScript
- **Pattern**: Modern integration, uses API v2

### 3. Clerk + Documenso Demo
- **Repo**: `jeremy-clerk/bkitz-demo`
- **Pattern**: Auth integration with Clerk

### Common Patterns Found
- **Envelope creation**: Single API call with all data
- **Presigned upload**: Upload PDFs after envelope creation
- **Webhook handling**: Express/Fastify with signature verification
- **Polling fallback**: Background job checking PENDING envelopes
- **Embedding**: Iframe with presign token for in-app signing

### Known Issues
1. **V1 API still widely used** — examples in wild use deprecated endpoints
2. **Signing cert missing** — self-hosted deployments fail silently on signing
3. **Webhook SSRF** — internal endpoints blocked by default
4. **No official Node SDK** — must use fetch or ts-rest contract
5. **Field positioning** — PDF coordinates in points (72 DPI), not pixels

---

## 6. Security Considerations

### API Security
- Store API tokens in secrets manager
- Rotate tokens periodically
- Use least-privilege tokens per service

### Webhook Security
- HTTPS only in production
- Verify HMAC signature on every request
- Implement idempotency (Redis SETNX + TTL)
- Respond 200 within 10s, process async
- Validate payload structure before processing

### Self-Hosted Security
- Reverse proxy with TLS termination
- Database/S3 not exposed publicly
- `NEXT_PRIVATE_WEBHOOK_SSRF_BYPASS_HOSTS` for internal webhooks only
- Regular security updates
- Backup encryption

---

## 7. Recommendation Summary

### Use API v2 Envelopes Exclusively
- **DO**: `POST /api/v2/envelopes`
- **DON'T**: `POST /api/v1/documents`, `POST /api/v1/templates`

### Implementation Stack
- **Backend**: Express/TypeScript with custom client
- **Webhook**: Express raw body parser + HMAC verification
- **Frontend**: Embed via `@documenso/embed-react` or redirect to signing URL
- **Self-hosted**: Docker Compose with PostgreSQL + MinIO
- **Certificate**: Generate P12, configure via env vars

### Critical Path for Adeus Multa
1. Create envelope with `externalId = caseId`
2. Upload PDF via presigned URL
3. Send envelope → triggers webhook
4. Frontend redirects signer OR embeds iframe
5. Webhook `DOCUMENT_COMPLETED` → download PDF → update case
6. Polling job every 5min for any PENDING envelopes

---

*Research completed: 2025-01 | Sources: Official docs, GitHub, OpenAPI, Real integrations*