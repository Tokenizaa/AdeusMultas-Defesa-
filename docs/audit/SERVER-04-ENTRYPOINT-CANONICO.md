# SERVER-04 — Entry Point Canônico

> **Data:** 2026-09-07  
> **Status:** IMPLEMENTED — scripts locais agora apontam para a arquitetura canônica.  
> **Objetivo:** eliminar a dependência operacional de `server.ts` sem removê-lo prematuramente.

## 1. Contrato definido

A aplicação HTTP canônica é:

```text
src/server/app.ts
        ↓
createApp()
        ↓
routes/* + services/* + repositories
```

A Vercel já utiliza esse caminho por meio de `api-src/index.ts`, que importa `createApp()` e inicializa a aplicação uma única vez por instância quente. fileciteturn245file0L2-L5

## 2. Novo entrypoint local

Foi criado:

```text
src/server/dev-entry.ts
```

Responsabilidades únicas:

1. chamar `createApp()`;
2. criar o Vite em `middlewareMode` apenas para desenvolvimento;
3. montar os middlewares do Vite;
4. iniciar o listener HTTP.

O entrypoint não contém rotas, regras de negócio, seed, estado de casos, IA ou lógica jurídica.

## 3. Scripts corrigidos

Antes:

```text
npm run dev   → server.ts
npm run build → esbuild server.ts
npm start     → dist/server.cjs
```

Agora:

```text
npm run dev   → src/server/dev-entry.ts
npm run build → vite build + build-api.mjs
npm start     → api/index.mjs
```

O `build-api.mjs` continua responsável por gerar o bundle da API a partir de `api-src/index.ts`. fileciteturn246file0L2-L5

A configuração da Vercel já aponta `/api/*` para `api/index.mjs`. fileciteturn248file0L2-L5

## 4. Consequência arquitetural

A partir desta fase, `server.ts` deixa de ser um entrypoint necessário para:

- desenvolvimento;
- build;
- produção local;
- Vercel.

Ele permanece temporariamente no repositório apenas como código legado a ser desmontado nas fases seguintes.

## 5. Por que não remover `server.ts` agora

Ainda existem responsabilidades exclusivas identificadas no SERVER-03, principalmente:

- handlers legados de geração de defesa;
- contrato legado de claim;
- chat/consultas de IA sem equivalente confirmado;
- workers e side effects de bootstrap;
- seed de demonstração;
- estado em memória legado.

Remover o arquivo neste ponto poderia transformar dívida arquitetural em regressão funcional.

## 6. Regra para SERVER-05

A partir deste ponto, qualquer funcionalidade recuperada do `server.ts` deve ser movida para a camada correta:

```text
route → controller/route module
business logic → service/orchestrator
state → repository
background work → worker/lifecycle
configuration → config module
```

É proibido criar `server2.ts`, `legacy-server.ts` ou outro novo monólito como etapa intermediária.

## 7. Critério de conclusão

SERVER-04 será considerado consolidado quando:

- `npm run dev` não depender de `server.ts`;
- `npm run build` não depender de `server.ts`;
- `npm start` não depender de `dist/server.cjs`;
- Vercel continuar usando `api-src/index.ts → createApp()`;
- nenhuma funcionalidade crítica for perdida.

**Próxima fase:** SERVER-05 — extração das responsabilidades exclusivas restantes do `server.ts`.
