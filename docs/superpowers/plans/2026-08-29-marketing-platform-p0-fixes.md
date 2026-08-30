# Marketing Platform P0 Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all P0 blockers from ADR-016/ADR-017 audit: audience NOT NULL violation, CHECK constraint mismatch, MetaPublisher in-memory queue, production mocks, Evolution webhook HMAC, Inbox persistence.

**Architecture:** Incremental fixes preserving existing functionality. Each fix targets a single failure point with test-driven verification. No rewrites — only surgical corrections to make the documented governance actually execute in runtime.

**Tech Stack:** TypeScript, Express, Supabase/PostgreSQL, Evolution API, Meta Graph API v26.0

## Global Constraints

- **Preservation First:** All existing functionality must continue working — zero regression
- **No Mocks in Production:** Any fallback must be behind `DEV_MODE` flag or fail explicitly
- **Persistence Required:** All worker state must survive process restart (Supabase-backed)
- **Skill Contracts:** Runtime must eventually invoke skills, but P0 fixes focus on making current runtime correct
- **TypeScript Strict:** `tsc --noEmit` must pass with zero errors
- **Build Must Pass:** `npm run build` must succeed

---

### Task 1: Fix `audience` NOT NULL Violation in `marketingService.generateContent()`

**Files:**
- Modify: `src/server/services/marketing-service.ts:176-230` (generateContent)
- Modify: `src/server/services/marketing-service.ts:246-291` (createManualContent)
- Test: `src/server/services/marketing-service.test.ts` (new)

**Interfaces:**
- Consumes: `marketingService.generateContent(theme, channel, format)` — must include `audience: 'B2C'` in INSERT
- Produces: `editorial_content` row with `audience` column populated (NOT NULL constraint)

- [ ] **Step 1: Write failing test**

```typescript
// src/server/services/marketing-service.test.ts
import { marketingService } from './marketing-service';

describe('marketingService audience column', () => {
  it('generateContent includes audience=B2C in insert', async () => {
    const result = await marketingService.generateContent('Test Theme', 'instagram', 'carrossel');
    expect(result.success).toBe(true);
    expect(result.content.audience).toBe('B2C');
  });

  it('createManualContent includes audience=B2C in insert', async () => {
    const result = await marketingService.createManualContent({
      title: 'Test',
      channel: 'instagram',
      format: 'carrossel',
      copyText: 'Test copy',
      scheduledDate: new Date().toISOString(),
    });
    expect(result.audience).toBe('B2C');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/server/services/marketing-service.test.ts
```
Expected: FAIL — `audience` undefined in INSERT

- [ ] **Step 3: Fix generateContent**

```typescript
// In generateContent() newContent object, add:
audience: 'B2C',
```

- [ ] **Step 4: Fix createManualContent**

```typescript
// In createManualContent() newContent object, add:
audience: 'B2C',
```

- [ ] **Step 5: Run test to verify pass**

```bash
npm test -- src/server/services/marketing-service.test.ts
```
Expected: PASS

- [ ] **Step 6: Verify build and typecheck**

```bash
npm run lint && npm run build
```

- [ ] **Step 7: Commit**

```bash
git add src/server/services/marketing-service.ts src/server/services/marketing-service.test.ts
git commit -m "fix: add audience=B2C to marketingService content creation (NOT NULL constraint)"
```

---

### Task 2: Align CHECK Constraints — `editorial_content.status` vs `content_versions.status`

**Files:**
- Create: `supabase/migrations/20260829130001_align_content_status_checks.sql`
- Modify: `src/server/services/marketing-service.ts:384-428` (updateContent status handling)
- Test: `supabase/migrations/20260829130001_align_content_status_checks.test.sql` (manual verification)

**Interfaces:**
- Consumes: `editorial_content.status` CHECK (currently 4 values)
- Produces: `editorial_content.status` CHECK aligned with `content_versions.status` (7 values)

- [ ] **Step 1: Create migration adding missing status values**

```sql
-- supabase/migrations/20260829130001_align_content_status_checks.sql
-- Align editorial_content.status CHECK with content_versions.status (7 values)
-- Current editorial_content: rascunho, aprovado_qualidade, agendado, publicado
-- content_versions: draft, em_revisao, aprovado_qualidade, rejeitado, agendado, publicado
-- Target: rascunho, em_revisao, aprovado_qualidade, reprovado_qualidade, agendado, publicado, arquivado

ALTER TABLE public.editorial_content
  DROP CONSTRAINT IF EXISTS editorial_content_status_check;

ALTER TABLE public.editorial_content
  ADD CONSTRAINT editorial_content_status_check
  CHECK (status IN ('rascunho','em_revisao','aprovado_qualidade','reprovado_qualidade','agendado','publicado','arquivado'));
```

- [ ] **Step 2: Apply migration**

```bash
supabase migration up --project-ref llmxnpgjpxcvyrqjkfwb
```

- [ ] **Step 3: Verify constraint in database**

```sql
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.editorial_content'::regclass AND contype = 'c';
```

- [ ] **Step 4: Test status transitions in marketingService**

```typescript
// Verify these status values now work:
await marketingService.updateContent(id, { status: 'em_revisao' });
await marketingService.updateContent(id, { status: 'reprovado_qualidade' });
await marketingService.updateContent(id, { status: 'arquivado' });
```

- [ ] **Step 5: Run build and typecheck**

```bash
npm run lint && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260829130001_align_content_status_checks.sql src/server/services/marketing-service.ts
git commit -m "fix: align editorial_content.status CHECK with content_versions (7 values)"
```

---

### Task 3: Migrate MetaPublisher Queue from Memory Array to Persistent Supabase Queue

**Files:**
- Modify: `src/server/workers/meta-publisher.worker.ts:52, 135-177, 213-229` (queue storage + enqueue + process)
- Modify: `src/server/workers/meta-publisher.worker.ts:179-197` (persistJobRecord — enhance)
- Test: `src/server/workers/meta-publisher.worker.test.ts` (new)

**Interfaces:**
- Consumes: `metaPublisher.enqueue(request, contentId)` — must persist to `publisher_jobs` immediately
- Produces: `publisher_jobs` rows survive process restart; `process()` reads from DB on startup

- [ ] **Step 1: Write failing test**

```typescript
// src/server/workers/meta-publisher.worker.test.ts
import { metaPublisher } from './meta-publisher.worker';

describe('metaPublisher persistent queue', () => {
  it('enqueue persists to publisher_jobs table', async () => {
    const result = await metaPublisher.enqueue({
      destination: 'instagram',
      message: 'Test',
      mediaUrl: 'https://example.com/img.png',
    }, 'test-content-id');
    expect(result.queued).toBe(true);
    // Verify row exists in publisher_jobs
  });

  it('restart recovers pending jobs from publisher_jobs', async () => {
    // Simulate restart by creating new MetaPublisher instance
    // Pending jobs should be loaded from publisher_jobs
  });
});
```

- [ ] **Step 2: Run test to verify fail**

```bash
npm test -- src/server/workers/meta-publisher.worker.test.ts
```
Expected: FAIL — queue is in-memory array

- [ ] **Step 3: Modify enqueue to use marketing_automation_queue pattern**

```typescript
// In enqueue(): instead of this.queue.push(item), INSERT into publisher_jobs
// with status='retrying', then trigger process()

// Add loadPendingJobs() called in constructor:
private async loadPendingJobs(): Promise<void> {
  if (!this.supabase) return;
  const { data } = await this.supabase
    .from('publisher_jobs')
    .select('*')
    .in('status', ['retrying', 'pending'])
    .order('created_at', { ascending: true });
  this.queue = (data || []).map(row => ({
    id: row.id,
    request: row.job_payload as MetaPublishRequest,
    contentId: row.content_id,
    attempts: row.attempt_count,
    nextRetryAt: new Date(row.scheduled_at || row.created_at).getTime(),
  }));
}
```

- [ ] **Step 4: Modify process() to read from DB**

```typescript
// process() should query publisher_jobs WHERE status='retrying' AND next_retry_at <= now
// instead of this.queue array
```

- [ ] **Step 5: Run test to verify pass**

```bash
npm test -- src/server/workers/meta-publisher.worker.test.ts
```

- [ ] **Step 6: Verify build**

```bash
npm run lint && npm run build
```

- [ ] **Step 7: Commit**

```bash
git add src/server/workers/meta-publisher.worker.ts src/server/workers/meta-publisher.worker.test.ts
git commit -m "fix: MetaPublisher queue now persistent via publisher_jobs table (survives restart)"
```

---

### Task 4: Remove Production Mocks — `createFallbackImage()` and `startVideoGeneration()`

**Files:**
- Modify: `src/server/services/ai-media-service.ts:436-460` (createFallbackImage)
- Modify: `src/server/services/ai-media-service.ts:177-182` (startVideoGeneration)
- Modify: `src/server/services/ai-media-service.ts:68-72, 143-147` (other fallbacks)
- Test: `src/server/services/ai-media-service.test.ts` (new)

**Interfaces:**
- Consumes: `aiMediaService.generateImage()`, `generateVideo()` — must fail explicitly if providers unavailable
- Produces: Real media URLs or explicit errors (no SVG/Base64 mocks)

- [ ] **Step 1: Write failing test**

```typescript
// src/server/services/ai-media-service.test.ts
import { aiMediaService } from './ai-media-service';

describe('aiMediaService no mocks in production', () => {
  it('generateImage throws if no provider available (not mock SVG)', async () => {
    // In production mode, should throw or return real URL, never base64 SVG
  });

  it('startVideoGeneration throws if Veo unavailable (not fake URL)', async () => {
    // Should not return fake video URL
  });
});
```

- [ ] **Step 2: Run test to verify fail**

```bash
npm test -- src/server/services/ai-media-service.test.ts
```
Expected: FAIL — mocks currently returned

- [ ] **Step 3: Add DEV_MODE guard**

```typescript
// In ai-media-service.ts, add:
const isDev = process.env.NODE_ENV !== 'production' && process.env.DEV_ALLOW_MOCKS === 'true';

// Wrap createFallbackImage:
if (!isDev) {
  throw new Error('Image generation failed and mocks disabled in production');
}
return createFallbackImage(); // only in dev

// Wrap startVideoGeneration fake:
if (!isDev) {
  throw new Error('Video generation unavailable (Veo not configured)');
}
```

- [ ] **Step 4: Run test to verify pass**

```bash
npm test -- src/server/services/ai-media-service.test.ts
```

- [ ] **Step 5: Verify build**

```bash
npm run lint && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/server/services/ai-media-service.ts src/server/services/ai-media-service.test.ts
git commit -m "fix: remove production mocks from aiMediaService (createFallbackImage, startVideoGeneration)"
```

---

### Task 5: Add HMAC Validation to Evolution Webhook

**Files:**
- Modify: `src/server/shared/webhook/evolution-webhook-auth.ts` (add HMAC verify)
- Modify: `src/server/routes/whatsapp.ts` (apply middleware)
- Test: `src/server/shared/webhook/evolution-webhook-auth.test.ts` (new)

**Interfaces:**
- Consumes: Raw webhook payload + `X-Webhook-Secret` header
- Produces: Validated payload or 401 rejection

- [ ] **Step 1: Write failing test**

```typescript
// src/server/shared/webhook/evolution-webhook-auth.test.ts
import { verifyEvolutionSignature } from './evolution-webhook-auth';

describe('Evolution webhook HMAC', () => {
  it('validates correct HMAC signature', () => {
    const payload = JSON.stringify({ test: 'data' });
    const secret = 'test-secret';
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    expect(verifyEvolutionSignature(payload, `sha256=${signature}`, secret)).toBe(true);
  });

  it('rejects invalid signature', () => {
    expect(verifyEvolutionSignature('payload', 'sha256=wrong', 'secret')).toBe(false);
  });

  it('rejects missing signature', () => {
    expect(verifyEvolutionSignature('payload', undefined, 'secret')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify fail**

```bash
npm test -- src/server/shared/webhook/evolution-webhook-auth.test.ts
```
Expected: FAIL — function doesn't exist

- [ ] **Step 3: Implement HMAC verification**

```typescript
// src/server/shared/webhook/evolution-webhook-auth.ts
import crypto from 'crypto';

export function verifyEvolutionSignature(
  rawPayload: string | Buffer,
  signatureHeader: string | undefined,
  secret: string
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }
  const expected = signatureHeader.replace('sha256=', '');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(typeof rawPayload === 'string' ? rawPayload : rawPayload.toString('utf8'));
  const calculated = hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(calculated, 'hex'), Buffer.from(expected, 'hex'));
}
```

- [ ] **Step 4: Apply middleware in whatsapp.ts route**

```typescript
// In whatsapp webhook handler:
const secret = process.env.EVOLUTION_WEBHOOK_SECRET;
if (!verifyEvolutionSignature(rawBody, req.headers['x-webhook-secret'], secret)) {
  return res.status(401).json({ error: 'Invalid signature' });
}
```

- [ ] **Step 5: Run test to verify pass**

```bash
npm test -- src/server/shared/webhook/evolution-webhook-auth.test.ts
```

- [ ] **Step 6: Verify build**

```bash
npm run lint && npm run build
```

- [ ] **Step 7: Commit**

```bash
git add src/server/shared/webhook/evolution-webhook-auth.ts src/server/routes/whatsapp.ts src/server/shared/webhook/evolution-webhook-auth.test.ts
git commit -m "fix: add HMAC SHA-256 validation to Evolution webhook (prevents spoofing)"
```

---

### Task 6: Persist Inbox B2C State to Supabase (contacts, conversations, messages)

**Files:**
- Create: `supabase/migrations/20260829130002_create_messaging_tables.sql`
- Modify: `src/server/services/messaging-service.ts` (replace Maps with Supabase persistence)
- Test: `src/server/services/messaging-service.test.ts` (new)

**Interfaces:**
- Consumes: `messagingService` methods (getConversations, getMessages, sendMessage, processIncomingMessage)
- Produces: All state in `messaging_contacts`, `messaging_conversations`, `messaging_messages` tables

- [ ] **Step 1: Create migration**

```sql
-- supabase/migrations/20260829130002_create_messaging_tables.sql
CREATE TABLE IF NOT EXISTS public.messaging_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  channel text NOT NULL,
  external_id text NOT NULL,
  avatar_url text,
  lead_id uuid,
  vehicle_plate text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, external_id)
);

CREATE TABLE IF NOT EXISTS public.messaging_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.messaging_contacts(id) ON DELETE CASCADE,
  channel text NOT NULL,
  channel_label text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','archived')),
  unread_count integer NOT NULL DEFAULT 0,
  last_message_text text,
  last_message_at timestamptz,
  ai_mode text NOT NULL DEFAULT 'auto' CHECK (ai_mode IN ('auto','copilot','off')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messaging_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.messaging_conversations(id) ON DELETE CASCADE,
  channel text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  sender_id text NOT NULL,
  sender_name text NOT NULL,
  text text,
  media_url text,
  media_type text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','read','failed')),
  external_message_id text,
  raw_metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messaging_contacts_channel_ext ON public.messaging_contacts (channel, external_id);
CREATE INDEX IF NOT EXISTS idx_messaging_conversations_contact ON public.messaging_conversations (contact_id);
CREATE INDEX IF NOT EXISTS idx_messaging_conversations_channel ON public.messaging_conversations (channel);
CREATE INDEX IF NOT EXISTS idx_messaging_messages_conversation ON public.messaging_messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messaging_messages_created ON public.messaging_messages (created_at);
```

- [ ] **Step 2: Apply migration**

```bash
supabase migration up --project-ref llmxnpgjpxcvyrqjkfwb
```

- [ ] **Step 3: Refactor messagingService to use Supabase**

```typescript
// Replace Maps with Supabase queries:
// - findContactByExternalId -> SELECT FROM messaging_contacts
// - getConversations -> SELECT FROM messaging_conversations JOIN contacts
// - getMessages -> SELECT FROM messaging_messages
// - sendMessage -> INSERT messaging_messages + UPDATE conversation
// - processIncomingMessage -> UPSERT contact + conversation + INSERT message
```

- [ ] **Step 4: Write test**

```typescript
// Verify restart preserves conversations:
const conv = await messagingService.getConversations();
// Should return previously persisted data
```

- [ ] **Step 5: Run test**

```bash
npm test -- src/server/services/messaging-service.test.ts
```

- [ ] **Step 6: Verify build**

```bash
npm run lint && npm run build
```

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260829130002_create_messaging_tables.sql src/server/services/messaging-service.ts src/server/services/messaging-service.test.ts
git commit -m "fix: persist Inbox B2C state to Supabase (contacts, conversations, messages survive restart)"
```

---

## Execution Order & Dependencies

```
Task 1 (audience)          → Independent, do first
Task 2 (CHECK constraints) → Independent, do second  
Task 3 (MetaPublisher queue) → Independent, do third
Task 4 (remove mocks)      → Independent, do fourth
Task 5 (Evolution HMAC)    → Independent, do fifth
Task 6 (Inbox persistence) → Independent, do last (largest)
```

All tasks can be executed in parallel by different subagents since they touch different files.

---

## Verification Checklist (Run After All Tasks)

- [ ] `npm run lint` — zero TypeScript errors
- [ ] `npm run build` — successful build
- [ ] `npm test` — all new tests pass
- [ ] Manual: Restart server → MetaPublisher queue recovers pending jobs
- [ ] Manual: Restart server → Inbox conversations preserved
- [ ] Manual: POST /marketing/publish → content inserted with audience=B2C
- [ ] Manual: Evolution webhook with invalid signature → 401 rejected
- [ ] Manual: generateImage in production → throws (no mock SVG)

---

**Plan complete. Ready for execution via subagent-driven-development.**