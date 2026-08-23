# ADR-008: Agent Topology Unification

## Status
Accepted

## Context
The project currently contains **two independent agent systems** that coexist without integration:

### System A — Legacy Pipeline Agents (`agents/`)
- Pipeline-style agent definitions (`.md` + partial `.ts` implementations): `admin-agent`, `ai-analysis-agent`, `automation-agent`, `base-agent`, `case-agent`, `communication-agent`, `crm-agent`, `document-agent`, `infrastructure-agent`, `knowledge-agent`, `marketing-agent`, `payment-agent`, plus subdirectories (`legal/`, `document/`, `ocr/`, `quality/`, `product/`, `marketing-platform/`, `pipeline/`).
- **31 TypeScript errors** in the partial implementations.
- Imports `CaseContext` — an interface that **never existed** (documented in ADR-005-Missing-Agent-Implementations.md, which also records that 38 of 62 agent definitions lacked TypeScript implementations).
- **Zero imports from `src/`** — verified via `rg "agents/" src/` (0 matches). Nothing in the runtime references it.
- Excluded from the TypeScript build since commit `57253b9` (`"exclude": [..., "agents"]` in `tsconfig.json`), explicitly labeled "legacy agents/ scaffold".

### System B — AGENTS.md Agent-Loop Topology
- Declarative topology (core, domain, and specialized agents) orchestrated by `@agent-loop`.
- This is the **real system in use**: all active workflows (new features, bug fixes, refactoring, cross-domain features) route through `@agent-loop` / `@supervisor`.

### Conflict
Two sources of truth for "what agents exist" create ambiguity: new readers and other agents cannot tell which system is authoritative, and dead scaffolding in `agents/` is a permanent invitation to use it or "fix" it.

## Decision
**AGENTS.md is the single canonical source of truth** for the agent topology.

`agents/` is classified as **legacy / archived in place**:
- **Not deleted** — deletion is destructive with no guarantee that the partial implementations or `.md` definitions hold no future reference value (git history + partial TS may be consulted).
- **Not migrated** — migration is expensive and has zero runtime benefit: no `src/` code imports it, and it is already excluded from the build.
- **Not moved** — it stays at `agents/` with clear documentation pointing to this ADR.

Rules going forward:
1. No new code may import from `agents/`.
2. No new resources may be created inside `agents/`.
3. Any future deletion, migration, or resurrection of `agents/` content requires a new ADR.

This is consistent with commit `57253b9` ("exclude legacy agents/ scaffold from tsconfig"), which already treated `agents/` as dead scaffold.

## Consequences

### Benefits
- **Single source of truth**: AGENTS.md is authoritative; ambiguity about agent topology is eliminated.
- **Runtime safety**: the dead scaffold cannot be accidentally imported (build exclusion made permanent, documented import ban).
- **History preserved**: archived-in-place keeps reference value without maintenance cost.
- **Explicit governance**: any change to `agents/` requires an ADR, preventing silent resurrection or destruction.

### Drawbacks
- Dead scaffold remains in the repository, occupying notional space.
- Risk of future confusion is mitigated but not eliminated — mitigated by the explicit "Legacy" section in AGENTS.md pointing to this ADR and ADR-005.

### References
- ADR-005-Missing-Agent-Implementations.md (documents `CaseContext` never existing, 38/62 agents unimplemented)
- commit `57253b9` (agents/ excluded from tsconfig)