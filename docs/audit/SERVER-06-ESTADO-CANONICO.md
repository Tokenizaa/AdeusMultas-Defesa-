# SERVER-06 — Estado canônico e eliminação do estado legado

**Status:** VERIFICADO — estado legado fora do caminho operacional
**Data:** 2026-09-07

## Objetivo

Garantir que o estado de casos e auditoria utilizado pela API canônica tenha uma única fonte de verdade e que os stores locais do antigo `server.ts` não sejam carregados pelo caminho operacional.

## Evidências

### 1. Entrypoint operacional

Os scripts atuais não apontam para `server.ts`:

- `dev` → `src/server/dev-entry.ts`
- `build` → `vite build` + `scripts/build-api.mjs`
- `start` → `api/index.mjs`

O entrypoint local cria a aplicação por `createApp()`.

### 2. Estado canônico de casos

`src/server/app.ts` exporta `databaseRows` a partir de `caseRepository`.

As rotas canônicas de casos importam esse estado diretamente de `app.ts` e executam leitura/escrita através dele. Não existe necessidade operacional de `casesStore` do legado.

### 3. Auditoria

As rotas canônicas utilizam `auditLogs` exportado por `app.ts`. O `audit.ts` é montado no `createApp()` e aplica autenticação/autorização administrativa conforme seu contrato.

### 4. Estado legado

O antigo `server.ts` ainda contém `casesStore`, `auditLogsStore` e o seed `case_demo_745`, mas esses objetos não são mais carregados pelo `dev`, `build` ou `start` atuais.

Isso é deliberado nesta fase: o arquivo legado permanece disponível para comparação até a etapa de remoção definitiva.

## Decisão

Não copiar nem sincronizar `casesStore` com `caseRepository`. Isso criaria novamente duas fontes de verdade.

Não migrar `auditLogsStore` para o estado canônico. O caminho único é `auditLogs`/infraestrutura de auditoria canônica.

Não promover `case_demo_745` para produção. Dados demonstrativos devem existir somente em fixtures/testes ou seed explicitamente controlado.

## Próxima etapa

**SERVER-07 — remoção física do `server.ts`**, condicionada à verificação final de referências, rotas e workers que ainda sejam exclusivos do arquivo legado.
