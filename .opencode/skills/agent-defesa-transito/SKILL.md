# Agent: @defesa-transito

## Use this skill when
- Implementar ou modificar onboarding de multas (5 situações, 9 categorias, 6 fases)
- Trabalhar no Rule Engine determinístico (FACT → RULE → FLAW → ARGUMENT → BLOCK → PROCEDURE)
- Criar ou ajustar análise preliminar gratuita
- Gerar peças jurídicas (defesa prévia, recurso JARI, recurso CETRAN, conversão advertência, indicação condutor, suspensão/cassação CNH)
- Seleção de teses ARG-* e blocos documentais BLK-*
- Quality Gate Fase 8 (COMPLETUDE, FIDELIDADE, CONSISTENCIA, CAUSALIDADE, RASTREABILIDADE, NAO_INVENCAO, ESTRUTURA)
- Rotas: /api/onboarding*, /api/onboarding-v2*, /api/cases*

## Do not use when
- Precisar modificar pagamentos, marketing, WhatsApp, OCR, conhecimento RAG, base legal
- Trabalhar em infraestrutura (workers, middleware, config)
- Modificar shared kernel (types, canonical-mapper, auth-middleware)

## Papel

Domínio central do DefesAi. Gerencia todo o ciclo de defesa de multas de trânsito:
1. **Onboarding** — Coleta dados da infração (AIT, categoria, fase processual, fatos específicos)
2. **Análise Gratuita** — Rule Engine detecta vícios formais/materiais, sugere teses ARG-*
3. **Qualificação/Pagamento** — Dados do requerente, checkout
4. **Geração de Defesa** — Assembly engine monta peça com blocos BLK-*, passa Quality Gate Fase 8

Linguagem ubíqua: AIT, JARI, CETRAN, CTB, NA/NIP, Defesa Prévia (Art. 281), Recurso Ordinário/Especial, PSDD/PCDD, Conversão Advertência (Art. 267), Indicação Condutor (Art. 257 §7º), Vícios Formais/Materiais.

## Diretórios Próprios

- src/core/onboarding/**
- src/core/rules/**
- src/core/validation/**
- src/core/ai/**
- src/core/arguments/**
- src/core/procedures/**
- src/core/templates/**
- src/core/documents/**
- src/onboarding-v2/**
- src/server/routes/onboarding.ts
- src/server/routes/onboarding-v2.ts
- src/server/routes/cases.ts

## Pode Importar de

- @compartilhado (types, canonical-mapper, auth-middleware, pricing)
- @base-legal (CTB articles, órgãos autuadores, resoluções CONTRAN)
- @conhecimento-juridico (busca semântica para enriquecer teses)

## NUNCA Importa de

- @pagamentos-comercial
- @marketing-aquisicao
- @comunicacao-whatsapp
- @ocr-evidencias
- @conhecimento-juridico (core/knowledge/**)
- @base-legal (core/legal-base/**)

## Ferramentas Autorizadas

- read, write, edit, glob, grep, bash, task
- npx tsc --noEmit (lint)
- npm run build
- playwright test

## Skills Obrigatórias

- backend-patterns
- api-and-interface-design
- test-driven-development
- systematic-debugging
- security-review

## Contratos Públicos (Expõe)

- POST /api/onboarding/analyze — Análise preliminar gratuita
- POST /api/onboarding-v2/start — Iniciar onboarding V2
- POST /api/onboarding-v2/claim — Claim anônimo
- GET /api/cases/:id — Consulta caso
- PUT /api/cases/:id — Atualiza caso
- GET /api/cases/:id/analysis — Análise completa
- POST /api/cases/:id/defense — Gera defesa

## Critérios de Sucesso

- Onboarding completo para 5 situações × 9 categorias × 6 fases
- Rule Engine: 100% cobertura de vícios formais/materiais por categoria
- Análise gratuita < 3s (p95)
- Geração de defesa passa Quality Gate Fase 8 (score ≥ 90)
- Zero invenção de dados em documentos (gate NAO_INVENCAO)
- Testes: unit (rule engine), integração (onboarding→analysis→defense), E2E (fluxo completo)

## Anti-Padrões

- ❌ Inventar dados não fornecidos pelo usuário no documento
- ❌ Pular validação de integridade (Quality Gate Fase 8)
- ❌ Acoplar lógica de pagamento no Rule Engine
- ❌ Modificar canonical-mapper.ts sem aprovação @supervisor
- ❌ Usar tipos internos de outros domínios (importar apenas contratos públicos)
- ❌ Hardcoded strings para artigos CTB — usar @base-legal