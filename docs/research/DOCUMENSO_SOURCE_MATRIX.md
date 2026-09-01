# Documenso Integration — Source Matrix

| Information | Source | Type | Version/Date | Notes |
|-------------|--------|------|--------------|-------|
| **API v2 Envelope Endpoints** | https://docs.documenso.com/docs/developers/api | Official Documentation | Current | Primary API reference |
| **Migration to Envelopes** | https://docs.documenso.com/docs/developers/api/migrate-to-envelopes | Official Documentation | Current | Deprecation notice for V1/V2 |
| **Webhook Events** | https://docs.documenso.com/docs/developers/webhooks/events | Official Documentation | Current | 14 event types with payloads |
| **Webhook Verification** | https://docs.documenso.com/docs/developers/webhooks/verification | Official Documentation | Current | HMAC-SHA256 verification code |
| **Webhook Setup** | https://docs.documenso.com/docs/developers/webhooks/setup | Official Documentation | Current | Dashboard configuration, retry policy |
| **Common Workflows** | https://docs.documenso.com/docs/developers/examples/common-workflows | Official Documentation | Current | Webhook + polling fallback examples |
| **Embedding** | https://docs.documenso.com/docs/developers/embedding | Official Documentation | Current | React SDK, presign tokens |
| **Self-Hosting Overview** | https://docs.documenso.com/docs/self-hosting | Official Documentation | Current | Deployment guide |
| **Signing Certificate** | https://docs.documenso.com/docs/self-hosting/configuration/signing-certificate | Official Documentation | Current | P12 generation, env vars |
| **Local Certificate** | https://docs.documenso.com/docs/self-hosting/configuration/signing-certificate/local | Official Documentation | Current | Step-by-step cert creation |
| **Environment Variables** | https://docs.documenso.com/docs/self-hosting/configuration/environment | Official Documentation | Current | Complete env var reference |
| **Local Development** | https://docs.documenso.com/docs/developers/local-development | Official Documentation | Current | Quickstart, Docker, Gitpod |
| **OpenAPI Reference** | https://openapi.documenso.com | Official Documentation | Current | Interactive API explorer |
| **API Contract (ts-rest)** | https://github.com/documenso/documenso/tree/main/packages/api/v1 | Source Code | main branch | Type-safe contracts, schemas |
| **API Schema** | packages/api/v1/schema.ts | Source Code | main branch | Zod schemas for all endpoints |
| **API Implementation** | packages/api/v1/implementation.ts | Source Code | main branch | Actual endpoint implementations |
| **API Examples** | packages/api/v1/examples/*.ts | Source Code | main branch | 9 official TypeScript examples |
| **Nextcloud Integration** | https://github.com/nextcloud/integration_documenso | Third-Party Example | 2026-09 | PHP, uses deprecated V1 API |
| **Documenso Zapier** | https://github.com/documenso/zapier | Official Integration | 2026-02 | TypeScript, modern patterns |
| **GitHub Repository** | https://github.com/documenso/documenso | Source Code | main branch | 14.8k stars, AGPL-3.0 |
| **Developer Quickstart** | https://docs.documenso.com/docs/developers/local-development/quickstart | Official Documentation | Current | Docker Compose setup |
| **Webhook Retry Policy** | https://docs.documenso.com/docs/developers/webhooks/setup#retry-policy | Official Documentation | Current | Local/BullMQ/Inngest configs |

---

## Source Type Legend

| Type | Description |
|------|-------------|
| **Official Documentation** | docs.documenso.com — authoritative, versioned |
| **Source Code** | github.com/documenso/documenso — implementation truth |
| **Official Integration** | github.com/documenso/* — maintained by Documenso team |
| **Third-Party Example** | External projects using Documenso — may use deprecated APIs |

---

## Version Tracking

| Research Date | Documenso Version | API Version | Key Finding |
|---------------|-------------------|-------------|-------------|
| 2025-01 | Latest (main) | v2 Envelopes | V1 deprecated, migration required for new integrations |

---

## Verification Checklist

- [x] All API endpoints verified against official docs + source code
- [x] Webhook events verified against events documentation
- [x] Self-hosting requirements verified against configuration docs
- [x] Signing certificate requirement confirmed (critical)
- [x] Deprecated endpoints identified via migration guide
- [x] Real-world examples analyzed for patterns
- [x] Polling fallback confirmed in official workflows