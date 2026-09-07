# SERVER-03 — Matriz de Estado e Dependências do `server.ts`

> **Data:** 2026-09-07  
> **Escopo:** estado, bootstrap, imports e responsabilidades exclusivas do entrypoint legado.  
> **Objetivo:** definir o que pode ser eliminado, o que precisa ser migrado e o que precisa de paridade/teste antes da remoção.

## 1. Veredito

**STATUS: VERIFIED — destino das principais responsabilidades identificado.**

O problema estrutural não é apenas o tamanho do arquivo. O `server.ts` mantém estado e inicialização que deveriam pertencer ao `app.ts`/repositórios/serviços. A coexistência cria risco de comportamento diferente entre desenvolvimento e produção.

## 2. Estado em memória

### `casesStore`

```text
server.ts
  const casesStore = new Map<string, CaseDatabaseRow>();
```

**Classificação:** LEGADO / P0.

Ele é alimentado pelo seed `case_demo_745` e é usado pelos handlers inline. A autoridade modular já é `databaseRows`, exportado por `src/server/app.ts` a partir de `caseRepository`.

**Destino:** eliminar após SERVER-05/06, depois que todos os handlers inline dependentes tiverem sido removidos/migrados.

### `auditLogsStore`

```text
server.ts
  const auditLogsStore: AuditLogEntry[] = [];
```

**Classificação:** LEGADO / P0.

O router canônico de auditoria usa `auditLogs` exportado por `app.ts`. Manter dois arrays cria divergência e pode fazer uma auditoria aparecer em um caminho e desaparecer em outro.

**Destino:** eliminar junto com os handlers inline.

## 3. Seed de demonstração

O `server.ts` cria `sampleCaseDomain` com:

- `case_demo_745`;
- CPF/CNH e dados pessoais;
- placa e dados de veículo;
- dados de infração;
- análise de IA;
- pagamento;
- timeline;
- dados de órgão autuador.

Depois grava o caso em **dois stores**:

```text
casesStore.set(...)
databaseRows.set(...)
```

**Classificação:** P0 — bootstrap contaminado por fixture/dados de demonstração.

**Destino:** remover do servidor. Fixtures pertencem aos testes e/ou seed explícito de desenvolvimento, nunca ao bootstrap comum da aplicação.

## 4. Audit de bootstrap

O `server.ts` também cria `aud_init_001` em `auditLogsStore` no boot.

**Classificação:** P1.

O log de boot não deve depender do store legado. Se for necessário operacionalmente, deve usar o mecanismo de observabilidade canônico, sem criar uma segunda fonte de auditoria.

## 5. Inicialização de legislação

```text
contranCollector.start()
```

é iniciado diretamente pelo entrypoint quando não está em produção.

**Classificação:** P1 — side effect de bootstrap.

**Destino:** ciclo de vida explícito de infraestrutura/worker. Não deve permanecer misturado com definição de HTTP routes.

## 6. Workers e jobs

O `server.ts` importa diretamente componentes como:

- `scraperJobQueue`;
- `scrapeWorker`;
- `marketingOrchestrator`;
- `marketingMetricsCollector`;
- `startMetaTokenRenewal`;
- `startPollingJob`.

**Classificação:** P1.

A regra de destino é separar:

```text
HTTP application lifecycle
        ≠
background worker lifecycle
```

O servidor web deve montar a aplicação. Workers devem possuir entrypoints/lifecycle próprios ou uma composição explícita de infraestrutura.

## 7. Gemini / IA

O legado contém inicialização direta de `GoogleGenAI` (`getGenAI`) além do `aiProviderManager` e do pipeline RAG.

**Classificação:** P0/P1 — múltiplas gerações de arquitetura de IA.

**Destino:** provider/orchestrator canônico. O entrypoint não deve conhecer detalhes do provider nem possuir fallback jurídico próprio.

## 8. Knowledge Base

O `server.ts` importa diretamente múltiplas coleções de conhecimento e `LEGAL_ARGUMENTS`.

Isso é sinal de acoplamento do entrypoint ao domínio jurídico.

**Destino:** routes/services/knowledge/RAG existentes. A composição HTTP não deve importar datasets jurídicos para implementar handlers inline.

## 9. Comercial

O `server.ts` importa `commercialService` e executa warm-up comercial.

**Classificação:** P1.

O warm-up pode ser mantido como comportamento de infraestrutura se necessário, mas deve sair do arquivo de composição HTTP. A implementação comercial já possui router/service modular.

## 10. Documenso

O legado importa:

- `documensoRoutes`;
- `isDocumensoConfigured`;
- `startPollingJob`.

**Classificação:** P1.

Rotas devem permanecer no `app.ts`. Polling deve possuir lifecycle próprio e não ficar acoplado ao entrypoint HTTP legado.

## 11. Vite / servidor local

O `server.ts` também importa `createViteServer` e concentra o servidor de desenvolvimento junto com o backend.

Isso explica parcialmente por que ele cresceu tanto: ele exerce simultaneamente papel de:

```text
backend server
+ Vite dev host
+ API composition
+ seed
+ workers
+ integrations bootstrap
```

**Destino:** separar composição de aplicação (`createApp`) de infraestrutura de desenvolvimento.

## 12. Scripts ainda apontando para o legado

O `package.json` mantém:

```text
"dev": "tsx server.ts"
"build": "... esbuild server.ts ..."
"start": "node dist/server.cjs"
```

Enquanto a Vercel utiliza:

```text
api-src/index.ts
  -> src/server/app.ts
```

**Classificação:** P0 — duas arquiteturas executáveis.

**Destino:** após SERVER-04/05, mudar os scripts para o entrypoint canônico e criar, se necessário, um entrypoint de desenvolvimento fino que apenas injete Vite e chame `createApp()`.

## 13. Rotas sem equivalente confirmado

As buscas desta etapa não encontraram referência direta para:

- `/api/ai/chat-consultant`;
- `/api/ai/consult-traffic`.

**Classificação:** ORPHAN CANDIDATE.

Não apagar ainda. É necessário verificar testes, frontend, documentação e contratos externos.

## 14. Contrato de claim

Existe divergência entre:

```text
legacy: POST /api/cases/claim
canonical: POST /api/cases/:id/claim
```

**Classificação:** P1 — contrato a preservar/migrar conscientemente.

A próxima implementação deve procurar consumidores e, se necessário, criar compatibilidade no router canônico, não no `server.ts`.

## 15. Generate defense

`/api/cases/:id/generate-defense` é a maior área de risco para uma remoção mecânica. O handler legado combina pagamento, limite de geração, seleção de argumentos, RAG, provider de IA, documentos, timeline e auditoria.

**Classificação:** P0 — precisa de paridade funcional antes da exclusão.

O destino correto é o pipeline modular de casos/IA/documentos, preservando o fluxo jurídico canônico e a regra de `permittedTheses()` já auditada anteriormente.

## 16. Mapa de destino

| Responsabilidade | Origem atual | Destino |
|---|---|---|
| HTTP routes | `server.ts` | `src/server/app.ts` + `routes/*` |
| Case state | `casesStore` | `caseRepository` |
| Audit state | `auditLogsStore` | `auditLogs`/observabilidade canônica |
| Knowledge | imports inline | knowledge/RAG services |
| AI provider | `getGenAI` + inline fallback | `aiProviderManager`/orchestrator |
| Documents | inline generation | document pipeline |
| Workers | bootstrap inline | worker entrypoints/lifecycle |
| Documenso polling | bootstrap inline | lifecycle/job dedicado |
| Demo case | bootstrap | test fixture/dev seed explícito |
| Vite | `server.ts` | dev entrypoint fino |
| env validation | `server.ts` | startup/config module |

## 17. Ordem segura de execução

```text
SERVER-03 ✅
   ↓
SERVER-04  definir entrypoint canônico
   ↓
SERVER-05  migrar/remover responsabilidades exclusivas
   ↓
SERVER-06  eliminar casesStore/auditLogsStore/seed
   ↓
SERVER-07  remover server.ts
   ↓
SERVER-08  corrigir package.json
   ↓
SERVER-09  unit + build + E2E
   ↓
SERVER-10  Vercel + produção
```

## 18. Regra de segurança

Até SERVER-09, **não apagar o `server.ts` inteiro em uma única alteração**.

A remoção deve ocorrer depois que:

1. o entrypoint canônico puder executar localmente;
2. todos os endpoints necessários estiverem em routers modulares;
3. os contratos divergentes tiverem testes;
4. o estado legado tiver sido eliminado;
5. `npm run dev`, `npm run build` e `npm start` não dependerem do arquivo.

**Conclusão:** `server.ts` deve desaparecer, mas somente como consequência da consolidação — não como uma tentativa de corrigir o Frankenstein apagando o arquivo antes de garantir a substituição.
