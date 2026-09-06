# FASE 2 — Correção P0 de Autorização

## Escopo

Correções cirúrgicas sem reescrever os fluxos funcionais existentes:

- `POST /api/cases`: allowlist server-side antes do handler existente para impedir mass assignment.
- `/api/ai/*`: autenticação obrigatória na montagem `/api/ai`, preservando `/api/auth` público.

## Preservado

- `canAccessCase` e proteção anti-IDOR.
- geração de defesa existente em `/api/cases/:id/generate-defense`.
- RAG, CanonicalMapper, pipeline controlado, persistência, eventos e auditoria.
- comportamento existente de autenticação em `/api/auth`.

## Evidência de implementação

- `src/server/middleware/auth-middleware.ts`
- `src/server/middleware/rate-limit.ts`
- `tests/unit/cases-post-mass-assignment-p0.test.ts`
- `tests/unit/legacy-ai-authorization-p0.test.ts`

A validação CI ainda é necessária antes de considerar a FASE 2 aprovada.
