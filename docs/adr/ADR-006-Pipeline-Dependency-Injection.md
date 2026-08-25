# ADR-006: Pipeline Dependency Injection Refactoring

## Status
Accepted

## Context
The original pipeline orchestrator (`agents/pipeline/runner.ts`) had tight coupling between the pipeline logic and specific agent implementations. This created several issues:
- Difficulty in testing the pipeline in isolation
- Challenges substituting agent implementations (e.g., for testing or different strategies)
- Violated the Dependency Inversion Principle (SOLID)
- Made it hard to use alternative agent implementations without modifying pipeline code

## Decision
We will refactor the pipeline runner to use **Dependency Injection** while maintaining backward compatibility through optional parameters.

## Refactored Pipeline Runner

### New Interface
Added `PipelineAgents` interface to define the contract for agent injection:
```typescript
export interface PipelineAgents {
  [key: string]: any; // Agent instances with process() method
}
```

### Modified Function Signature
Changed `runPipeline` to accept an optional agents parameter:
```typescript
export async function runPipeline(
  initialContext: Partial<CaseContext>, 
  agents: PipelineAgents = {}
): Promise<PipelineResult>
```

### Agent Resolution Logic
The resolver uses dependency injection with fallback to default instantiation:
```typescript
// For each agent type:
// 1. Check if agent provided in agents parameter
// 2. If yes, use the provided instance
// 3. If no, fall back to default instantiation (original behavior)
const onboardingUX = agents?.onboardingUx ?? new OnboardingUXAgent();
```

### Preserved Existing Behavior
- When `agents` parameter is omitted or empty, behaves identically to original
- All existing invocations continue to work without changes
- No breaking changes to the public API

### Maintained Casting Workaround
Preserved the existing pattern for calling protected `process` methods:
```typescript
(agent as any).process(context)
```
This matches the pattern used elsewhere in the codebase and avoids refactoring all agent base classes just for the pipeline.

## Consequences

### Benefits
- **Loose Coupling**: Pipeline no longer depends on concrete agent implementations
- **Testability**: Easy to inject mock agents for unit testing the pipeline
- **Flexibility**: Can substitute alternative implementations (e.g., mock OCR agents for testing)
- **Backward Compatibility**: Existing code continues to work unchanged
- **SOLID Compliance**: Better adherence to Dependency Inversion Principle
- **Explicit Dependencies**: Makes agent requirements visible in function signature

### Drawbacks
- Slightly more complex function signature
- Requires callers who want injection to construct the agents parameter
- Runtime resolution vs compile-time (though this matches existing patterns)
- The `any` cast remains for protected method access (acceptable trade-off)

## Implementation Status
- ✅ Pipeline runner refactored with dependency injection support
- ✅ Backward compatibility fully preserved
- ✅ All pipeline layers support optional agent injection
- ✅ Error handling and logging unchanged
- ✅ Metadata and telemetry functionality preserved
- ✅ TypeScript compilation successful
- ✅ Existing invocations in `src/server/routes/agents.ts` updated with correct path

## Usage Examples

### Existing Usage (Unchanged)
```typescript
// Works exactly as before - uses default instantiation
const result = await runPipeline(initialContext);
```

### With Dependency Injection (New Capability)
```typescript
// For testing with mocks
const mockOcrExtractor = {
  process: async (context) => {
    // Mock implementation
    return context;
  }
};

const result = await runPipeline(initialContext, {
  ocrExtractor: mockOcrExtractor
});

// For using alternative implementations
const result = await runPipeline(initialContext, {
  pricingAgent: new AlternativePricingAgent(),
  retentionAgent: new ExperimentalRetentionAgent()
});
```

## Related
- ADR-001: Agent Architecture Patterns
- ADR-002: Pipeline Orchestrator Design
- ADR-005: Missing Agent Implementations (these agents can now be injected)