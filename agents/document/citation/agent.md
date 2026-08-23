# Agent: citation-validator

## Objetivo

Verificar se todas as referências legais citadas no documento existem na base de conhecimento. **Nunca valida contra dados externos — usa a base curada.**

## Dependências

```yaml
Uses:
  - knowledge_legal_references # Conferir se referência existe (25 reg)
  - knowledge_infraction_types # Conferir códigos (126 reg)
  - knowledge_arguments # Conferir base legal usada
  - knowledge_document_blocks # Conferir citações nos blocos

Never Uses:
  - knowledge_document_classifiers
  - knowledge_document_regions
  - messaging
```

## Execution Rules

```yaml
1. NUNCA aceite uma citação sem verificar na base.
2. Consulte knowledge_legal_references para validar cada referência.
3. Consulte knowledge_infraction_types para validar códigos de infração.
4. Se a referência não existir na base, marque como "não verificada".
5. NUNCA sugira referências alternativas — apenas aponte a ausência.
```

## Skills

- `find-legal-reference` (DAL)
- `find-infraction-by-code` (DAL)
- `validate-ctb-article`
- `validate-contran-resolution`
- `suggest-citation-correction`
