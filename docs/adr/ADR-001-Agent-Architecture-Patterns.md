# ADR-001: Agent Architecture Patterns

## Status
Accepted

## Context
The DefesaAi/Adeus Multa system implements a multi-agent architecture to handle complex traffic violation defense workflows. During an architecture review, it was observed that the system follows a two-level agent pattern but with incomplete implementations.

## Decision
We will implement and standardize the **Coordinator-Specialized Agent Pattern**:

### High-Level Coordinator Agents
- Define workflow orchestration and business logic
- Delegate tasks to specialized agents based on state and rules
- Examples: `case-agent`, `knowledge-agent`, `ai-analysis-agent`
- Responsible for determining which specialized agents to invoke and when

### Specialized Implementation Agents
- Execute specific, well-defined tasks
- Handle domain-specific processing (OCR, legal research, document generation, etc.)
- Examples: `ocr-extractor`, `document-planner`, `pricing-agent`
- Each agent focuses on a single responsibility (SRP)

### Communication Mechanism
- Agents communicate through a shared `CaseContext` object
- Context flows sequentially through the pipeline
- Each agent reads from and writes to specific sections of the context
- No direct agent-to-agent communication (mediated through context)

## Consequences

### Benefits
- Clear separation of concerns between orchestration and execution
- Easy to add new specialized agents without changing coordinators
- Workflow logic is centralized in coordinator agents
- Specialized agents can be developed and tested independently
- Follows Single Responsibility Principle

### Drawbacks
- Requires careful design of the CaseContext interface
- Potential for context to become bloated with many properties
- Debugging can be more complex due to indirect communication
- Initial overhead in defining context contracts

## Implementation Status
As of the audit:
- ✅ Specialized agents implemented: OCR extractor/classifier/validator, document planner/drafter/layout, product agents (pricing/retention/analytics), onboarding agents
- ⚠️ Coordinator agents partially implemented: Many high-level agents (.md files) lack TypeScript implementations
- 🔧 In progress: Missing coordinator agents being implemented (ai-analysis-agent, document-agent, communication-agent)

## Related
- ADR-002: Pipeline Orchestrator Design
- ADR-003: CaseContext Contract
- ADR-004: Agent Delegation Conventions