# Route Inventory — AdeusMultas/DefesAI Cloudflare Worker

**Worker**: `cloudflare/dist/worker.js` (built from `cloudflare/worker.js`)
**Framework**: Hono (v4)
**Base Path**: All routes mounted at `/api` prefix
**Total Routes**: ~100+ endpoints across 24 route files

---

## ROUTE TABLE

| # | Method | Full Path | Purpose | Auth Required | Admin Only | Validation | Key Dependencies |
|---|--------|-----------|---------|---------------|------------|------------|------------------|
| 1 | GET | `/api/auth/me` | Return authenticated user with role | ✅ Bearer token | No | None | `middleware.authenticateToken`, Supabase admin |
| 2 | GET | `/api/onboarding/rules` | Return form rules (situations, stages, categories) | ❌ Public | No | None | `src/core/onboarding/rules-matrix` constants |
| 3 | POST | `/api/cases/anonymous` | Create anonymous case intake | ❌ Public (rate-limited) | No | Body validation (aitNumber, infractionCode, location, plate) | `ANONYMOUS_CASE_LIMITER`, `analyzeInfractionCompat` (RAG), Supabase admin |
| 4 | POST | `/api/cases/anonymous/:id/recover` | Recover anonymous case by claim token | ❌ Public (rate-limited) | No | claimToken format validation (64 hex chars) | `ANONYMOUS_CASE_LIMITER`, `claimTokensMatch` |
| 5 | GET | `/api/cases` | List cases (admin: all; citizen: own) | ✅ Bearer token | Role-based | Query `userId` filter | `middleware.authenticateToken`, `createSupabaseUserClient` |
| 6 | GET | `/api/cases/:id` | Get case by ID | ✅ Bearer token | No | Case existence, ownership check | `middleware.authenticateToken`, `createSupabaseUserClient`, `hasValidDefenseIntegrity` |
| 7 | GET | `/api/cases/:id/export` | DSAR export (all personal data) | ✅ Bearer token | No | Ownership check, is_paid check | `middleware.authenticateToken`, payment_orders, documents |
| 8 | POST | `/api/cases` | Create authenticated case | ✅ Bearer token | No | Canonical userId validation | `middleware.authenticateToken`, `analyzeInfractionCompat` (RAG), Supabase user client |
| 9 | PUT | `/api/cases/:id` | Update case | ✅ Bearer token | No | Ownership check, infraction recomputation | `middleware.authenticateToken`, `createSupabaseUserClient` |
| 10 | DELETE | `/api/cases/:id` | Delete case (full LGPD deletion) | ✅ Bearer token | No | Ownership check, purge dependences | `middleware.authenticateToken`, `createSupabaseUserClient`, storage, payment_orders |
| 11 | DELETE | `/api/cases/anonymous/:id` | Delete anonymous case by claim token | ❌ Public (rate-limited) | No | claimToken validation, rate limit | `ANONYMOUS_CASE_LIMITER`, `claimTokensMatch`, admin Supabase client |
| 12 | POST | `/api/cases/:id/claim` | Claim anonymous case (link to user) | ✅ Bearer token | No | claimToken match, ownership check | `middleware.authenticateToken`, `createSupabaseUserClient`, claimTokensMatch |
| 13 | GET | `/api/cases/:id/onboarding-state` |Resume onboarding journey | ✅ Bearer token | No | Ownership check, is_anonymous check | `middleware.authenticateToken`, `createSupabaseUserClient`, payment_orders |
| 14 | POST | `/api/cases/:id/qualification` | Persist applicant qualification | ✅ Bearer token | No | Ownership check, cpf/cnh format, cnhCategory | `middleware.authenticateToken`, `createSupabaseUserClient` |
| 15 | POST | `/api/cases/:id/generate-defense` | Generate deterministic defense draft | ✅ Bearer token | No | **is_paid check**, ownership, **Quality Gate**, applicant data completeness | `middleware.authenticateToken`, `analyzeInfractionCompat`, `generateDefenseDraftCompat`, `runCanonicalQualityGate` |
| 16 | GET | `/api/payments/resolve-price` | Resolve commercial price for service type | ❌ Public | No | serviceType query param | `resolveCommercialOffer`, `service_pricings` table, `promotion_campaigns` |
| 17 | GET | `/api/payments/gateway/status` | Check gateway (VenoPag/PagBank) status | ❌ Public | No | Env var checks | `VENO_CLIENT_ID/SECRET/WEBHOOK_SECRET` or `PAGBANK_TOKEN` |
| 18 | POST | `/api/payments/pix/create` | Create PIX payment order | ✅ Bearer token | No | **Rate limiting**, serviceType, caseId, offer resolution | `ANONYMOUS_CASE_LIMITER`, `resolveCommercialOffer`, `reserveOrFindPendingOrder`, gateway (VenoPag/PagBank) |
| 19 | POST | `/api/payments/simulate-payment` | Simulate payment (admin/sandbox only) | ✅ Bearer token + ✅ Admin | Yes | PAYMENT_MODE=sandbox, caseId, amount > 0 | `createSupabaseAdminClient`, cases table |
| 20 | POST | `/api/payments/credit-card/create` | Create credit card payment | ✅ Bearer token | No | serviceType, cardToken, caseId | `ANONYMOUS_CASE_LIMITER`, `resolveCommercialOffer`, `createPixOrder` (PagBank) |
| 21 | POST | `/api/webhooks/pagbank` | PagBank webhook handler | ❌ Public | No | `x-authenticity-token` signature verification | `verifyWebhookSignature`, `webhook_events` table, `payment_orders` table |
| 22 | POST | `/api/webhooks/ggpix` | GGPIX webhook (disabled) | ❌ Public | No | Returns 400 "descontinuado" | None (hard-coded message) |
| 23 | POST | `/api/webhooks/venopag` | VenoPag webhook handler | ❌ Public | No | `x-veno-signature`, `x-veno-client-id` verification | `verifyVenoWebhook`, `apply_venopag_webhook` RPC, `payment_orders` table, `getVenoCashInStatus` |
| 24 | GET | `/api/payments/pix/status/:txId` | Check PIX transaction status | ✅ Bearer token | No | gateway_transaction_id lookup, user ownership | `middleware.authenticateToken`, `createSupabaseUserClient` |
| 25 | POST | `/api/communication/whatsapp/send` | Send WhatsApp text message | ✅ Bearer token | No | phone, message required; Evolution API | `evolutionConfig`, `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE_NAME` |
| 26 | POST | `/api/communication/whatsapp/send-media` | Send WhatsApp media (image/document) | ✅ Bearer token | No | phone, mediaUrl required | `evolutionConfig`, Evolution API |
| 27 | POST | `/api/communication/whatsapp/send-document` | Send WhatsApp document | ✅ Bearer token | No | phone, pdfUrl required | `evolutionConfig`, Evolution API |
| 28 | GET | `/api/communication/whatsapp/status` | Check WhatsApp instance status | ❌ Public | No | Evolution API connection state | `evolutionConfig`, `EVOLUTION_API_URL`, `EVOLUTION_INSTANCE_NAME` |
| 29 | GET | `/api/communication/whatsapp/qrcode` | Get WhatsApp QR code (provisioning) | ✅ Admin | ✅ Yes | Admin authentication | `evolutionConfig`, `EVOLUTION_API_URL`, admin token |
| 30 | GET | `/api/communication/whatsapp/webhook-config` | Get WhatsApp webhook config | ✅ Admin | ✅ Yes | Admin authentication | `evolutionConfig`, `EVOLUTION_WEBHOOK_SECRET` |
| 31 | POST | `/api/communication/whatsapp/webhook-config` | Set WhatsApp webhook config | ✅ Admin | ✅ Yes | Admin authentication | `evolutionConfig`, `EVOLUTION_WEBHOOK_SECRET` |
| 32 | GET | `/api/communication/webhooks/whatsapp` | Webhook endpoint for Evolution/Chatwoot | ❌ Public | No | `EVOLUTION_WEBHOOK_SECRET` optional comparison | None (simple ack) |
| 33 | POST | `/api/communication/whatsapp/webhook` | Receive Evolution webhook events | ❌ Public | No | `X-Webhook-Secret` validation (if configured) | `EVOLUTION_WEBHOOK_SECRET` header check |
| 34 | POST | `/api/documents/:caseId/generate` | Generate PDF defense document | ✅ Bearer token | No | **is_paid check**, defenseDraft existence, ownership | `middleware.authenticateToken`, `createSupabaseUserClient`, `buildPdf`, Supabase storage |
| 35 | GET | `/api/documents/:id` | Get document signed URL | ✅ Bearer token | No | Ownership check, storage path existence | `middleware.authenticateToken`, `createSupabaseAdminClient`, Supabase storage signed URLs |
| 36 | GET | `/api/knowledge/health` | Knowledge base health check | ❌ Public | No | Embedding model availability | `env.AI`, `env.VECTORIZE` |
| 37 | POST | `/api/knowledge/search` | Semantic search knowledge base | ❌ Public | No | query string required, topK (1-20) | `env.AI` (embedding), `env.VECTORIZE` |
| 38 | POST | `/api/knowledge/index` | Index knowledge document | ✅ Bearer token + ✅ Admin | Yes | id + text required | `env.AI` (embedding), `env.VECTORIZE`, Supabase |
| 39 | GET | `/api/ai/health` | AI model health check | ❌ Public | No | LLM model availability | `env.AI`, model `@cf/openai/gpt-oss-20b` |
| 40 | POST | `/api/ai/analyze-infraction` | AI analyze infraction using RAG | ✅ Bearer token | No | case data required | `env.AI`, `env.VECTORIZE`, `retrieve` + `generate` |
| 41 | POST | `/api/ai/generate-defense` | AI generate defense draft | ✅ Bearer token | No | caseData required | `env.AI`, `env.VECTORIZE`, `retrieve` + `generate` |
| 42 | GET | `/api/offers/health` | Commercial offers health check | ❌ Public | No | None | `service_pricings` table |
| 43 | POST | `/api/offers/resolve` | Resolve commercial offer | ❌ Public | No | serviceType + optional stageId, userId, documentCount, couponCode | `service_pricings`, `promotion_campaigns`, `coupons` table |
| 44 | GET | `/api/payments/resolve-price` | Resolve price via query params | ❌ Public | No | serviceType query param | Same as #43 logic |
| 45 | POST | `/api/notifications/subscribe` | Subscribe to notifications | ✅ Bearer token | No | endpoint or fcmToken required | `createSupabaseAdminClient`, `notification_subscriptions` table |
| 46 | POST | `/api/notifications/unsubscribe` | Unsubscribe from notifications | ✅ Bearer token | No | endpoint or fcmToken required | `createSupabaseAdminClient`, `notification_subscriptions` table |
| 47 | GET | `/api/notifications/history` | Get notification history | ✅ Bearer token | No | userId from auth | `createSupabaseAdminClient`, `notifications` table |
| 48 | POST | `/api/notifications/mark-read` | Mark notification as read | ✅ Bearer token | No | notification id optional | `createSupabaseAdminClient` |
| 49 | POST | `/api/notifications/send-test` | Send test notification | ✅ Bearer token | No | None | `createSupabaseAdminClient`, `notifications` table |
| 50 | GET | `/api/notifications/vapid-key` | Get VAPID public key | ❌ Public | No | VAPID_PUBLIC_KEY must be configured | `c.env.VAPID_PUBLIC_KEY` |
| 51 | GET | `/api/settings/health` | Settings service health | ❌ Public | No | None | None |
| 52 | GET | `/api/settings` | Get app settings (admin only) | ✅ Bearer token + ✅ Admin | Yes | category query param | `createSupabaseAdminClient`, `app_settings` table |
| 53 | PUT | `/api/settings` | Update app settings (admin only) | ✅ Bearer token + ✅ Admin | Yes | key required | `createSupabaseAdminClient`, `app_settings` table |
| 54 | GET | `/api/marketing/contents` | List editorial contents (admin only) | ✅ Bearer token + ✅ Admin | Yes | status, channel query params | `createSupabaseAdminClient`, `editorial_content` table |
| 55 | POST | `/api/marketing/contents` | Create editorial content | ❌ Public (but uses anon Supabase client) | No | title, channel optional | `createSupabaseAdminClient`, `editorial_content` table |
| 56 | PUT | `/api/marketing/contents/:id` | Update editorial content | ❌ Public (no auth check) | No | id in path | `createSupabaseAdminClient` |
| 57 | POST | `/api/marketing/publish/:id` | Publish content to Meta | ✅ Admin | ✅ Yes | content must exist | `META_ACCESS_TOKEN`, `META_PAGE_ID`, `IG_USER_ID`, `createMetaPublisher` |
| 58 | GET | `/api/marketing/status` | Marketing status summary | ❌ Public | No | None | `editorial_content` table counts |
| 59 | POST | `/api/marketing/media/upload` | Upload media file | ✅ Bearer token + ✅ Admin | Yes | base64, filename, mimeType | `SUPABASE_URL`, `SUPABASE_SECRET_KEY`/`SUPABASE_SERVICE_ROLE_KEY`, Supabase storage |
| 60 | GET | `/api/admin/ai/overview` | Admin AI overview | ✅ Bearer token + ✅ Admin | Yes | None | AI model, Vectorize |
| 61 | GET | `/api/admin/overview` | Admin dashboard overview | ✅ Bearer token + ✅ Admin | Yes | Cases, users, revenue counts | `createSupabaseAdminClient`, multiple table queries |
| 62 | GET | `/api/admin/users` | List users (admin only) | ✅ Bearer token + ✅ Admin | Yes | None | `user_profiles` table |
| 63 | PUT | `/api/admin/users` | Update user role (admin only) | ✅ Bearer token + ✅ Admin | Yes | email + role required | `createSupabaseAdminClient`, `user_profiles` table |
| 64 | GET | `/api/admin/ai/metrics` | AI execution metrics (last 24h) | ✅ Bearer token + ✅ Admin | Yes | None | `ai_execution_logs` table |
| 65 | GET | `/api/admin/payments` | Payments summary (admin only) | ✅ Bearer token + ✅ Admin | Yes | Last 500 orders | `payment_orders` table |
| 66 | GET | `/api/admin/payments/gateway` | Gateway configuration status | ❌ Public | No | gateway env vars check | `VENO_*` or `PAGBANK_*` env vars |
| 67 | GET | `/api/admin/payments/affiliates` | Affiliate profiles and relations | ✅ Bearer token + ✅ Admin | Yes | None | `user_profiles`, `referral_relations`, `affiliate_gateway_profiles` |
| 68 | PUT | `/api/admin/payments/affiliates/:userId` | Update affiliate profile | ✅ Bearer token + ✅ Admin | Yes | userId UUID validation, username, splitPercent | `createSupabaseAdminClient`, `user_profiles`, `affiliate_gateway_profiles` |
| 69 | GET | `/api/admin/payments/commissions` | Commission ledger (last 500) | ✅ Bearer token + ✅ Admin | Yes | None | `commission_ledger` table |
| 70 | GET | `/api/admin/documents` | List cases with defense drafts | ✅ Bearer token + ✅ Admin | Yes | None | `cases` table |
| 71 | GET | `/admin/retention/policy` | Data retention policies | ✅ Bearer token + ✅ Admin | Yes | None | `retention` service |
| 72 | PUT | `/admin/retention/policy/:category` | Update retention policy | ✅ Bearer token + ✅ Admin | Yes | Allowed fields: retention_days, description, legal_basis, etc. | `createSupabaseAdminClient`, `data_retention_policies` table |
| 73 | POST | `/admin/retention/run` | Run retention job manually | ✅ Bearer token + ✅ Admin | Yes | None | `runRetention` |
| 74 | GET | `/admin/retention/executions` | Retention execution history | ✅ Bearer token + ✅ Admin | Yes | limit query param | `getRetentionExecutions` |
| 75 | POST | `/api/offers/health` (duplicate in commercial) | Offer health | ❌ Public | No | None | None |

---

## KEY OBSERVATIONS

### Authentication Pattern
- **Public routes**: `#2, #16, #17, #21, #22, #23, #32, #33, #36, #37, #42, #43, #44, #50` — no Bearer token required
- **Authenticated routes**: `#1, #5-15, #18-19, #20, #24-28, #34-35, #38-39, #41, #45-51, #52-59, #61-74` — Bearer token required via `Authorization: Bearer <jwt>`
- **Admin routes**: `#30, #31, #29, #38, #52-53, #54-58, #61-74` — additionally require `user.role === 'admin'` via `requireAdmin` middleware

### Critical Security Controls
1. **Rate limiting**: Only `ANONYMOUS_CASE_LIMITER` (10 requests/min per IP) protects anonymous endpoints (#3, #4, #18)
2. **Payment validation**: `#18, #19, #20` require successful offer resolution + gateway availability
3. **Ownership checks**: `#6, #7, #8, #9, #11, #12, #13, #14, #34, #35` verify `canAccessCase` or `canAccess` 
4. **Payment before defense**: `#15` requires `is_paid === true` before generating defense
5. **Quality Gate**: `#15` runs `runCanonicalQualityGate` and rejects (422) if fails
6. **Webhook signature verification**: `#21, #23, #33` verify external signatures before processing
7. **Idempotent webhooks**: `#21` inserts into `webhook_events` with UNIQUE constraint on event_id

### Notable Gaps / Potential Issues
1. **Route #58** (`/api/marketing/status`) is public — reveals internal counts but no PII
2. **Route #50** (`/api/notifications/vapid-key`) exposes VAPID key if configured — could aid spoofing
3. **Route #33** (`/api/communication/whatsapp/webhook`) only validates `X-Webhook-Secret` if `EVOLUTION_WEBHOOK_SECRET` is set — may allow unauthenticated posts when secret is unset
4. **Route #32** (`/api/communication/webhooks/whatsapp`) always returns 200 ack — no replay protection
5. **Route #16** (`/api/payments/resolve-price`) and #44 (`/api/payments/resolve-price`) — duplicate endpoints, same logic
6. **No rate limiting** on payment creation for authenticated users beyond the anonymous limiter
7. **Route #19** (`/api/payments/simulate-payment`) is protected by `PAYMENT_MODE=sandbox` — fail-closed, but the `requireAdmin` check may not work correctly without prior authentication

### Duplicate Endpoints
- `#16` and `#44` both resolve price with `serviceType` query param — same implementation in `commercial.ts`
- `#43` (`/api/offers/resolve`) and `#16`/`#44` (`/api/payments/resolve-price`) overlap in functionality

---

## Test Coverage Summary

Test files exist for:
- `cloudflare/routes/cases.test.ts` — anonymous intake, recovery, claim, qualification
- `cloudflare/routes/payments.test.ts` — not fully read yet
- `cloudflare/routes/onboarding.test.ts` — not found (searched, not present)
- `cloudflare/routes/ocr.test.ts` — not fully read yet
- `cloudflare/venopag.test.ts` — VenoPag integration tests
- `cloudflare/defense-integrity.test.ts` — defense integrity tests
- `src/server/services/marketing-automation/**` — marketing automation tests
- `src/core/onboarding/legal-validation.test.ts` — legal validation tests
- `src/core/onboarding/reference-cases-legal-validation.test.ts` — reference cases tests

No test files found for: `communication`, `admin`, `knowledge`, `ai`, `monitor`, `marketing` (route-level), `settings`, `notifications` (route-level, only unit-level logic)