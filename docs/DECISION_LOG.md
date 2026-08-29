# Decision Log — DefesAi

> Registro de decisões arquiteturais (ADRs). Entradas em ordem cronológica.
> Documentação viva mantida por @documentacao/@agent-context. Não edite manualmente fora do fluxo de ADR.

| Data | ADR | Decisão (resumo) |
|------|-----|------------------|
| 2026-08-29 | [ADR-012](docs/adr/ADR-012-Image-Quality-Gate-Marketing-Pipeline.md) | Gate de qualidade de imagem no pipeline de marketing: validação 100% local (sharp) em 2 pontos — pós-geração sinaliza, pré-enqueue rejeita hard por qualidade (resolução ≥900px, nitidez Laplacian ≥100) e fail-open por falha de infraestrutura (fetch/decode). Bloqueia peças ruins antes de publicar sem derrubar pipeline existente. |

## Anteriores

| ADR | Título |
|-----|--------|
| [ADR-011](docs/adr/ADR-011-Remove-Legacy-Prospecting-Pages.md) | Remoção dos componentes legacy/mortos do módulo de Prospecção B2B (frontend) |
| [ADR-010](docs/adr/ADR-010-Automatic-Defense-Generation-and-Limit.md) | Geração automática de defesa pós-pagamento + limite de 3 gerações |
| [ADR-009](docs/adr/ADR-009-Payment-Orders-Table.md) | Criação da tabela `payment_orders` |
| [ADR-008](docs/adr/ADR-008-Agent-Topology-Unification.md) | Agent Topology Unification |
| [ADR-007](docs/adr/ADR-007-Integration-Patterns-Document-Communication-AIAnalysis.md) | Integration Patterns for Document, Communication, and AI Analysis Agents |
| [ADR-006](docs/adr/ADR-006-Pipeline-Dependency-Injection.md) | Pipeline Dependency Injection Refactoring |
| [ADR-005](docs/adr/ADR-005-Missing-Agent-Implementations.md) | Missing Agent Implementations |
| [ADR-004](docs/adr/ADR-004-Agent-Delegation-Conventions.md) | Agent Delegation Conventions |
| [ADR-003](docs/adr/ADR-003-CaseContext-Contract.md) | CaseContext Contract |
| [ADR-002](docs/adr/ADR-002-Pipeline-Orchestrator-Design.md) | Pipeline Orchestrator Design |
| [ADR-001](docs/adr/ADR-001-Agent-Architecture-Patterns.md) | Agent Architecture Patterns |