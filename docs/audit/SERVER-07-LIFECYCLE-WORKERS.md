# SERVER-07 — Lifecycle explícito dos workers

**Status:** VERIFICADO — workers confirmados extraídos do bootstrap legado
**Data:** 2026-09-07

## Objetivo

Remover a dependência operacional do `server.ts` para inicialização de processos de longa duração, sem iniciar esses processos no runtime serverless de produção.

## Implementação

`src/server/lifecycle/dev-lifecycle.ts` passa a ser o ponto explícito de inicialização local para os componentes confirmados:

- `contranCollector.start()`
- `marketingOrchestrator.start()`
- `startMetaTokenRenewal()`
- `scrapeWorker.start()`

O lifecycle possui guarda de idempotência e não executa quando `NODE_ENV=production`.

O `dev-entry.ts` já chama `startDevLifecycle()` antes de criar o `createApp()`.

## Decisões

1. `createApp()` continua sendo somente composição HTTP.
2. Workers de longa duração não são iniciados durante o bootstrap serverless.
3. O lifecycle local é o único ponto de entrada para os workers confirmados.
4. `marketingAutomationWorker` não foi auto-iniciado: seu contrato atual não autoriza esse comportamento.
5. Polling/side effects ainda não confirmados por módulo dedicado permanecem bloqueados para remoção até a próxima matriz de referências.

## Evidência

`marketingOrchestrator` possui `start()`/`stop()` próprios e ciclo de 5 minutos.

`meta-token-renewal.worker.ts` possui `startMetaTokenRenewal()` e ciclo de 24 horas.

`scrape-worker.ts` possui `start()`/`stop()` e fallback de 4 segundos.

## Próxima etapa

**SERVER-08 — fechar a matriz de scripts, referências e side effects restantes; somente depois executar a remoção física de `server.ts`.**
