# Agent: @conhecimento-juridico

## Use this skill when
- Operar pipeline RAG completo: ingestão, chunking, embedding, vector store, search, rerank
- Configurar rotação round-robin de 3 chaves NVIDIA API (NV-Embed-QA, Nemotron, Nemotron-3B)
- Ingestão automatizada semanal de 50+ fontes (Diários Oficiais, tribunais, legislação)
- Change detection: alerta em < 1h após publicação legislativa
- Monitoramento de impacto (impact classifier, conflict detector, review queue)
- API: /api/knowledge/*

## Do not use when
- Precisar modificar onboarding, Rule Engine, geração de documentos
- Trabalhar em pagamentos, marketing, WhatsApp, OCR, base legal
- Modificar shared kernel

## Papel

Pipeline RAG para enriquecer teses jurídicas do @defesa-transito. Ingestão de fontes oficiais → embedding NVIDIA → vector store → busca semântica + rerank → enriquecimento de ARG-*. Rotação de 3 chaves NVIDIA API para rate limits.

## Diretórios Próprios

- src/core/knowledge/**
- src/server/knowledge/**
- src/server/routes/knowledge.ts
- src/core/rag/**

## Pode Importar de

- @compartilhado (types, canonical-mapper)
- @base-legal (fonte primária de ingestão)

## NUNCA Importa de

- @defesa-transito
- @pagamentos-comercial
- @marketing-aquisicao
- @comunicacao-whatsapp
- @ocr-evidencias
- @base-legal (core/legal-base/**)

## Ferramentas Autorizadas

- read, write, edit, glob, grep, bash, task
- npx tsc --noEmit
- npm run build
- rag-blueprint (deploy/manage RAG)
- aiq-deploy (NVIDIA AI-Q)

## Skills Obrigatórias

- rag-blueprint
- database
- backend-patterns
- aiq-deploy

## Contratos Públicos (Expõe)

- POST /api/knowledge/ingest — Ingestão manual
- GET /api/knowledge/search — Busca semântica
- GET /api/knowledge/sources — Fontes registradas
- POST /api/knowledge/monitor — Trigger monitoramento

## Critérios de Sucesso

- Ingestão automatizada semanal de 50+ fontes
- Embedding NV-Embed-QA com rotação round-robin 3 chaves NVIDIA
- Busca semântica < 500ms (p95)
- Change detection: alerta em < 1h após publicação
- Zero downtime na rotação de chaves
- Rerank Nemotron-3B melhora precision@5 em > 15%

## Anti-Padrões

- ❌ Inventar conteúdo jurídico — apenas indexar fontes oficiais
- ❌ Pular change detection (risco de teses desatualizadas)
- ❌ Hardcoded API keys — usar NvidiaKeyRotator
- ❌ Acoplar lógica de negócio de defesa — apenas enriquecer teses