# Fase 1 — Contratos e Kernel Compartilhado

**Status: CONCLUÍDA**

A fronteira compartilhada está em `src/shared/api/` e é independente do Express/Vercel.

## Componentes

- `contracts.ts`: envelopes, códigos de erro e versão do contrato.
- `http.ts`: respostas JSON e `requestId`.
- `adapters.ts`: helpers para adapters Hono.
- `boundary.ts`: middleware de compatibilidade para `/api/*`.
- `schemas.ts`: contratos TypeScript das famílias críticas.
- `contracts.test.ts`: testes do contrato.

## Adoção Cloudflare

`cloudflare/worker.ts` aplica a boundary em toda a API. O middleware de autenticação usa os códigos compartilhados para 401/403. Respostas de sucesso existentes permanecem compatíveis para evitar alteração simultânea dos consumidores.

## Regras

1. Não copiar domínio do `api/index.mjs`.
2. Não criar mappers paralelos.
3. Novos adapters usam `adapterOk`/`adapterError`.
4. Cada família muda seu payload público somente com teste do consumidor.
5. `api/index.mjs` permanece congelado.

## Próxima fase

Fase 2: OCR/ingestão. O objetivo é retirar OCR da dependência operacional da Vercel sem alterar ainda o restante do pipeline.
