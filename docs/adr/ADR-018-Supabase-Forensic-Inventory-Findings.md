# ADR-018: Supabase Forensic Inventory Findings

## Status
Accepted

## Date
2026-09-23

## Context
During routine operations, a critical discovery was made regarding the Supabase project state. Initial assumptions suggested the database might be empty or require reconstruction, but direct investigation revealed:

1. The Supabase project with ID `llmxnpgjpxcvyrqjkfwb` (named "Defesai-AdeusMultas") is ACTIVE_HEALTHY and contains real production data
2. An older project ID `sgomwklorpzdwdubtmgg` was previously referenced but has been removed
3. Running destructive operations (like full database recreation) would risk losing valuable existing data
4. The migration history shows inconsistencies with duplicate applications of the same migrations

Key data points discovered:
- cases table: 60 records
- user_profiles table: 4 records  
- payment_orders table: 14 records
- e2e_test_runs table: 3 records
- e2e_test_results table: 36 records
- documenso_envelopes table: 0 records

Migration analysis revealed:
- 63 entries in supabase_migrations.schema_migrations table (with duplicates)
- 42 migration files in the Git repository
- Security advisors flag RLS enabled tables without policies and extensions in public schema

## Decision
Adopt a forensic inventory approach (FASE 0) before making any database changes:
1. **PRESERVE** existing data and state - do not destroy or recreate the database
2. **INVENTORY** current state vs Git history to understand discrepancies
3. **IDENTIFY** what data exists, what's missing, and what requires attention
4. **ADDRESS** infrastructure issues (RLS policies, extension placement) before schema changes
5. **DOCUMENT** all findings and decisions transparently

Specific actions to take:
1. Do NOT run any migrations or make schema changes immediately
2. Resolve duplicate migration entries in supabase_migrations.schema_migrations
3. Address RLS policy gaps flagged by security advisors
4. Move extensions (vector, pg_trgm, citext) from public schema to appropriate schemas
5. Verify data integrity through application-level checks
6. Only after completing the above, consider any necessary schema migrations

## Alternatives Considered

### Full Database Recreation
- Pros: Would ensure clean state matching Git exactly
- Cons: Would destroy 60+ cases, 14+ payment orders, and other production data
- Rejected: Data loss unacceptable without explicit user consent and backup strategy

### Selective Migration Application
- Pros: Would bring database closer to Git state
- Cons: Risk of conflicts with existing data; doesn't address underlying migration history issues
- Rejected: Should only be attempted after cleaning up migration history

### Do Nothing / Maintain Status Quo
- Pros: Preserves all existing data and avoids risk
- Cons: Leaves known infrastructure issues (RLS gaps, extension placement) unaddressed
- Rejected: Infrastructure issues should be resolved for security and best practices

## Consequences
- Short-term: Database remains in current state with known infrastructure issues
- Medium-term: After implementing this ADR, database will have:
  - Cleaned migration history (no duplicate entries)
  - Proper RLS policies on all RLS-enabled tables
  - Extensions moved to appropriate schemas
  - Verified data integrity
- Long-term: Enables safe, predictable future migrations and schema changes
- Risk: Process of fixing migration history and RLS policies requires careful execution to avoid unintended side effects
- Mitigation: All changes will be tested in a branch first, with backups taken before any modifications

## Related Decisions
- ADR-009: Created the payment_orders table (referenced in current data findings)
- ADR-008: Agent Topology Unification (establishes current agent architecture)
- Security Advisories: Directly inspired the RLS and extension placement actions

## Validation
- [ ] Backup current database state before any changes
- [ ] Verify case count remains 60 after infrastructure fixes
- [ ] Verify user_profiles count remains 4 after infrastructure fixes
- [ ] Confirm RLS policies exist on all tables that have RLS enabled
- [ ] Confirm vector, pg_trgm, citext extensions are moved from public schema
- [ ] Validate application functionality remains intact after changes