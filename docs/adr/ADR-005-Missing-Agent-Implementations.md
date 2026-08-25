# ADR-005: Missing Agent Implementations

## Status
Accepted

## Context
During the architecture audit, it was discovered that 38 out of 62 agent definition files (.md) lacked corresponding TypeScript implementations. This created a risk of runtime errors when coordinator agents attempted to delegate work to non-existent agents, particularly for core workflow agents like ai-analysis-agent, document-agent, and communication-agent referenced by the case-agent.

## Decision
We will implement missing core agent definitions as TypeScript classes extending BaseAgent, following the established agent pattern in the codebase.

## Implemented Agents

### 1. AI Analysis Agent (`agents/ai-analysis-agent.ts`)
**Purpose**: Handles AI-powered analysis of traffic violations
**Responsibilities**:
- OCR data processing and field validation
- Interpretation of CTB (Brazilian Traffic Code) articles
- Application of CONTRAN resolutions and DENATRAN deliberations
- Jurisprudence research and precedent matching
- Generation of defense minutes and legal arguments
- Integration with 9Router for LLM access and NVIDIA NIM for specialized models

**Implementation Details**:
- Extends BaseAgent with proper typing
- Implements `process(context: CaseContext): Promise<CaseContext>`
- Sets name and version properties
- Uses recordUsage for telemetry
- Includes TODO placeholder for domain-specific logic

### 2. Document Agent (`agents/document-agent.ts`)
**Purpose**: Generates legal documents for traffic violation defenses
**Responsibilities**:
- Template management for various defense types
- PDF and DOCX document generation
- Version control and document history
- Formatting according to legal standards
- Integration with legal research and strategy outputs
- Digital signature preparation (when applicable)

**Implementation Details**:
- Extends BaseAgent with proper typing
- Implements `process(context: CaseContext): Promise<CaseContext>`
- Sets name and version properties
- Uses recordUsage for telemetry
- Includes TODO placeholder for domain-specific logic

### 3. Communication Agent (`agents/communication-agent.ts`)
**Purpose**: Manages user communications throughout the defense process
**Responsibilities**:
- WhatsApp messaging via Evolution API
- Message templates for different workflow stages
- Incoming message processing and webhook handling
- Email and push notification fallback
- Communication logging and audit trails
- User preference management for communication channels

**Implementation Details**:
- Extends BaseAgent with proper typing
- Implements `process(context: CaseContext): Promise<CaseContext>`
- Sets name and version properties
- Uses recordUsage for telemetry
- Includes TODO placeholder for domain-specific logic

## Implementation Pattern
All implemented agents follow the standardized pattern:
```typescript
import { BaseAgent } from "@/agents/base-agent";
import type { CaseContext } from "@/lib/types/agent-interfaces";

export class [AgentName]Agent extends BaseAgent {
  protected name = "[agent-name]";
  protected version = "1.0.0";

  public async process(context: CaseContext): Promise<CaseContext> {
    // TODO: Implement domain-specific logic
    
    context.metadata.stepsCompleted.push("[agent-name]");
    this.recordUsage(["domain-specific-operation"]);
    
    return context;
  }
}
```

## Consequences

### Benefits
- Eliminates runtime errors from missing agent references
- Enables coordinator agents to successfully delegate work
- Provides foundation for implementing domain-specific logic
- Maintains consistency with existing agent implementations
- Supports the delegation conventions established in ADR-004
- Improves overall system reliability and completeness

### Drawbacks
- Initial implementation contains only scaffolding (TODO placeholders)
- Requires subsequent work to implement actual domain logic
- Adds to the codebase that needs maintenance
- Potential for inconsistency if not all agents follow the pattern

## Implementation Status
- ✅ All three core missing agents implemented with proper BaseAgent inheritance
- ✅ TypeScript compilation successful under existing module aliases
- ✅ Agents integrate with CaseContext through metadata tracking
- ✅ Telemetry hooks in place for usage monitoring
- 🔧 Next steps: Implement domain-specific logic for each agent based on their documented responsibilities

## Related
- ADR-001: Agent Architecture Patterns
- ADR-004: Agent Delegation Conventions
- ADR-006: Pipeline Dependency Injection (enables use of these agents)