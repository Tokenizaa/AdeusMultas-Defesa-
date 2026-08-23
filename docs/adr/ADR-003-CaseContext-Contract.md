# ADR-003: CaseContext Contract

## Status
Accepted

## Context
Agents in the DefesaAi system need to share data and state as they process traffic violation cases. Initially, the context structure was implicit and inconsistently typed, leading to potential runtime errors and unclear contracts between agents.

## Decision
We will define a **strongly-typed, incrementally-populated CaseContext interface** that serves as the shared data contract between all agents.

## CaseContext Structure
The `CaseContext` interface (defined in `src/lib/types/agent-interfaces.ts`) consists of clearly delineated sections, each populated by specific pipeline layers:

### 1. Onboarding Data (Layer 1)
```typescript
user: { nome, cpf, cnh, endereco, cidade, uf }
```

### 2. Infraction Data (Layers 1 & 2)  
```typescript
infraction: { placa, numero_auto, orgao_autuador, codigo_infracao, data, fotos? }
service: { tipo, preco }
```

### 3. OCR Results (Layer 2)
```typescript
ocr: { raw_text, document_type, extracted_fields, confidence }
validated_fields: { campo, valor, fonte_confianca }[]
```

### 4. Legal Analysis (Layer 3)
```typescript
classification: LegalClassification
legal_research: LegalResearch  
strategy: Strategy
```

### 5. Document Generation (Layer 4)
```typescript
document_plan: DocumentPlan
draft: Draft
reviewed_draft: Draft
```

### 6. Quality Checks (Layer 5)
```typescript
audit: AuditReport
hallucination_check: HallucinationReport
contradictions: ContradictionReport
completeness: CompletenessReport
citation_validation: CitationValidationResult
```

### 7. Metadata (All Layers)
```typescript
metadata: {
  document_id: string,
  version: string,
  hash: string,
  steps_completed: string[],
  validated_fields: ValidatedField[]
}
```

## Key Properties

### Optional Fields
All context sections are optional to support:
- Partial initialization (pipeline starts with minimal data)
- Incremental population as agents execute
- Recovery from failures (pipeline can continue with available data)
- Conditional execution (some agents may skip based on context)

### Type Safety
- Each section has a specific TypeScript interface
- Prevents accidental misuse of data between layers
- Enables IDE autocomplete and refactoring support
- Compile-time validation of agent-context interactions

### Immutability Principles
While the context is mutable during pipeline execution:
- Agents should only write to their designated sections
- Agents should not modify sections from previous layers
- Previous layer data is treated as read-only
- This maintains clear data flow and prevents unintended side effects

## Consequences

### Benefits
- Clear contract between agents reduces integration errors
- Self-documenting code through explicit typing
- Enables static analysis and linting of agent interactions
- Supports incremental development and testing of agents
- Provides audit trail through steps_completed and metadata
- Facilitates debugging by showing exactly what each agent received

### Drawbacks
- Context object can become large with many sections
- Requires discipline to respect section boundaries
- Initial effort to define and maintain all sub-interfaces
- Potential for deeply nested property access

## Implementation Status
- ✅ CaseContext interface defined with all observed sections
- ✅ All sub-interfaces (OCRFieldResult, UserInfo, etc.) defined
- ✅ Properties made optional to support pipeline flow
- ✅ Used consistently by all agent implementations
- ✅ Metadata tracks execution steps for audit purposes

## Related
- ADR-001: Agent Architecture Patterns
- ADR-002: Pipeline Orchestrator Design
- ADR-004: Agent Delegation Conventions