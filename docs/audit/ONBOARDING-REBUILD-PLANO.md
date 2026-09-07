# ONBOARDING — REBUILD CANÔNICO

**Data:** 2026-09-07  
**Status:** ATIVO  
**Estratégia:** rebuild greenfield  
**Legado:** congelado e usado somente como referência

## Decisão

O onboarding atual não será progressivamente refatorado. Será mantido congelado enquanto um novo onboarding é escrito do zero.

**Regra absoluta: nenhum arquivo de código do onboarding legado será reaproveitado integralmente.**

Páginas, componentes, hooks, serviços e demais arquivos do novo onboarding serão reescritos linha por linha a partir dos requisitos e contratos canônicos.

Preservar uma necessidade ou uma experiência não significa copiar sua implementação.

## As 8 fases

### 1. CONGELAR

Registrar e preservar o estado atual. O legado não recebe novas mudanças estruturais durante o rebuild.

### 2. DEFINIR O QUE FICA

Auditoria objetiva do legado para separar requisitos reais, regras indispensáveis e UX útil de workaround, duplicação e dívida histórica.

Nada é preservado apenas porque existe.

### 3. DESENHAR O NOVO CONTRATO

Definir o modelo canônico de Case, estado do onboarding, etapas, persistência, autenticação/claim, análise, pagamento e geração.

### 4. CRIAR A NOVA ARQUITETURA

Definir responsabilidades, estrutura de código, contratos frontend/backend e fonte única de verdade.

### 5. REESCREVER O ONBOARDING

Construir o novo onboarding do zero. Nenhuma página, componente, hook ou serviço antigo será copiado para a implementação nova.

### 6. CONECTAR O FLUXO REAL

Integrar persistência, evidências/OCR, análise, autenticação/claim, pagamento e geração de documento.

### 7. VALIDAR O FLUXO COMPLETO

Executar testes de ponta a ponta, incluindo estados intermediários, reload, erros, recuperação e fluxo comercial completo.

### 8. ATIVAR E REMOVER O LEGADO

Promover o novo onboarding, monitorar e, após validação, remover definitivamente o legado.

## Princípios obrigatórios

- Uma única fonte de verdade para o estado do caso.
- UI não contém regra jurídica nem persistência arbitrária.
- Serviços executam operações; domínio decide regras.
- APIs têm contratos explícitos.
- Falhas não podem ser mascaradas para permitir avanço falso.
- Operações reais não terão progresso simulado por timers.
- Scores jurídicos não serão apresentados como probabilidades estatísticas sem validação.
- O novo onboarding não poderá depender do onboarding legado.
- Código legado pode ser consultado, mas não transportado.

## Regra de ouro

> **O onboarding antigo é fonte de evidências, não fonte de código.**

## Estado congelado

Branch de referência:

`legacy/onboarding-frozen-2026-09-07`

A branch existe para preservar o estado do legado no início do rebuild e não deve receber desenvolvimento normal.

## Critério de conclusão

O novo onboarding deve executar o fluxo comercial real de ponta a ponta, com contratos canônicos, persistência confiável, tratamento de erros e testes suficientes para substituir o legado.
