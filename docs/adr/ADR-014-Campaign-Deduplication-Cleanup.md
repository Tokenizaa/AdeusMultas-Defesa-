# ADR-014: Campaign Deduplication Cleanup — "Campanha Inaugural" (6 Duplicates)

## Status
Accepted

## Context
The `marketing_campaigns` table contains **6 rows** with identical name `"Campanha Inaugural"`. 
- 2 of these are referenced by `editorial_content.campaign_id` (1 row references campaign_id=A, 6 rows reference campaign_id=B)
- 0 references in `marketing_lead_campaigns` or `marketing_messages`
- User reported image issues with these campaigns and requested: *"delete these campaigns and create all new ones based on new parameters"* (with `audience='B2B'`, correct `lead_type`, valid images)

The `editorial_content.campaign_id` FK has `ON DELETE SET NULL` (per baseline migration), so DELETE is safe after clearing refs.

## Decision

### 1. Cleanup Migration (executed by @banco)
```sql
-- Step 1: Clear FK references in editorial_content
UPDATE public.editorial_content
SET campaign_id = NULL
WHERE campaign_id IN (
  SELECT id FROM public.marketing_campaigns WHERE name = 'Campanha Inaugural'
);

-- Step 2: Delete the 6 duplicate campaigns
DELETE FROM public.marketing_campaigns
WHERE name = 'Campanha Inaugural';
```

### 2. Recreation (via UI/API by @backend + @frontend)
- Create new campaigns with correct parameters:
  - `audience = 'B2B'` (required per P0.3)
  - `lead_type` = `'despachante'` or `'advogado_transito'` (correct per lead)
  - Valid `image_url` / `visual_prompt` (no broken images)
  - Proper `steps` JSONB for cadence
  - `target_cities` populated

### 3. Verification
- Post-cleanup: `SELECT count(*) FROM marketing_campaigns WHERE name = 'Campanha Inaugural'` → 0
- `editorial_content.campaign_id` all NULL for those rows
- New campaigns created with `audience='B2B'` verified

## Owner
- **Cleanup migration**: `@banco` (database layer)
- **Recreation**: `@backend` (API endpoints) + `@frontend` (admin UI for campaign creation)

## Consequences

### Benefits
- Eliminates duplicate/confusing campaign data
- Fixes image corruption at source (fresh creation)
- Enforces new `audience` field from P0.3
- Clean slate for B2B prospecting automation

### Risks
- If any hidden references exist (e.g., in app code caching campaign IDs), they break
- Mitigation: grep for hardcoded campaign UUIDs before migration

## References
- User directive: "tivemos problemas com as imagens das campanhas o ideal seria apagar essa campanhas e criar todoas novos com base nos novos parametros"
- P0.3 migration (20260829120001_add_audience_segmentation_and_opt_out.sql) — `audience` now required
- Baseline migration shows `editorial_content.campaign_id` FK: `ON DELETE SET NULL`