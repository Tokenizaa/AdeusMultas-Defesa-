# SERVER-09 — Fechamento e Handoff para Agentes de Teste

**Status:** READY FOR TEST AGENTS

## Objetivo

Encerrar a migração do runtime legado e estabelecer a arquitetura que os próximos agentes devem considerar autoritativa.

## Arquitetura autorizada

### Desenvolvimento local

`npm run dev` → `src/server/dev-entry.ts` → `createApp()` + `startDevLifecycle()`

### Produção/serverless

`Vercel` → `api/index.mjs` → `api-src/index.ts` → `createApp()`

### API

`src/server/app.ts` + `src/server/routes/*` + `src/server/middleware/*` + serviços/domínios canônicos.

## Regra para agentes

1. Não procurar, importar ou restaurar o entrypoint legado removido.
2. Não criar uma segunda composição Express.
3. Não introduzir stores paralelos para cases ou audit logs.
4. Para cases, usar `databaseRows`/`caseRepository` e os contratos de `src/server/routes/cases.ts`.
5. Para geração de defesa, tratar `RagPipeline`, `permittedTheses()` e a integridade determinística como autoridade server-side.
6. Para claim, usar `POST /api/cases/:id/claim` e `claimToken`.
7. Workers de longa duração só podem iniciar por lifecycle/job explicitamente autorizado; nunca no `createApp()` em produção/serverless.
8. Testes E2E devem validar o comportamento atual do produto, especialmente o onboarding ativo, e não reconstruir fluxos de uma implementação histórica.
9. Testes de arquitetura devem verificar owners canônicos e contratos, não a existência de arquivos legados.

## CI observado antes da remoção

No commit `a1c9c58bc4b4825382527628c04a8053f2eabb7a`:

- unit/audit: PASS;
- typecheck: PASS;
- build: PASS;
- E2E: 73 passed, 24 failed, 2 flaky, 1 skipped.

Os failures E2E observados são principalmente incompatibilidades dos testes existentes com o onboarding/UI atual, helpers ausentes e testes de ambiente; não são evidência de dependência do entrypoint legado.

## Remoção física

`server.ts` foi removido em:

`bc66070c78a5fe21ee36a86010e393b6e2ff7139`

## Próxima responsabilidade

O agente de testes deve agora assumir a correção/atualização da suíte E2E contra os contratos e UI atuais. A suíte não deve usar o entrypoint legado como fixture, fonte de estado ou referência arquitetural.
