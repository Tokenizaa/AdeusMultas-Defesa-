# ADR-004: Agent Delegation Conventions

## Status
Accepted

## Context
High-level coordinator agents (like case-agent) need to delegate work to specialized implementation agents. Initially, delegation was inconsistently implemented, with some agents hardcoding dependencies and others using vague delegation patterns.

## Decision
We will establish **explicit delegation conventions** for coordinator agents to ensure loose coupling, clear responsibility boundaries, and maintainable workflows.

## Delegation Principles

### 1. Explicit Agent References
Coordinators must reference agents by their standardized names using the `@agent-name` convention in documentation and comments.

### 2. Capability-Based Delegation
Delegation decisions should be based on:
- Current state of the CaseContext
- Business rules and workflow requirements
- Agent capabilities and responsibilities
- Not on specific implementation details

### 3. Fallback Mechanisms
When delegating to an agent:
- Prefer injected/provided agent instances
- Fall back to default instantiation if not provided
- Handle missing agents gracefully with clear error messages
- Never assume an agent exists without verification

### 4. Single Responsibility Delegation
Each delegation should assign a single, well-defined task to an agent:
- "Extract OCR fields" not "process the entire OCR layer"
- "Generate defense strategy" not "handle all legal work"
- This preserves the specialized agent pattern

## Implementation Pattern

### In Coordinator Agents (TypeScript)
```typescript
// Preferred: Accept agents via constructor or method injection
public async process(context: CaseContext, agents?: AgentMap): Promise<CaseContext> {
  const ocrExtractor = agents?.ocrExtractor ?? new OCRExtractorAgent();
  // ... use ocrExtractor
}
```

### In Documentation (.md files)
When a coordinator needs to delegate work:
> Se encontrar tarefa fora do seu escopo, recomende explicitamente: "agora use o agent @NOME"

Examples:
- "agora use o agent @ai-analysis-agent" for AI-powered legal analysis
- "agora use o agent @document-agent" for document generation
- "agora use o agent @communication-agent" for user notifications

### Error Handling for Delegation
- If a required agent is unavailable, return clear error to user
- Log delegation attempts for audit trails
- Consider compensatory actions when possible
- Never fail silently when delegation is impossible

## Consequences

### Benefits
- Clear audit trail of which agents were invoked and when
- Easy to trace workflow execution through delegation comments
- Enables dynamic agent swapping (testing, A/B testing, strategy changes)
- Reduces hidden dependencies between agents
- Supports the "tell, don't ask" principle - agents declare what they need
- Documentation matches implementation through explicit delegation

### Drawbacks
- Slightly more verbose than implicit delegation
- Requires updating documentation when delegation changes
- Delegation logic still needs to be implemented in code

## Implementation Status
- ✅ Coordinator agent definition files updated with delegation convention
- ✅ Standard phrase established: "agora use o agent @NOME"
- ✅ Missing agents implemented to support delegation (ai-analysis-agent, document-agent, communication-agent)
- ✅ Pipeline orchestrator supports agent injection for delegation
- 🔧 In progress: Ensuring all coordinator agents follow delegation conventions in their implementation

## Related
- ADR-001: Agent Architecture Patterns
- ADR-002: Pipeline Orchestrator Design
- ADR-005: Missing Agent Implementations