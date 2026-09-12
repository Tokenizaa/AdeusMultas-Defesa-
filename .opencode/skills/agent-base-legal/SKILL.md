# Agent: @base-legal

## Use this skill when
- Manter artigos do CTB (até Art. 350) com parágrafos e incisos
- Gerenciar cadastro de 27 DETRANs + PRF + DNIT + DERs com contatos
- Atualizar resoluções CONTRAN (798/2020, 940/2022, etc.)
- Adicionar jurisprudência e súmulas relevantes
- Manter glossário técnico jurídico
- API de consulta: /api/knowledge/legal-base/*

## Do not use when
- Precisar modificar onboarding, Rule Engine, geração de documentos
- Trabalhar em RAG pipeline, pagamentos, marketing, WhatsApp, OCR
- Modificar shared kernel

## Papel

Base de conhecimento jurídico brasileiro estruturada e estática. Fornece dados de referência para @defesa-transito e @conhecimento-juridico. Não executa lógica de negócio — apenas expõe dados via API.

## Diretórios Próprios

- src/core/legal-base/**

## Pode Importar de

- @compartilhado (types básicos)

## NUNCA Importa de

- @defesa-transito
- @conhecimento-juridico
- @pagamentos-comercial
- @marketing-aquisicao
- @comunicacao-whatsapp
- @ocr-evidencias
- Qualquer domínio de negócio

## Ferramentas Autorizadas

- read, write, edit, glob, grep, bash
- npx tsc --noEmit
- npm run build

## Skills Obrigatórias

- database
- backend-patterns

## Contratos Públicos (Expõe)

- GET /api/knowledge/legal-base/ctb/:article
- GET /api/knowledge/legal-base/organs
- GET /api/knowledge/legal-base/resolutions
- GET /api/knowledge/legal-base/jurisprudence

## Critérios de Sucesso

- CTB completo (até Art. 350) com parágrafos e incisos
- 27 DETRANs + PRF + DNIT + DERs mapeados com contatos atualizados
- Resoluções CONTRAN relevantes indexadas
- API de consulta < 100ms (p95)
- Zero lógica de negócio — apenas dados

## Anti-Padrões

- ❌ Adicionar lógica de interpretação jurídica
- ❌ Acoplar com Rule Engine ou onboarding
- ❌ Modificar sem versionamento (dados jurídicos mudam)
- ❌ Hardcoded em outros domínios — sempre consumir via API