# Documenso Integration Skill

> **Specialized skill for Documenso integration** — Not a generic e-signature skill. Exclusive to Documenso platform.

---

## Core Concepts

### Envelope
The central entity in Documenso API v2. Replaces the legacy Document/Template model. An envelope contains:
- **Documents**: One or more PDF files
- **Recipients**: People who need to sign
- **Fields**: Signature/initial/date/text fields placed on documents
- **Settings**: Expiration, signing order, reminders

### Document
A PDF file within an envelope. Can be uploaded via presigned URL.

### Template
Pre-configured envelope structure for reuse. Templates define recipients, fields, and settings without specific documents.

### Recipient / Signer
A person who receives the envelope. Types:
- `SIGNER` — Must sign the document
- `REVIEWER` — Review only
- `APPROVER` — Approve only
- `RECIPIENT` — General recipient

### Field
Signature fields placed on documents:
- `SIGNATURE` — Digital signature
- `INITIAL` — Initials
- `DATE` — Auto-filled date
- `TEXT` — Free text input
- `CHECKBOX` — Checkbox

### Signing URL
Unique URL for each recipient to access and sign the envelope.

### Status
Envelope lifecycle states:
- `DRAFT` — Created but not sent
- `PENDING` — Sent, awaiting signatures
- `COMPLETED` — All recipients completed
- `REJECTED` — A recipient rejected
- `CANCELLED` — Cancelled by owner
- `EXPIRED` — Expired before completion

---

## API

### Authentication
```
Authorization: Bearer <api_token>
```
- API tokens created in Team Settings → API Tokens
- Scoped to organization/team
- Include in all requests

### Base URL
- Cloud: `https://api.documenso.com`
- Self-hosted: `https://your-domain.com` (no `/api` prefix needed for v2)

### Envelope Endpoints (Current v2)

| Operation | Endpoint | Method |
|-----------|----------|--------|
| Create envelope | `/api/v2/envelopes` | POST |
| Get envelope | `/api/v2/envelopes/:id` | GET |
| List envelopes | `/api/v2/envelopes` | GET |
| Update envelope | `/api/v2/envelopes/:id` | PATCH |
| Delete envelope | `/api/v2/envelopes/:id` | DELETE |
| Send envelope | `/api/v2/envelopes/:id/send` | POST |
| Get signing URL | `/api/v2/envelopes/:id/signing-url` | GET |
| Download completed | `/api/v2/envelopes/:id/download` | GET |

### Envelope Creation Payload
```json
{
  "title": "Contract for Signing",
  "documents": [
    {
      "name": "contract.pdf",
      "fileUrl": "https://presigned-url..."
    }
  ],
  "recipients": [
    {
      "email": "signer@example.com",
      "name": "John Doe",
      "role": "SIGNER",
      "signingOrder": 1
    }
  ],
  "fields": [
    {
      "documentId": "doc_1",
      "recipientId": "rec_1",
      "type": "SIGNATURE",
      "page": 1,
      "x": 100,
      "y": 200,
      "width": 200,
      "height": 50
    }
  ],
  "settings": {
    "expiresInDays": 30,
    "signingOrder": "SEQUENTIAL",
    "reminderEnabled": true
  },
  "externalId": "case-12345",
  "metadata": { "caseId": "12345" }
}
```

### Recipients
- Add via envelope creation or `/api/v2/envelopes/:id/recipients`
- Each gets unique `recipientId` and `signingUrl`
- `externalId` links to your system

### Fields
- Attached to specific document + recipient
- Position in PDF coordinates (points, 72 DPI)
- Can be created via template or programmatically

### Deprecated Endpoints (Do NOT Use)
| Deprecated | Replacement |
|------------|-------------|
| `/api/v1/documents` | `/api/v2/envelopes` |
| `/api/v1/templates` | `/api/v2/envelopes` (with `type: TEMPLATE`) |
| `/api/v1/documents/:id/send` | `/api/v2/envelopes/:id/send` |
| `/api/v1/documents/:id/recipients` | `/api/v2/envelopes/:id/recipients` |
| `/api/v1/documents/:id/fields` | Fields in envelope creation |

---

## Webhooks

### Events Available
| Event | Trigger |
|-------|---------|
| `DOCUMENT_CREATED` | New envelope created |
| `DOCUMENT_SENT` | Envelope sent to recipients |
| `DOCUMENT_OPENED` | Recipient opens document |
| `DOCUMENT_SIGNED` | Recipient signs |
| `DOCUMENT_RECIPIENT_COMPLETED` | Recipient completes all actions |
| `DOCUMENT_COMPLETED` | All recipients completed |
| `DOCUMENT_REJECTED` | Recipient rejects |
| `DOCUMENT_CANCELLED` | Envelope cancelled |
| `RECIPIENT_EXPIRED` | Signing deadline passed |
| `DOCUMENT_REMINDER_SENT` | Reminder email sent |
| `TEMPLATE_CREATED/UPDATED/DELETED/USED` | Template lifecycle |

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
    "recipients": [
      {
        "id": "rec_1",
        "email": "signer@example.com",
        "name": "John Doe",
        "role": "SIGNER",
        "signingStatus": "SIGNED",
        "signedAt": "2024-01-15T10:25:00Z",
        "readStatus": "READ"
      }
    ],
    "createdAt": "2024-01-10T08:00:00Z"
  },
  "createdAt": "2024-01-15T10:30:00Z",
  "webhookEndpoint": "https://your-app.com/webhooks/documenso"
}
```

### Signature Verification
Header: `X-Documenso-Secret` contains HMAC-SHA256 of payload.

```typescript
function verifyWebhookSignature(payload: string, receivedSecret: string, expectedSecret: string): boolean {
  if (!expectedSecret) return false; // Not configured - reject in production
  if (!receivedSecret) return false;
  
  const expected = crypto
    .createHmac('sha256', expectedSecret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(receivedSecret),
    Buffer.from(expected)
  );
}
```

### Idempotency
- Use `payload.id` (envelope ID) + `event` as deduplication key
- Store processed event IDs in database with TTL
- Handle out-of-order delivery (e.g., COMPLETED before SIGNED)

### Retry Policy
| Provider | Attempts | Backoff |
|----------|----------|---------|
| Local (default) | 4 | None (immediate) |
| BullMQ | 3 | Exponential from 1s |
| Inngest | 5 | Platform managed |

### Polling Fallback (Critical Workflows)
```typescript
async function pollForCompletion(envelopeId: string, timeoutMs = 86400000, intervalMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const response = await fetch(`${BASE_URL}/api/v2/envelopes/${envelopeId}`, {
      headers: { Authorization: `Bearer ${API_TOKEN}` }
    });
    const envelope = await response.json();
    
    if (envelope.status === 'COMPLETED') return true;
    if (envelope.status === 'REJECTED') throw new Error('Document rejected');
    
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error('Polling timeout');
}
```

### Security Architecture
```
Documenso → Webhook (HTTPS) → Adeus Multa Backend → Persist → Update Case
                                    ↑
                              Frontend NEVER receives webhooks
```

---

## Self-Hosting

### Docker Compose (Production)
```yaml
version: '3.8'
services:
  app:
    image: documenso/documenso:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/documenso
      - NEXTAUTH_SECRET=your-secret
      - NEXTAUTH_URL=https://your-domain.com
      - SIGNING_CERTIFICATE_P12_BASE64=<base64-p12>
      - SIGNING_CERTIFICATE_PASSWORD=cert-password
      - NEXT_PRIVATE_WEBHOOK_SSRF_BYPASS_HOSTS=internal-service
    depends_on:
      - db
      - s3
  
  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=documenso
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  s3:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      - MINIO_ROOT_USER=minio
      - MINIO_ROOT_PASSWORD=minio123
    volumes:
      - s3_data:/data

volumes:
  postgres_data:
  s3_data:
```

### Required Environment Variables
| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection |
| `NEXTAUTH_SECRET` | Yes | Auth encryption key |
| `NEXTAUTH_URL` | Yes | Public URL (HTTPS) |
| `SIGNING_CERTIFICATE_P12_BASE64` | Yes | X.509 cert for digital signatures |
| `SIGNING_CERTIFICATE_PASSWORD` | Yes | P12 password |
| `S3_ENDPOINT` | For S3 storage | MinIO/S3 endpoint |
| `S3_BUCKET` | For S3 storage | Bucket name |
| `NEXT_PRIVATE_JOBS_PROVIDER` | Optional | `local` \| `bullmq` \| `inngest` |
| `NEXT_PRIVATE_WEBHOOK_SSRF_BYPASS_HOSTS` | Optional | Comma-separated hostnames |

### Signing Certificate (CRITICAL)
**Without this, app starts but signing FAILS.**

Generate locally:
```bash
# 1. Create private key
openssl genrsa -out key.pem 2048

# 2. Create CSR
openssl req -new -key key.pem -out csr.pem -subj "/CN=Documenso Signing/O=Your Org"

# 3. Self-sign (or use CA)
openssl x509 -req -in csr.pem -signkey key.pem -out cert.pem -days 3650

# 4. Create P12
openssl pkcs12 -export -in cert.pem -inkey key.pem -out signing.p12 -password pass:your-password

# 5. Base64 encode
base64 -w 0 signing.p12 > signing.p12.b64
```

Use in Docker: `SIGNING_CERTIFICATE_P12_BASE64=$(cat signing.p12.b64)`

### Network Security
- Reverse proxy (nginx/Caddy) with HTTPS
- Webhook endpoints must be publicly accessible
- Database/S3 not exposed to internet
- Use `NEXT_PRIVATE_WEBHOOK_SSRF_BYPASS_HOSTS` for internal webhooks

---

## Integration Patterns

### Node.js / TypeScript Client
```typescript
class DocumensoClient {
  constructor(
    private baseUrl: string,
    private apiToken: string
  ) {}

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new DocumensoError(response.status, error.message);
    }
    
    return response.json();
  }

  async createEnvelope(envelope: CreateEnvelopeRequest): Promise<Envelope> {
    return this.request('/api/v2/envelopes', {
      method: 'POST',
      body: JSON.stringify(envelope)
    });
  }

  async sendEnvelope(envelopeId: string): Promise<Envelope> {
    return this.request(`/api/v2/envelopes/${envelopeId}/send`, {
      method: 'POST'
    });
  }

  async getSigningUrl(envelopeId: string, recipientId: string): Promise<string> {
    const result = await this.request<{ signingUrl: string }>(
      `/api/v2/envelopes/${envelopeId}/recipients/${recipientId}/signing-url`
    );
    return result.signingUrl;
  }

  async downloadCompleted(envelopeId: string): Promise<Buffer> {
    const response = await fetch(`${this.baseUrl}/api/v2/envelopes/${envelopeId}/download`, {
      headers: { 'Authorization': `Bearer ${this.apiToken}` }
    });
    return Buffer.from(await response.arrayBuffer());
  }
}
```

### React Embedding (Iframe)
```tsx
import { DocumensoEmbed } from '@documenso/embed-react';

function SignDocument({ envelopeId, recipientId }) {
  const [token, setToken] = useState<string>();

  useEffect(() => {
    // Fetch presign token from your backend
    fetch(`/api/documenso/embedding-token/${envelopeId}/${recipientId}`)
      .then(r => r.json())
      .then(data => setToken(data.token));
  }, [envelopeId, recipientId]);

  if (!token) return <div>Loading...</div>;

  return (
    <DocumensoEmbed
      token={token}
      iframeTitle="Sign Document"
      onDocumentCompleted={() => router.push('/success')}
      onError={(err) => console.error(err)}
    />
  );
}
```

### Backend Webhook Handler (Express)
```typescript
app.post('/webhooks/documenso', express.raw({ type: 'application/json' }), async (req, res) => {
  const secret = req.headers['x-documenso-secret'] as string;
  const payload = req.body.toString();
  
  if (!verifyWebhookSignature(payload, secret, process.env.DOCUMENSO_WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(payload);
  const eventKey = `${event.payload.id}:${event.event}`;
  
  // Idempotency check
  const processed = await redis.setnx(`webhook:${eventKey}`, '1');
  if (!processed) return res.status(200).send('OK');
  await redis.expire(`webhook:${eventKey}`, 86400 * 7);

  // Process event
  try {
    switch (event.event) {
      case 'DOCUMENT_COMPLETED':
        await handleCompleted(event.payload);
        break;
      case 'DOCUMENT_REJECTED':
        await handleRejected(event.payload);
        break;
      case 'DOCUMENT_SENT':
        await handleSent(event.payload);
        break;
    }
  } catch (err) {
    console.error('Webhook processing failed:', err);
    // Don't throw - return 200 to avoid retries for processing errors
  }

  res.status(200).send('OK');
});
```

---

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Envelope not created | Invalid PDF, missing fields | Validate PDF, check field positions |
| PDF not sent | Presigned URL expired | Upload immediately after creation |
| Recipient invalid | Email format, duplicate | Validate email, check existing recipients |
| Webhook not received | URL not public, firewall | Use ngrok for local, check firewall |
| Signature failed | No signing certificate | Configure `SIGNING_CERTIFICATE_P12_BASE64` |
| Auth error | Expired/invalid token | Regenerate API token |
| Document not downloadable | Not completed, wrong endpoint | Check status=COMPLETED, use v2 download |
| Fields not appearing | Wrong documentId/recipientId | Match IDs from envelope creation |
| Self-hosted won't start | Missing env vars | Check all required env vars |
| Webhook duplicate processing | No idempotency key | Store event IDs with TTL |

---

## Version Compatibility

| Research Date | Version | API Used | Notes |
|---------------|---------|----------|-------|
| 2025-01 | Latest (main branch) | v2 Envelopes | V1 deprecated, migration guide published |
| OpenAPI | Current | `/api/v2/*` | Reference at openapi.documenso.com |

### Key Migration Points
- **Documents + Templates → Envelopes** (unified model)
- **V1 endpoints deprecated** but still functional (timeline unknown)
- **New integrations MUST use v2 envelopes**
- **OpenAPI reference** is authoritative for parameters

---

## Sub-Agents for Reusability

### documenso-researcher
```
Responsible for: documentation, API, OpenAPI, versioning
Tools: web search, GitHub API, official docs
Output: Current API spec, endpoint changes, deprecation notices
```

### documenso-integration-researcher
```
Responsible for: GitHub, real cases, examples, patterns
Tools: GitHub search, code analysis
Output: Integration patterns, common issues, working examples
```

### documenso-selfhost-researcher
```
Responsible for: Docker, certificates, infra, security, deployment
Tools: Docker Hub, GitHub self-hosting docs, issue search
Output: Deployment configs, cert generation, env var reference
```

### documenso-webhook-researcher
```
Responsible for: events, payloads, security, idempotency, retries
Tools: Webhook docs, GitHub webhook implementations
Output: Event catalog, verification code, retry strategies
```

---

## Validation Questions & Answers

1. **Current envelope creation endpoint?** → `POST /api/v2/envelopes` (Official Docs)
2. **Envelope ID format?** → `env_` prefix, alphanumeric (Source: GitHub schema.ts)
3. **How PDF sent?** → Presigned URL from creation response, then PUT file (API Examples)
4. **Add signer?** → Include in `recipients` array on creation or POST `/api/v2/envelopes/:id/recipients` (Contract)
5. **Create signature field?** → Include in `fields` array with `type: SIGNATURE`, documentId, recipientId, page, x, y, width, height (Examples)
6. **Send envelope?** → `POST /api/v2/envelopes/:id/send` (Contract)
7. **Get signing URL?** → `GET /api/v2/envelopes/:id/recipients/:recipientId/signing-url` (Embedding docs)
8. **Know completed?** → Webhook `DOCUMENT_COMPLETED` or poll `GET /api/v2/envelopes/:id` status=COMPLETED (Workflows)
9. **Validate webhook?** → HMAC-SHA256 of payload with secret, compare to `X-Documenso-Secret` header (Verification docs)
10. **Avoid duplicate processing?** → Idempotency key: `${envelopeId}:${event}`, store in Redis with TTL (Security best practices)
11. **Recover lost webhook?** → Polling fallback with exponential backoff (Common workflows)
12. **Download completed PDF?** → `GET /api/v2/envelopes/:id/download` (API Reference)
13. **Configure self-hosted cert?** → Generate P12, base64 encode, set `SIGNING_CERTIFICATE_P12_BASE64` + password (Self-hosting docs)
14. **APIs NOT to use?** → All `/api/v1/documents/*` and `/api/v1/templates/*` (Migration guide)
15. **Node/TypeScript integration?** → Use fetch with Bearer token, ts-rest contract types from `@documenso/api` (Packages/api)

---

## Implementation Recommendation for Adeus Multa

### Architecture
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend    │────▶│  Documenso  │
│  (React)    │     │  (Express)   │     │  (Self-host)│
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │  Webhook    │
                    │  Handler    │
                    └──────┬──────┘
                           ▼
                    ┌──────────────┐
                    │  Database    │
                    │  (Supabase)  │
                    └──────────────┘
```

### Data Model
```typescript
// Envelope tracking in your DB
interface DocumensoEnvelope {
  id: string;           // env_xxx
  externalId: string;   // your case ID
  caseId: string;
  status: 'DRAFT' | 'PENDING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  envelopeData: any;    // Full envelope snapshot
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Recipient tracking
interface DocumensoRecipient {
  id: string;           // rec_xxx
  envelopeId: string;
  email: string;
  name: string;
  role: string;
  signingStatus: string;
  signingUrl?: string;
  signedAt?: Date;
}
```

### Recommended Flow
1. **Create Case** → Create envelope with `externalId = caseId`
2. **Upload PDF** → Use presigned URL from envelope creation
3. **Add Recipients + Fields** → In same creation call or separate
4. **Send** → POST `/send`, triggers `DOCUMENT_SENT` webhook
5. **Frontend** → Redirect signer to `signingUrl` OR embed via iframe
6. **Webhook** → Receive `DOCUMENT_COMPLETED`, download PDF, update case
7. **Polling** → Background job checks PENDING envelopes every 5min

### Security Checklist
- [ ] API token stored in vault/env, never in code
- [ ] Webhook secret configured and verified
- [ ] Idempotency keys for all webhook events
- [ ] HTTPS enforced for webhook endpoint
- [ ] Signing certificate configured in self-hosted
- [ ] Rate limiting on webhook endpoint
- [ ] Audit log for all envelope operations

### Tests Needed
- Unit: Envelope creation payload builder
- Unit: Webhook signature verification
- Unit: Status mapping (Documenso → Internal)
- Integration: Full envelope lifecycle (create → send → sign → complete)
- Integration: Webhook processing with duplicates
- Integration: Polling fallback recovery
- E2E: Self-hosted deployment with signing cert
- Load: 100 concurrent envelopes