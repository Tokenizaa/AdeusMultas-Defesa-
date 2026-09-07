# SERVER-01 — Auditoria Arquitetural do `server.ts`

> **Data:** 2026-09-07  
> **Escopo:** `server.ts`, `src/server/app.ts`, entrypoint Vercel e scripts de execução/build.  
> **Objetivo:** estabelecer o inventário e o destino arquitetural antes de qualquer remoção/refatoração.

## 1. Veredito

**STATUS: BLOCKED FOR CONSOLIDATION / AUDIT COMPLETE**

O `server.ts` é um **God Module / Frankenstein server**: concentra bootstrap HTTP, configuração, estado de casos, seed de demonstração, logs de auditoria, regras de negócio, IA, geração documental, workers e dezenas de endpoints, enquanto o projeto já possui `src/server/app.ts` como aplicação Express modular.

A conclusão crítica é que **não devemos criar `server2.ts` nem continuar adicionando correções ao `server.ts`**. O próximo trabalho deve consolidar a execução em um único `createApp()` e, somente depois de validar paridade, remover o legado.

## 2. Duas arquiteturas de servidor coexistem

### Caminho local atual

```text
npm run dev / npm run start
        ↓
     server.ts
        ↓
Express + rotas inline + rotas modulares + Vite/static
```

### Caminho Vercel atual

```text
Vercel rewrite /api/*
        ↓
api/index.mjs
        ↓
api-src/index.ts
        ↓
src/server/app.ts
        ↓
rotas modulares
```

Portanto, alterações feitas exclusivamente em `server.ts` **não são automaticamente alterações do backend HTTP utilizado pelo endpoint serverless da Vercel**.

## 3. Inventário do `server.ts`

### 3.1 Bootstrap / infraestrutura

| Superfície | Situação | Destino |
|---|---|---|
| `dotenv/config` | inline | módulo de configuração/bootstrap |
| `express()` | inline | `src/server/app.ts` |
| `express.json` / `urlencoded` | inline | middleware compartilhado de `app.ts` |
| captura `rawBody` para webhooks | inline | middleware HTTP compartilhado |
| `validateCriticalEnvVars()` | inline | configuração/startup |
| warmup de `caseRepository` | inline | bootstrap/app startup |
| warmup `commercialService` | inline | bootstrap/app startup |
| `scrapeWorker.start()` | inline | worker lifecycle dedicado |
| Vite middleware/static | inline | entrypoint web local |
| `app.listen()` | inline | `src/server/index.ts` ou entrypoint local mínimo |

### 3.2 Estado e dados indevidos no entrypoint

| Componente | Situação | Destino |
|---|---|---|
| `casesStore` | `Map` em memória | **remover**; `caseRepository` é a fonte canônica |
| `auditLogsStore` | array em memória | **remover/centralizar** no mecanismo de auditoria existente |
| `sampleCaseDomain` | seed de demonstração com dados pessoais fictícios | fixtures/demo isolados; nunca bootstrap de produção |
| `sampleRow` | escrito em dois stores | eliminar duplicidade |
| `SYSTEM_BOOTSTRAP` audit log | side effect no import/startup | auditoria de startup dedicada, se realmente necessária |

### 3.3 Rotas inline identificadas

As seguintes superfícies estão implementadas diretamente em `server.ts` e precisam ser classificadas contra os routers existentes:

| Método | Endpoint | Classificação | Destino provável |
|---|---|---|---|
| GET | `/api/meta/status` | compatibilidade | `routes/meta` |
| GET | `/api/marketing/meta/status` | compatibilidade | `routes/meta` |
| GET | `/api/health` | duplicada | `routes/health` |
| GET | `/api/knowledge` | duplicada | `routes/knowledge` |
| GET | `/api/onboarding/rules` | legado/duplicada | `routes/onboarding` |
| GET | `/api/transit-database/query` | legado/duplicada | `routes/transit` |
| GET | `/api/transit-database/inmetro-check` | legado/duplicada | `routes/transit` |
| GET | `/api/governance/law-enforcement-verify` | legado/duplicada | `routes/governance` |
| POST | `/api/governance/manual-override` | legado/duplicada | `routes/governance` |
| POST | `/api/sync/offline-batch` | legado/duplicada | `routes/sync` |
| GET | `/api/analytics/dashboard` | legado/duplicada | `routes/analytics` |
| GET | `/api/cases` | crítica/duplicada | `routes/cases` |
| GET | `/api/cases/:id` | crítica/duplicada | `routes/cases` |
| POST | `/api/cases` | crítica/duplicada | `routes/cases` |
| POST | `/api/cases/claim` | crítica/duplicada | `routes/cases` |
| POST | `/api/cases/:id/generate-defense` | crítica/duplicada | `routes/cases`/defense service |
| POST | `/api/ai/analyze-infraction` | crítica/duplicada | `routes/ai` |
| POST | `/api/ai/generate-defense` | crítica/duplicada | `routes/ai` / document pipeline |
| POST | `/api/ai/chat-consultant` | duplicada/compatibilidade | `routes/ai` |
| POST | `/api/ai/consult-traffic` | duplicada/compatibilidade | `routes/ai` |
| GET | `/api/audit-logs` | legado/duplicada | `routes/audit` |
| GET | `/api/audit/logs` | legado/duplicada | `routes/audit` |

**Observação:** esta tabela é o inventário das rotas inline verificadas no arquivo. Antes da remoção, cada endpoint deve ser confrontado com o router canônico e com os consumidores frontend/testes para confirmar método, path, status codes, payload e efeitos colaterais.

## 4. Rotas modulares já importadas pelo legado

`server.ts` já importa e monta vários routers existentes:

- `admin`
- `meta`
- `commercial`
- `monitoring`
- `settings`
- `logs`
- `marketing`
- `agents`
- `whatsapp`
- `ocr`
- `payments`
- `notifications`
- `knowledge`
- `marketing-automation`
- `scrape`
- `e2e-tests`
- `health`
- `documenso`

Isso confirma que `server.ts` não é apenas um servidor legado monolítico: ele é uma **camada paralela que mistura routers novos com implementações antigas dos mesmos domínios**.

## 5. Duplicidade de autoridade de dados

O problema mais grave não é apenas tamanho. Existem duas autoridades para cases:

```text
server.ts
  └── casesStore: Map<string, CaseDatabaseRow>

src/server/app.ts
  └── databaseRows / caseRepository
```

O `server.ts` inclusive importa `databaseRows` de `app.ts`, mas mantém `casesStore` separado e grava o mesmo caso nos dois stores durante o seed. Isso cria risco de divergência de estado, comportamento diferente entre dev e Vercel e bugs impossíveis de reproduzir entre ambientes.

## 6. Duplicidade de autorização

O legado contém middleware de autenticação/admin diretamente no bootstrap e regras específicas de proteção para Marketing/Meta. O `app.ts` também possui sua própria camada de segurança e montagem de routers.

A regra para a consolidação deve ser:

> **autorização pertence à fronteira server/router/service canônica, não ao entrypoint legado.**

Nenhuma rota deve depender de uma proteção que só existe em `server.ts` se ela também precisa funcionar no caminho Vercel.

## 7. IA e geração documental no entrypoint

O arquivo contém múltiplas gerações de implementação de IA:

1. `GoogleGenAI` direto;
2. `RagPipeline` direto;
3. `aiProviderManager` com cadeia NVIDIA NIM → 9Router → fallback determinístico;
4. prompts completos de análise jurídica;
5. prompts completos de geração de defesa;
6. montagem de `DefenseBlock`;
7. regras de pagamento e limite de geração;
8. garantia de rol de documentos.

Isso é regra de domínio/orquestração, não responsabilidade de um entrypoint HTTP. A consolidação deve preservar a implementação canônica existente e eliminar somente o caminho paralelo após comparação de comportamento.

## 8. Workers e efeitos colaterais

`server.ts` inicia ou aciona:

- `scrapeWorker`;
- `marketingOrchestrator`;
- `marketingMetricsCollector`;
- `startMetaTokenRenewal()`;
- `startPollingJob()` do Documenso;
- `contranCollector` durante carregamento do módulo.

Esse padrão é perigoso em serverless porque cold starts, múltiplas instâncias e retries podem produzir inicializações repetidas. Workers devem ter lifecycle próprio e execução compatível com o ambiente em que realmente são hospedados.

## 9. Seed de demonstração — P0

O arquivo cria automaticamente um caso `case_demo_745`, incluindo CPF/CNH, placa, endereço, dados de infração, pagamento e análise jurídica, e o insere no store durante startup.

Mesmo sendo um fixture, isso não pertence ao bootstrap produtivo. A regra futura deve ser:

```text
produção → zero seed automático
 testes  → fixtures isolados
 demo    → script explícito
```

## 10. Risco de divergência local × produção

O principal risco operacional é:

```text
Desenvolvedor corrige server.ts
          ↓
local passa a apresentar comportamento A
          ↓
Vercel continua executando app.ts
          ↓
produção apresenta comportamento B
```

Esse é exatamente o tipo de dívida arquitetural que explica a recorrência de correções no `server.ts` sem convergência estrutural.

## 11. Arquitetura-alvo

```text
                 ┌──────────────────────┐
                 │   Local entrypoint   │
                 └──────────┬───────────┘
                            │
                 ┌──────────▼───────────┐
                 │  Vercel entrypoint   │
                 └──────────┬───────────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │  createApp()      │
                  │ src/server/app.ts │
                  └─────────┬─────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
           routes        services       middleware
              │             │             │
              └─────────────┼─────────────┘
                            ▼
                       repositories
                            ▼
                         Supabase
```

O objetivo não é mover tudo para `app.ts`. O objetivo é que `app.ts` seja somente composição HTTP e que domínio, serviços, workers e infraestrutura permaneçam em seus módulos próprios.

## 12. Plano de migração aprovado

### SERVER-01 — Inventário
**STATUS: VERIFIED / DOCUMENTADO**

Este documento fecha o inventário arquitetural inicial sem alterar comportamento.

### SERVER-02 — Matriz de rotas

Para cada rota inline, comparar:

- existência no router canônico;
- método;
- path;
- autenticação/autorização;
- request schema;
- response schema;
- status codes;
- efeitos colaterais;
- persistência;
- consumidores frontend;
- cobertura de testes.

### SERVER-03 — Matriz de estado

Mapear todas as leituras/escritas de:

- `casesStore`;
- `databaseRows`;
- `caseRepository`;
- `auditLogsStore`;
- mecanismos canônicos de auditoria.

### SERVER-04 — Canonical entrypoint

Definir `src/server/app.ts` como única composição Express para API. Criar um entrypoint local mínimo que apenas carrega ambiente, cria o app e escuta a porta.

### SERVER-05 — Extração segura

Mover qualquer lógica ainda exclusiva do legado para módulos de domínio/serviço/router, com testes antes da remoção do handler antigo.

### SERVER-06 — Remoção de estado legado

Eliminar `casesStore`, seed automático e `auditLogsStore` do caminho HTTP.

### SERVER-07 — Remoção do `server.ts`

Somente após paridade comprovada entre execução local e Vercel.

### SERVER-08 — Scripts

Alterar `package.json` para que `dev`, `build` e `start` não dependam mais de `server.ts`.

### SERVER-09 — Verificação

Executar unit, lint, build e E2E aplicável. Testar especificamente os endpoints migrados e casos de autorização.

### SERVER-10 — Produção

Validar deployment Vercel e, quando disponível, a matriz E2E real de produção já registrada na Issue #5.

## 13. Regra de segurança para a próxima fase

**Não apagar rotas do `server.ts` ainda.**

A remoção prematura pode quebrar o desenvolvimento local ou esconder endpoints que ainda não possuem paridade no router modular. SERVER-02 deve produzir a matriz de equivalência antes de qualquer delete.

## 14. Conclusão

A impressão de que o arquivo é um “Frankenstein” é confirmada pela auditoria: o problema é estrutural e não simplesmente de formatação ou tamanho.

O caminho correto é **convergência arquitetural**, não uma nova camada de remendos:

> `server.ts` → legado transitório  
> `src/server/app.ts` → composição HTTP canônica  
> `routes/*` + `services/*` → comportamento modular  
> Supabase/repositories → fonte persistente de verdade

**Próxima etapa obrigatória: SERVER-02 — Matriz de equivalência das rotas.**
