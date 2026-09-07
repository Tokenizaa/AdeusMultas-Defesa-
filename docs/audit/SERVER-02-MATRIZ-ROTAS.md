# SERVER-02 — Matriz de Equivalência de Rotas do `server.ts`

> **Data:** 2026-09-07  
> **Escopo:** rotas inline identificadas em `server.ts` versus routers canônicos em `src/server/routes/*`.  
> **Objetivo:** determinar, antes de qualquer remoção, quais endpoints são duplicados, quais possuem implementação canônica e quais ainda exigem migração/decisão.

## 1. Veredito

**STATUS: VERIFIED — matriz inicial concluída; remoção do legado ainda NÃO autorizada.**

A comparação confirma que a maior parte das rotas inline do `server.ts` possui equivalente no caminho modular já utilizado pela Vercel. Em vários casos o router modular é claramente superior porque usa `databaseRows`/`caseRepository`, autenticação, autorização, eventos e/ou regras fail-closed que não existem no handler legado.

Regra de migração:

> **Não transportar o código inline para outro arquivo.** O destino é o router/serviço canônico já existente, preservando o contrato somente quando houver consumidor real.

## 2. Matriz principal

| Método | Endpoint | `server.ts` | Router canônico | Classificação | Decisão |
|---|---|---|---|---|---|
| GET | `/api/meta/status` | inline | `meta.ts` | DUPLICADA | usar `metaRoutes` |
| GET | `/api/marketing/meta/status` | inline | `meta.ts` | DUPLICADA | usar `metaRoutes` |
| GET | `/api/health` | inline | `health.ts` | DUPLICADA | usar `healthRoutes` |
| GET | `/api/knowledge` | inline | `knowledge.ts` | DUPLICADA | usar `knowledgeRoutes` |
| GET | `/api/onboarding/rules` | inline | `onboarding.ts` | DUPLICADA | usar `onboardingRoutes` |
| GET | `/api/transit-database/query` | inline | `transit.ts` | DUPLICADA | usar `transitRoutes` |
| GET | `/api/transit-database/inmetro-check` | inline | `transit.ts` | DUPLICADA | usar `transitRoutes` |
| GET | `/api/governance/law-enforcement-verify` | inline | `governance.ts` | DUPLICADA | usar `governanceRoutes` |
| POST | `/api/governance/manual-override` | inline | `governance.ts` | DUPLICADA | usar `governanceRoutes` |
| POST | `/api/sync/offline-batch` | inline | `sync.ts` | DUPLICADA | usar `syncRoutes` |
| GET | `/api/analytics/dashboard` | inline | `analytics.ts` | DUPLICADA / CRÍTICA | usar `analyticsRoutes` |
| GET | `/api/cases` | inline | `cases.ts` | DUPLICADA / P0 | usar `casesRoutes` |
| GET | `/api/cases/:id` | inline | `cases.ts` | DUPLICADA / P0 | usar `casesRoutes` |
| POST | `/api/cases` | inline | `cases.ts` | DUPLICADA / P0 | usar `casesRoutes` |
| POST | `/api/cases/claim` | inline | `cases.ts` usa `POST /cases/:id/claim` | CONTRATO DIVERGENTE | mapear consumidores antes de remover |
| POST | `/api/cases/:id/generate-defense` | inline | `cases.ts`/orquestração | LEGADO CRÍTICO | comparar contrato antes de remover |
| POST | `/api/ai/analyze-infraction` | inline | `ai.ts` | DUPLICADA / P0 | usar `aiRoutes` |
| POST | `/api/ai/generate-defense` | inline | `ai.ts` | DUPLICADA / P0 | usar `aiRoutes` |
| POST | `/api/ai/chat-consultant` | inline | nenhum equivalente confirmado | LEGADO / ÓRFÃ | localizar consumidores; depois remover ou extrair |
| POST | `/api/ai/consult-traffic` | inline | nenhum equivalente confirmado | LEGADO / ÓRFÃ | localizar consumidores; depois remover ou extrair |
| GET | `/api/audit-logs` | inline | `audit.ts` | DUPLICADA / SEGURANÇA | usar `auditRoutes` |
| GET | `/api/audit/logs` | inline | `audit.ts` | DUPLICADA / SEGURANÇA | usar `auditRoutes` |

## 3. Diferenças importantes encontradas

### 3.1 Cases — P0

O legado usa `casesStore`, um `Map` local em memória. O router canônico usa `databaseRows`, que é o `caseRepository` exportado por `app.ts`.

Além disso, `cases.ts` exige `authenticateToken` e verifica ownership em leitura/alteração. O handler legado não constitui autoridade equivalente.

O `GET /api/cases/:id` canônico ainda valida integridade do documento e teses autorizadas antes de devolver `defenseDraft`. Isso torna a substituição do legado especialmente importante: manter ambos significa manter dois modelos de segurança e persistência.

Fonte: `src/server/routes/cases.ts`.

### 3.2 Analytics — P1

O legado retorna métricas históricas hardcoded (`+1420`, `94.6`, `48500`, etc.) e lê `casesStore`. O router canônico calcula métricas a partir de `databaseRows` e exige `authenticateToken + requireAdmin`.

**Decisão:** o handler inline não deve ser preservado como fallback.

Fonte: `src/server/routes/analytics.ts`.

### 3.3 Sync — P1

O router canônico exige autenticação e retorna `501` em produção, enquanto o legado processa e responde sucesso independentemente do ambiente.

**Decisão:** remover o legado; preservar o comportamento explícito do router canônico.

Fonte: `src/server/routes/sync.ts`.

### 3.4 Transit — P1

O router canônico já separa produção (`501`) de mocks de desenvolvimento. O inline é uma implementação paralela da mesma simulação.

**Decisão:** manter apenas `transit.ts`.

Fonte: `src/server/routes/transit.ts`.

### 3.5 Governance — P1

`governance.ts` já opera sobre `databaseRows`, registra em `auditLogs` e protege `manual-override` com `requireAdmin`. O legado grava em `casesStore`/`auditLogsStore`.

**Decisão:** `governance.ts` é a autoridade canônica.

### 3.6 Audit — P0 de confidencialidade

`audit.ts` aplica `authenticateToken` + `requireAdmin` globalmente. Os handlers inline devolvem o array legado sem essa proteção equivalente.

**Decisão:** remover imediatamente o caminho inline somente depois de confirmar que o router canônico está montado no entrypoint alvo — ele está em `app.ts`.

Fonte: `src/server/routes/audit.ts`.

### 3.7 Onboarding / Health / Meta

Os routers modulares já existem e estão montados em `app.ts`. O inline é duplicação de composição HTTP.

`meta.ts` também já contém os aliases de status, incluindo `/marketing/meta/status`, confirmando que os dois handlers inline são redundantes.

## 4. Rotas sem equivalente confirmado

### `/api/ai/chat-consultant`
### `/api/ai/consult-traffic`

Nenhum consumidor/referência equivalente foi localizado pela busca de código até esta etapa.

Essas rotas não devem ser simplesmente apagadas ainda. O próximo passo é verificar frontend, documentação, testes e integrações externas. Se não houver consumidor, classificá-las como **órfãs** e removê-las junto com o código exclusivo que elas sustentam.

## 5. Caso especial: `/api/cases/claim`

Existe diferença estrutural:

```text
LEGADO
POST /api/cases/claim
body: { claimToken, userId, userEmail, userNome }

CANÔNICO
POST /api/cases/:id/claim
body: { claimToken }
```

Isso impede remoção cega. Antes da migração, deve ser feito inventário de consumidores para decidir se:

1. o frontend já usa o contrato canônico;
2. existe compatibilidade necessária;
3. um alias temporário deve ser implementado no router canônico.

O ponto importante é que o alias, se necessário, deve existir no **router canônico**, nunca voltar a lógica para `server.ts`.

## 6. Caso especial: `/api/cases/:id/generate-defense`

A rota inline contém lógica substancial de negócio: pagamento, limite de 3 gerações, seleção de argumentos, `RagPipeline`, enriquecimento via `aiProviderManager`, rol de documentos, incremento de geração, timeline e auditoria.

Ela **não pode ser removida por simples exclusão textual**.

A regra é comparar esse contrato com o pipeline existente em `cases.ts`/`ai-orchestrator`/serviços de documentos e criar teste de paridade antes de qualquer remoção.

## 7. Resultado arquitetural

O inventário permite afirmar:

```text
server.ts
  ├── ~maioria das rotas inline ──> já possui router canônico
  ├── cases/AI ───────────────────> possuem implementação canônica mais segura
  ├── audit/governance/analytics ─> já possuem autoridade modular
  └── chat-consultant/consult-traffic -> precisam de análise de consumidores
```

Portanto, o problema não é falta de módulos. O problema é que o legado continua registrando uma segunda implementação desses módulos.

## 8. Próxima etapa autorizada

**SERVER-03 — Matriz de estado e dependências.**

Antes de remover handlers, devemos mapear:

- `casesStore` e todos os seus leitores/escritores;
- `auditLogsStore` e todos os seus leitores/escritores;
- imports exclusivos de `server.ts`;
- funções de IA usadas somente pelo legado;
- seed `case_demo_745`;
- workers iniciados somente pelo legado;
- consumidores das duas rotas de chat;
- consumidores do contrato legado de claim;
- scripts `dev`, `start` e `build`.

**Nenhuma remoção de `server.ts` foi feita nesta etapa.**
