# SERVER-08 — Matriz Final de Referências, Scripts e Side Effects

**Status:** VERIFIED / BLOCKED FOR PHYSICAL REMOVAL

## Objetivo

Fechar a auditoria anterior à remoção física de `server.ts`, identificando o que ainda é exclusivo do legado, o que já possui owner canônico e quais itens precisam de migração/paridade antes da exclusão.

## 1. Entradas de execução

| Entrada | Owner atual | Status |
|---|---|---|
| `npm run dev` | `src/server/dev-entry.ts` → `createApp()` + `startDevLifecycle()` | CANÔNICO |
| `npm run start` | `api/index.mjs` → `api-src/index.ts` → `createApp()` | CANÔNICO |
| Vercel `/api/*` | `vercel.json` → `api/index.mjs` | CANÔNICO |
| `server.ts` | nenhum script atual encontrado em `package.json` | LEGACY / SEM OWNER |

`package.json` não contém mais script que execute `server.ts`. O script `clean` remove apenas o artefato gerado `server.js`; isso não constitui dependência de runtime de `server.ts`.

## 2. Side effects já extraídos

| Responsabilidade | Owner | Status |
|---|---|---|
| `contranCollector.start()` | `src/server/lifecycle/dev-lifecycle.ts` | MIGRADO |
| `marketingOrchestrator.start()` | `src/server/lifecycle/dev-lifecycle.ts` | MIGRADO |
| `startMetaTokenRenewal()` | `src/server/lifecycle/dev-lifecycle.ts` | MIGRADO |
| `scrapeWorker.start()` | `src/server/lifecycle/dev-lifecycle.ts` | MIGRADO |
| warm-up de casos | `api-src/index.ts` / `app.ts` | CANÔNICO |
| warm-up comercial | `api-src/index.ts` / `app.ts` | CANÔNICO |

O lifecycle de desenvolvimento possui guarda contra produção e contra inicialização duplicada.

## 3. Responsabilidades ainda exclusivas/divergentes em `server.ts`

### P0 — Estado em memória

- `casesStore` é um segundo estado de casos e não deve sobreviver à arquitetura canônica.
- `auditLogsStore` é um segundo estado de auditoria.
- O bootstrap insere `sampleCaseDomain` e copia o caso para `databaseRows`.
- Esse seed contém dados demonstrativos e dados pessoais fictícios; não pode ser mantido como bootstrap de produção.

**Decisão:** NÃO REMOVER PARCIALMENTE sem antes retirar todas as referências internas ao estado legado. O owner canônico é `caseRepository`/`databaseRows` e a auditoria canônica.

### P0 — `generate-defense`

`POST /api/cases/:id/generate-defense` possui implementação histórica com regras de pagamento, limite de geração, seleção de argumentos, RAG, enriquecimento por provider, montagem de blocos/documento, contador de geração e eventos/auditoria.

Existe rota canônica de casos e pipeline de documentos, mas a paridade integral dessa operação precisa ser comprovada antes da exclusão do legado.

**Status:** BLOCKER DE PARIDADE.

### P0 — `claim`

O legado possui `POST /api/cases/claim` com contrato diferente do canônico `POST /api/cases/:id/claim` usando `claimToken`.

**Status:** BLOCKER DE CONSUMIDORES/PARIDADE. O contrato legado não deve ser simplesmente apagado sem confirmar que não há consumidor ativo.

### P1 — Chat AI

As rotas históricas `/api/ai/chat-consultant` e `/api/ai/consult-traffic` foram classificadas anteriormente como candidatas órfãs, sem equivalente canônico confirmado.

**Status:** ORPHAN CANDIDATE. Exige busca de consumidores antes da remoção.

### P1 — Polling Documenso

`startPollingJob` aparece como side effect/import histórico do `server.ts`. O polling é responsabilidade de lifecycle/job dedicado e não deve ser inicializado pelo `createApp()` nem pelo lambda da Vercel.

**Status:** MIGRAÇÃO/OWNER EXPLÍCITO NECESSÁRIA antes da remoção, caso o polling ainda seja operacionalmente requerido.

### P1 — AI/provider legado

`server.ts` ainda contém imports e lógica histórica de Gemini/provider manager e fallback determinístico. A existência desses imports não prova que o caminho canônico precise deles.

**Status:** revisar consumidores e retirar apenas após confirmar que `src/server/routes/ai.ts`, RAG e document pipeline são o único caminho operacional.

## 4. Rotas legadas com equivalência já conhecida

| Área | Legado | Owner canônico | Ação |
|---|---|---|---|
| Meta status | `/api/meta/status`, `/api/marketing/meta/status` | `metaRoutes` | preservar compatibilidade até confirmação |
| Health | `/api/health` | `healthRoutes` | usar canônico |
| Knowledge | `/api/knowledge` | `knowledgeRoutes` | usar canônico |
| Transit | `/api/transit-database/*` | transit routes | usar canônico |
| Governance | `/api/governance/*` | governance routes | usar canônico |
| Analytics | `/api/analytics/*` | analytics routes | usar canônico |
| Cases | `/api/cases*` | cases routes | usar canônico |
| AI | `/api/ai/*` | ai routes | comprovar paridade das operações críticas |
| Audit | `/api/audit-logs*` | audit routes | usar canônico |

A existência de uma rota equivalente não autoriza, por si só, apagar a implementação histórica: é necessário validar contrato, autorização, persistência e efeitos colaterais.

## 5. Vercel / serverless

`vercel.json` envia `/api/*` para `api/index.mjs`. `api-src/index.ts` importa `createApp()` diretamente e não importa `server.ts`.

Portanto, `server.ts` não é o entrypoint da produção Vercel conforme a configuração atual.

## 6. Decisão SERVER-08

**Não executar a remoção física de `server.ts` nesta fase.**

A fase conseguiu eliminar a dependência de execução via scripts e mover os side effects confirmados para o lifecycle canônico. Porém permanecem quatro classes que exigem fechamento antes da remoção:

1. paridade de `generate-defense`;
2. consumidores/contrato de `cases/claim`;
3. confirmação de consumidores das rotas de chat AI;
4. owner explícito do polling Documenso, se ainda requerido.

## 7. Critério de saída para SERVER-09

SERVER-09 poderá remover `server.ts` quando:

- nenhuma entrada de execução referenciar o arquivo;
- nenhum import ativo depender dele;
- `generate-defense` tiver owner canônico com contrato/effects equivalentes;
- `claim` legado estiver comprovadamente sem consumidor ou compatibilizado;
- chat AI tiver owner ou decisão formal de remoção;
- polling Documenso tiver owner explícito ou decisão formal de desligamento;
- `casesStore`, `auditLogsStore` e seed demo não forem necessários ao runtime;
- `npm run build`, `npm run lint` e testes relevantes passarem após a remoção.

## Evidências

- `package.json`: scripts atuais usam `src/server/dev-entry.ts` e `api/index.mjs`.
- `api-src/index.ts`: entrypoint serverless importa `createApp()`.
- `vercel.json`: rewrite `/api/*` para `api/index.mjs`.
- `src/server/lifecycle/dev-lifecycle.ts`: side effects de desenvolvimento explicitamente isolados.
- `server.ts`: permanece como código legado e contém estado/rotas/side effects que ainda precisam de paridade ou descarte formal.
