# Fase 3 — Knowledge / RAG

## Objetivo

Retirar a dependência de Vercel para busca semântica do conhecimento e estabelecer Cloudflare Workers AI + Vectorize como runtime canônico de RAG.

## Implementado

- `POST /api/knowledge/search`: embedding + busca semântica no Vectorize.
- `POST /api/knowledge/index`: indexação administrativa de documentos/chunks.
- `GET /api/knowledge/health`: smoke check do embedding provider.
- Workers AI binding `AI`.
- Vectorize binding `VECTORIZE`.
- índice `adeusmulta-knowledge` com 768 dimensões/cosine.
- provisionamento idempotente do índice no workflow Cloudflare.
- metadata por chunk: documento, título, fonte, jurisdição e texto.
- limite de chunk de 7.000 caracteres.
- `topK` limitado entre 1 e 20.
- envelope de resposta padronizado pelo kernel da Fase 1.
- testes de contrato para validação e busca.

## Modelo

`@cf/baai/bge-base-en-v1.5` → 768 dimensões → Cloudflare Vectorize.

## Segurança

A busca é somente leitura. A indexação exige autenticação e papel administrativo.

## Compatibilidade

Nenhuma rota Vercel existente foi removida nesta fase. A migração continua incremental conforme a regra de congelamento de `api/index.mjs`.

## Gate

A infraestrutura e o contrato Cloudflare estão implementados. O corpus jurídico existente não foi fabricado nem duplicado: documentos reais devem ser indexados pela origem canônica antes de considerar a cobertura jurídica equivalente ao legado.

Portanto, o **runtime RAG está concluído**, mas a equivalência funcional do corpus permanece uma validação de dados, não uma alteração de código.
