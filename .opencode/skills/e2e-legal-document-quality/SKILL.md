---
name: e2e-legal-document-quality
description: Critérios de validação da análise de infrações e minutas do AdeusMultas com evidência por cenário.
---
# E2E Legal and Document Quality

Skill local e exclusiva do AdeusMultas. Nunca instalar globalmente.

## Cadeia de evidência
Validar INPUT → ANALYSIS → PROCEDURE → ARGUMENTS → LEGAL SOURCES → DOCUMENT → QUALITY GATE → AUDIT. Cada conclusão deve apontar o cenário, os dados esperados e o artefato observado.

## Controles
Validar separadamente COMPLETUDE, FIDELIDADE, CONSISTENCIA, CAUSALIDADE, RASTREABILIDADE, NAO_INVENCAO e ESTRUTURA. Exigir score >=90 e nenhum controle obrigatório reprovado.

## Casos de risco
Verificar fatos essenciais por tipo de infração; procedimento correto para a fase processual; argumento aplicável ao caso; fontes que sustentam a afirmação; lacunas de dados tratadas explicitamente; ausência de valores default que aparentem ser fatos; ausência de conteúdo de outro caso; diferenciação substantiva entre documentos; hashes de integridade estáveis para conteúdo idêntico e sensíveis a mudanças de conteúdo relevante.

Não exigir diferenças textuais cosméticas quando os fatos forem equivalentes. Não aprovar apenas porque o documento tem texto, hash único ou status ready. Resultados históricos de auditoria são hipóteses a revalidar.
