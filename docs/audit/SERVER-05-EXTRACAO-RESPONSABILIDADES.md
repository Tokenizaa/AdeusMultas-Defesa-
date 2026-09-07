# SERVER-05 — Extração das responsabilidades exclusivas do `server.ts`

**Status:** IMPLEMENTADO PARCIALMENTE / MIGRAÇÃO SEGURA EM ANDAMENTO  
**Data:** 2026-09-07

## Objetivo

Retirar do caminho operacional as responsabilidades que pertenciam ao `server.ts` sem apagar código legado antes de comprovar equivalência.

## Executado

### 1. Lifecycle de desenvolvimento

A inicialização implícita do `contranCollector` foi extraída para:

- `src/server/lifecycle/dev-lifecycle.ts`
- função `startDevLifecycle()`

O entrypoint local `src/server/dev-entry.ts` agora chama explicitamente esse lifecycle antes de criar o `createApp()`.

### 2. `server.ts` deixou de ser entrypoint operacional

Os scripts foram migrados no SERVER-04:

- `dev` → `src/server/dev-entry.ts`
- `build` → Vite + `scripts/build-api.mjs`
- `start` → `api/index.mjs`

Consequentemente, as seguintes estruturas exclusivas do antigo `server.ts` não são mais carregadas pelo caminho normal:

- `casesStore`
- `auditLogsStore`
- seed `case_demo_745`
- audit bootstrap `aud_init_001`
- rotas inline legadas
- Gemini direto do entrypoint
- lógica inline de geração de defesa
- lógica inline de análise IA
- lógica inline de chat/consulta de trânsito

Isso não significa que essas implementações estejam autorizadas para exclusão ainda; elas permanecem preservadas para comparação e rastreabilidade.

## Ainda pendente

### P0 — Rotas existentes apenas no legado

Antes da remoção definitiva, devem ser comparados os contratos de:

- `POST /api/cases/claim`
- `POST /api/cases/:id/generate-defense`
- `POST /api/ai/chat-consultant`
- `POST /api/ai/consult-traffic`

### P1 — Workers e jobs

Os side effects de:

- marketing orchestrator
- marketing metrics collector
- renovação de token Meta
- polling Documenso
- scraper worker

devem possuir lifecycle explícito e não depender do carregamento de `server.ts`.

### P1 — Rotas modulares ainda não montadas

O inventário encontrou módulos já existentes, mas não comprovadamente montados no `createApp()`, incluindo `scrape.ts` e `marketing-automation.ts`. Eles precisam ser reconciliados antes de qualquer exclusão de rota equivalente do legado.

## Regra de segurança

Não apagar `server.ts` nesta etapa. A exclusão só será autorizada depois de:

1. todos os endpoints legados terem equivalente canônico ou decisão explícita de remoção;
2. todos os workers terem lifecycle próprio;
3. não existir estado de negócio exclusivo no entrypoint legado;
4. build, testes e execução local validarem o novo caminho;
5. Vercel continuar usando o mesmo `createApp()` canônico.

## Próxima etapa

**SERVER-06 — Eliminar definitivamente o estado em memória legado e reconciliar as rotas que ainda dependem dele.**
