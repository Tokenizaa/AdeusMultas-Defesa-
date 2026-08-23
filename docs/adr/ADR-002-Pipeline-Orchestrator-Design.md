# ADR-002: Pipeline Orchestrator Design

## Status
Accepted

## Context
The system processes traffic violation cases through a sequential workflow involving multiple stages: onboarding, OCR processing, legal analysis, document generation, quality checks, and product offerings. Initially, the pipeline had tight coupling between the orchestrator and specific agent implementations.

## Decision
We will implement a **Layered Pipeline Orchestrator** with optional dependency injection:

### Pipeline Structure
The pipeline consists of 6 sequential layers:
1. **Experience Layer**: onboarding-ux → onboarding-copywriter → legal-ux-reviewer
2. **OCR Layer**: ocr-classifier → ocr-extractor → ocr-validator  
3. **Legal Knowledge Layer**: legal-classifier → legal-researcher → legal-strategist
4. **Document Layer**: document-planner → document-drafter → legal-style-reviewer → citation-validator → document-layout
5. **Quality Layer**: legal-auditor → hallucination-checker → contradiction-checker → completeness-reviewer
6. **Product Layer**: pricing-agent → retention-agent → analytics-agent

### Dependency Injection Pattern
The pipeline runner (`agents/pipeline/runner.ts`) now accepts an optional `agents` parameter:
```typescript
export async function runPipeline(
  initialContext: Partial<CaseContext>, 
  agents: PipelineAgents = {}
): Promise<PipelineResult>
```

Where `PipelineAgents` is an interface mapping agent names to instances:
```typescript
export interface PipelineAgents {
  [key: string]: any; // Agent instances with process() method
}
```

### Error Handling
- Each step runs in isolation with try/catch
- Failed steps can be retried (configurable)
- Pipeline can continue with partial data when failures are recoverable
- Fatal errors halt the pipeline and return user-friendly messages

### Logging and Telemetry
- Each step logs execution status, duration, and errors
- Warnings are collected from quality agents (hallucinations, completeness)
- Metadata tracks completed steps for audit trails
- Hash generation ensures document integrity

## Consequences

### Benefits
- Reduced coupling between orchestrator and specific implementations
- Easier to substitute agent implementations (testing, different strategies)
- Backward compatibility maintained (default instantiation when no agents provided)
- Clear separation of pipeline orchestration logic from agent logic
- Improved testability through dependency injection

### Drawbacks
- Slightly more complex pipeline invocation pattern
- Requires discipline to maintain the `PipelineAgents` interface
- Runtime resolution of agents (vs compile-time) in default mode

## Implementation Status
- ✅ Pipeline runner refactored to support dependency injection
- ✅ Backward compatibility preserved (existing calls unchanged)
- ✅ All 6 layers properly sequenced in orchestrator
- ✅ Error handling and recovery mechanisms implemented
- ✅ Logging and telemetry integrated

## Related
- ADR-001: Agent Architecture Patterns
- ADR-003: CaseContext Contract