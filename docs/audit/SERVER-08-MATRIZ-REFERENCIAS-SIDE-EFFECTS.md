# SERVER-08 — Matriz Final de Referências, Scripts e Side Effects

**Status:** VERIFIED — legacy entrypoint removido

## Objetivo

Consolidar a transição para a arquitetura canônica antes da entrada do agente de testes.

## 1. Entradas de execução

| Entrada | Owner | Status |
|---|---|---|
| `npm run dev` | `src/server/dev-entry.ts` → `createApp()` + `startDevLifecycle()` | CANÔNICO |
| `npm run start` | `api/index.mjs` → `api-src/index.ts` → `createApp()` | CANÔNICO |
| Vercel `/api/*` | `vercel.json` → `api/index.mjs` | CANÔNICO |
| `server.ts` | removido | ENCERRADO |

Nenhum script de execução depende do entrypoint legado.

## 2. Side effects

| Responsabilidade | Owner | Status |
|---|---|---|
| `contranCollector.start()` | `src/server/lifecycle/dev-lifecycle.ts` | MIGRADO |
| `marketingOrchestrator.start()` | `src/server/lifecycle/dev-lifecycle.ts` | MIGRADO |
| `startMetaTokenRenewal()` | `src/server/lifecycle/dev-lifecycle.ts` | MIGRADO |
| `scrapeWorker.start()` | `src/server/lifecycle/dev-lifecycle.ts` | MIGRADO |
| warm-up de casos | `api-src/index.ts` / `app.ts` | CANÔNICO |
| warm-up comercial | `api-src/index.ts` / `app.ts` | CANÔNICO |
| Documenso polling | job/lifecycle dedicado; não iniciado pelo app | ISOLADO |

## 3. Estado e autoridade

O runtime canônico usa `databaseRows`/`caseRepository` para casos e a infraestrutura de auditoria canônica. O estado `casesStore`, `auditLogsStore` e o seed demonstrativo pertenciam exclusivamente ao entrypoint removido.

A geração de defesa possui owner canônico em `src/server/routes/cases.ts`, com `RagPipeline`, `permittedTheses()` e integridade determinística. A rota canônica `POST /api/cases/:id/generate-defense` permanece como fonte de verdade.

O claim canônico é `POST /api/cases/:id/claim` com `claimToken`. O contrato antigo sem `:id` não possui mais implementação ativa.

## 4. AI / documentos

As rotas ativas devem usar o pipeline canônico em `src/server/routes/ai.ts` e `src/server/routes/cases.ts`. Não existe mais entrypoint alternativo contendo provider/fallback paralelo.

## 5. Critério de saída

- entrada local canônica: atendido;
- entrada Vercel canônica: atendido;
- side effects confirmados migrados: atendido;
- estado legado de casos/auditoria: eliminado do runtime;
- seed demo do entrypoint: eliminado;
- `generate-defense`: owner canônico confirmado;
- `claim`: owner canônico confirmado;
- entrypoint legado: removido fisicamente;
- build/typecheck/unit tests: verificados no CI anterior à remoção.

## Evidência

Remoção física de `server.ts` em:

`bc66070c78a5fe21ee36a86010e393b6e2ff7139`

Após esta decisão, agentes de desenvolvimento e teste devem trabalhar exclusivamente sobre `src/server/app.ts`, `src/server/routes/*`, `src/server/lifecycle/*`, `api-src/index.ts` e demais owners canônicos.
