# Fase 1 — Contratos e Kernel Compartilhado

**Status:** CONCLUÍDA
**Branch:** `phase-0`

## Objetivo

Criar uma fronteira comum para as APIs Cloudflare sem copiar o backend Express legado.

## Implementação

`src/shared/api/contracts.ts` define:

- envelope de sucesso `{ ok: true, data, requestId? }`;
- envelope de erro `{ ok: false, error }`;
- códigos de erro padronizados;
- contexto mínimo de request;
- versão do contrato.

`src/shared/api/http.ts` fornece helpers para respostas JSON.

`src/shared/api/adapters.ts` fornece helpers para adapters Hono.

`src/shared/api/boundary.ts` aplica uma fronteira compatível em `/api/*`: adiciona `requestId`, normaliza exceções HTTP e erros inesperados, e preserva payloads de sucesso existentes durante a migração incremental.

`src/shared/api/schemas.ts` registra os contratos TypeScript das famílias críticas.

## Adoção

- `cloudflare/worker.ts` aplica a boundary a toda a API Cloudflare.
- `cloudflare/middleware.ts` usa os códigos compartilhados para 401/403.
- As rotas existentes continuam com seus payloads de sucesso atuais para evitar regressões.
- Novas rotas devem usar `adapterOk`/`adapterError`.
- A conversão para envelope de sucesso completo será feita família por família após os consumidores serem migrados e testados.

## Regras preservadas

1. Rotas legadas não são alteradas por conformidade cosmética.
2. Cada família deve ser adaptada e testada contra seu consumidor antes de alterar o payload público.
3. O contrato compartilhado não contém regra de domínio.
4. Regras de domínio pertencem aos módulos canônicos; adapters HTTP apenas traduzem entrada/saída.
5. `api/index.mjs` permanece congelado nesta fase.
6. O `canonical-mapper` existente permanece a fonte única para `cases`; nenhum mapper paralelo foi criado.

## Testes

`src/shared/api/contracts.test.ts` cobre:

- versão do contrato;
- envelope de sucesso;
- envelope de erro;
- detalhes e `requestId`;
- omissão de campos opcionais.

## Gate

A Fase 1 está concluída. A Fase 2 inicia a migração de domínio de maior risco, começando por OCR/ingestão, sem remover ainda o proxy Vercel.
