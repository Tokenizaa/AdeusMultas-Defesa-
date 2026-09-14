# Fase 1 — Gate de conclusão

**Status: CONCLUÍDA**

- [x] Contrato compartilhado.
- [x] Helpers HTTP independentes de Express/Vercel.
- [x] Boundary Cloudflare em `/api/*`.
- [x] `requestId` padronizado.
- [x] Erros 401/403 e `HTTPException` normalizados.
- [x] Schemas TypeScript das famílias críticas.
- [x] Testes unitários dos contratos.
- [x] Nenhum mapper paralelo criado; `cases` mantém o `canonical-mapper` existente.
- [x] `api/index.mjs` congelado.

### Compatibilidade

Os payloads de sucesso existentes permanecem inalterados nesta fase. O envelope `{ ok: true, data }` será adotado por família somente depois que o consumidor correspondente for migrado e testado. Assim, a Fase 1 não introduz uma regressão de contrato no frontend.

### Evidência

`src/shared/api/contracts.ts`, `http.ts`, `adapters.ts`, `boundary.ts`, `schemas.ts`, `contracts.test.ts`, `cloudflare/middleware.ts` e `cloudflare/worker.ts`.

A Fase 2 pode iniciar a migração de OCR sem depender de novos contratos ou de Express/Vercel.
