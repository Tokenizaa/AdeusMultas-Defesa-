# ISSUE #2 — EXECUÇÃO CIRÚRGICA P0

## Objetivo

Corrigir somente a falha de autorização nas rotas de Marketing/Meta/Inbox/Automação (leads) expostas sem `requireAdmin` em runtime Node (`server.ts` / `dist/server.cjs`).

Não alterar schema Supabase.
Não refatorar arquitetura.
Não alterar gateway/webhook.
Não iniciar outra issue.
Não alterar webhooks públicos de integração (Meta/WhatsApp/Evolution/PagBank/GGPIX) nem callbacks OAuth.

## Evidência

1. O entry serverless (`api-src/index.ts`) constrói o app via `createApp()` de `src/server/app.ts`, onde existe middleware de autorização para Meta (`/api/integrations/meta/...` e `/api/meta/...`) e mutações de Marketing.

2. O entry Node (`server.ts` → `dist/server.cjs`, usado por `npm start`) monta as mesmas rotas DIRETAMENTE (linhas ~327-350), SEM os middlewares de proteção de `app.ts`. Nenhuma rota de `/api/marketing`, `/api/marketing/automation`, `/api/integrations/meta` ou `/api/meta` exige `requireAdmin` nesse runtime.

3. GETs de Marketing expõem PII de clientes e leads sem auth em `app.ts` e `server.ts`:

   - `/api/marketing/inbox/conversations` — lista conversas com `contact` (nome, telefone, placa) e mensagens;
   - `/api/marketing/inbox/conversations/:id/messages` — mensagens íntegras;
   - `/api/marketing/inbox/stats` — estatísticas de atendimento;
   - `/api/marketing/automation/leads` — leads B2B (nome, telefone, endereço, localização);
   - `/api/marketing/automation/export` e `/export/:id` — exporta leads (PII);
   - `/api/marketing/status` — retorna `agents`, `contents`, `brandIdentity` (estado interno do orquestrador) — protegido: tornar admin-only, mas manter público se usado por componente público comprovado.

4. Rotas Meta GETs sem proteção:

   - `/api/integrations/meta/webhooks/history` e `/api/meta/webhooks/history` — `getRecentWebhooks()` com payload de eventos abertos;
   - `/api/integrations/meta/tests` e `/api/meta/tests` — roda `runMetaIntegrationTests()` (diagnóstico, expõe configuração e estados de integração).

5. Frontend consome rotas agora protegidas com `fetch()` puro (sem `Authorization`), o que quebraria o painel após a correção:

   - `src/components/marketing/hooks/use-marketing-service.ts` — `fetch('/api/marketing/status|contents|cycle-tick|generate-content|...')`;
   - `src/components/marketing/components/InboxView.tsx` — `fetch('/api/marketing/inbox/...')`;
   - `src/core/integrations/meta-client.ts` — `fetch('/api/integrations/meta/status|tests|webhooks/history|publish|select-targets|...')`;
   - `src/components/admin/MetaIntegrationCards.tsx` — `api.get('/api/meta/status')` (verificar wrapper injeta auth);
   - `src/components/marketing/components/MediaStudioView.tsx` — `fetch('/api/marketing/generate-week')`;
   - `src/components/marketing/prospecting/ProspectingCollectionTab.tsx` — `fetch('/api/marketing/automation/leads|collection-runs|export')`.

6. Rotas públicas que DEVEM permanecer sem auth (não tocar):

   - webhooks: `/api/webhooks/*`, `/api/integrations/meta/webhook*`, `/api/meta/webhook*`;
   - OAuth callbacks: `/api/integrations/meta/callback`, `/api/meta/callback`;
   - `/api/commercial/prices` e `resolve-price` (preço/catálogo público).

## Correção 1 — proteger rotas de Marketing no entry Node (`server.ts`)

Adicionar middleware de autorização ANTES de montar `marketingRoutes` / `marketingAutomationRoutes`:

- `POST/PUT/PATCH/DELETE` em `/api/marketing*` → `authenticateToken` + `requireAdmin`;
- `GET` em `/api/marketing/inbox/*` → `authenticateToken` + `requireAdmin`;
- `GET` em `/api/marketing/automation/leads*` e `/api/marketing/automation/export*` → `authenticateToken` + `requireAdmin`;
- demais GETs (status/catálogo/health) permanecem públicos conforme uso comprovado no frontend;
- manter `/api/marketing/inbox/simulate-inbound` com o guard de `NODE_ENV` existente (público somente dev).

Importar `authenticateToken, requireAdmin` de `./src/server/middleware/auth-middleware` em `server.ts`.

## Correção 2 — alinhar `app.ts` (serverless) com a mesma regra

`src/server/app.ts` já protege Meta admin e mutações de Marketing. Adicionar:

- `GET` em `/api/marketing/inbox/*` → admin;
- `GET` em `/api/marketing/automation/leads*` e `/export*` → admin;
- `GET` `/api/integrations/meta/webhooks/history`, `/api/meta/webhooks/history`, `/api/integrations/meta/tests`, `/api/meta/tests` → admin.

Manter webhooks/OAuth públicos.

## Correção 3 — frontend: injetar auth nas chamadas protegidas

Toda chamada a rota agora protegida deve usar o wrapper de auth:

- componentes React que chamam rotas protegidas → `useAuthFetch` (`src/hooks/useAuthFetch.ts`);
- módulos não-React (`src/core/integrations/meta-client.ts`) → receber headers via parâmetro ou usar helper compartilhado de auth (reutilizar lógica de `useAuthFetch` sem hook, ex. `src/lib/authFetch.ts`), SEM duplicar regras de identidade.

Não trocar chamadas a rotas públicas (webhooks, preços, health).

## Testes P0

Criar testes seguindo o padrão existente (`tests/unit/meta-authorization.test.ts`, `tests/unit/communication-marketing-authorization.test.ts`):

1. `server.ts` contém middleware `requireAdmin` para `/api/marketing*` (mutações).
2. `server.ts` protege `GET /api/marketing/inbox/*` com `requireAdmin`.
3. `server.ts` protege `GET /api/marketing/automation/leads*` e `export*`.
4. `app.ts` mantém webhooks e OAuth fora da lista privilegiada (regressão do teste existente).
5. `app.ts` adiciona `webhooks/history` e `tests` à lista protegida de Meta.
6. Nenhum teste existente é modificado apenas para passar.

## Teste adversarial obrigatório

Simular HTTP para `/api/marketing/inbox/conversations` sem `Authorization` no entry Node.

Esperado:

```text
HTTP 401
```

Simular `GET /api/marketing/automation/export` sem token.

Esperado:

```text
HTTP 401
```

## Gates

```bash
npm run test:unit
npm run lint
npx tsc --noEmit
npm run build
```

Não modificar testes existentes apenas para fazê-los passar.

## Commit

Um único commit:

```text
fix(auth): requireAdmin em marketing/inbox/leads/meta — alinhar server.ts com app.ts
```

Push para `main`.

## Critério de conclusão

Só fechar a Issue #2 se:

- `server.ts` protege mutações de Marketing e GETs com PII (inbox, leads, export);
- `app.ts` protege os mesmos GETs e os endpoints Meta `tests`/`webhooks/history`;
- webhooks e OAuth callbacks continuam públicos;
- frontend envia auth em toda rota protegida (nenhuma chamada legítima quebra);
- testes P0 passam;
- unit/lint/tsc/build passam;
- working tree limpo;
- SHA completo do commit informado.