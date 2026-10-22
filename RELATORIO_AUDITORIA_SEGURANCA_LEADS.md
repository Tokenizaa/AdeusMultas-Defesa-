# RELATÓRIO DE AUDITORIA DE SEGURANÇA — Sistema de Captação de Leads (B2C + B2B)

**Projeto:** DefesAi (AdeusMultas-Defesa-)
**Branch:** `main` (trabalho direto, sem branches/PRs — conforme AGENTS.md)
**SHA do commit atual:** `41dd4a8` — `fix(auth): remove insert manual user_profiles — trigger handle_new_user() já cria [DEPLOY-PRODUCTION]`
**Data:** 21/10/2026
**Auditor:** Security Architect (agent @seguranca)
**Escopo:** Sistema de captação de leads B2C e B2B (webhooks WhatsApp/Meta, auth, admin endpoints, RLS, LGPD, secrets, rate limit, CORS, webhooks pagamento, input validation)

---

## 1. RESUMO EXECUTIVO

| Área de Segurança | Status | Justificativa |
|-------------------|--------|---------------|
| Webhooks WhatsApp (HMAC) | ⚠️ FAIL PARCIAL | HMAC implementado com timing-safe equal, mas desabilitado se `EVOLUTION_WEBHOOK_SECRET` não estiver definido (aceita qualquer webhook em produção sem segredo) |
| Webhook Meta Lead Ads | ❌ FAIL | Rota usa `JSON.stringify(req.body)` em vez de `req.rawBody` para verificação HMAC — assinatura do body original não confere; fallback sem segredo rejeita (ok) |
| Auth middleware /api/auth/me | ✅ PASS | Validação via Supabase JWT; bypasses de dev guardados por `NODE_ENV !== 'production'`; não deriva identidade de headers clientes |
| Admin endpoints /api/marketing/automation/* | ✅ PASS | `router.use(authenticateToken, requireAdmin)` protege todas as rotas do router |
| Admin endpoints /api/marketing/* (marketing.ts) | ❌ FAIL | Vários GET públicos sem auth (`/status`, `/contents/:id/versions`, `/inbox/conversations/:id`); proteção depende de mount-guards no `app.ts` com lacunas |
| RLS no banco (marketing_leads) | ✅ PASS | RLS ENABLED com policies `deny_anon_authenticated` (RESTRICTIVE, `USING (false)`) — deny-all para anon/authenticated; service_role (backend) bypassa |
| Exposição de PII em respostas API | ⚠️ FAIL PARCIAL | Endpoints admin retornam leads com telefone/email (acesso restrito a admin — OK); XLSX export não paginado (até 500 linhas) expõe PII em lote |
| Sanitização inputs (SQLi/XSS) | ✅ PASS | Supabase JS usa queries parametrizadas; validação de campos em campanhas; nenhum concatenação SQL bruta encontrada |
| Segredos hardcoded | ❌ CRÍTICO FAIL | `.env.md` contém segredos REAIS (Supabase service_role, Cloudflare token, NVIDIA keys, Evolution API key, Facebook app secret, credenciais admin/teste) — não está gitignorado |
| Rate limiting endpoints públicos | ❌ FAIL | Nenhum rate limit específico em endpoints públicos (cadastro, scrape, webhooks); global limiter 200/15min só em produção, desabilitado em dev |
| CORS | ⚠️ FAIL PARCIAL | Permite qualquer origem em dev; permite `*.run.app` e `*.google.com` em produção; headers `x-user-*` (forjáveis) expostos |
| Webhooks pagamento (PagBank) | ⚠️ FAIL PARCIAL | HMAC verificado (PagBank), mas NÃO há idempotência por evento no handler; VenoPag em modo não-produção ignora assinatura |

**Veredito geral:** ❌ **FAIL** — Existem falhas críticas (segredos expostos em `.env.md`, falta de HMAC condicional em webhooks WhatsApp, HMAC com body re-serializado no Meta, falta de idempotência em webhooks de pagamento) que exigem correção antes de qualquer exposição em produção.

---

## 2. ARQUIVOS AUDITADOS (caminhos absolutos)

### Middleware
1. `/home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/middleware/auth-middleware.ts`
2. `/home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/middleware/rate-limit.ts`
3. `/home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/config/cors.ts`

### Webhooks WhatsApp (Evolution API)
4. `/home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/routes/whatsapp.ts` (POST /api/webhooks/whatsapp — linhas 185-279)
5. `/home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/shared/webhook/evolution-webhook-auth.ts`
6. `/home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/services/whatsapp-service.ts`
7. `/home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/services/messaging-service.ts` (handleEvolutionWebhook — linha 744)
8. `/home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/services/prospecting-responder.ts`
9. `/home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/services/whatsapp-journey-router.ts`

### Webhook Meta Lead Ads
10. `/home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/routes/meta.ts` (POST /api/meta/webhook — linhas 286-367)
11. `/home/lg/workspace/projects/AdeusMultas-Defesa-/src/integrations/meta/webhooks/meta-webhook-service.ts`

### Auth
12. `/home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/routes/auth.ts` (GET /api/auth/me)
13. `/home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/db/supabase-server.ts` (referenciado)

### Admin endpoints de leads
14. `/home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/routes/marketing-automation.ts` (router com `authenticateToken, requireAdmin`)
15. `/home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/routes/marketing.ts` (endpoints públicos e admin)
16. `/home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/app.ts` (mount guards — linhas 87-91)

### RLS / Banco
17. `/home/lg/workspace/projects/AdeusMultas-Defesa-/supabase/migrations/20260827000001_create_marketing_leads.sql`
18. `/home/lg/workspace/projects/AdeusMultas-Defesa-/supabase/migrations/20260829100001_enable_rls_internal_tables.sql`
19. `/home/lg/workspace/projects/AdeusMultas-Defesa-/supabase/migrations/20261013000001_security_hardening_and_indexes.sql` (policies deny-all)
20. `/home/lg/workspace/projects/AdeusMultas-Defesa-/supabase/migrations/20260829120001_add_audience_segmentation_and_opt_out.sql`
21. `/home/lg/workspace/projects/AdeusMultas-Defesa-/supabase/migrations/20260827000002_create_marketing_automation.sql`

### Secrets / Env
22. `/home/lg/workspace/projects/AdeusMultas-Defesa-/.env.md` (segredos REAIS — NÃO gitignorado)
23. `/home/lg/workspace/projects/AdeusMultas-Defesa-/.env.example.example` (template com placeholders)
24. `/home/lg/workspace/projects/AdeusMultas-Defesa-/.gitignore`

### Webhooks pagamento (PagBank / VenoPag)
25. `/home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/routes/payments.ts` (webhooks pagbank linha 555, venopag linha 1096)
26. `/home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/integrations/gateway/venopag-adapter.ts` (verifyVenoSignature — linha 155)
27. `/home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/integrations/gateway/webhook-handler.ts`
28. `/home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/db/payment-repository.ts` (persistWebhookEvent com idempotência — linha 170, NÃO usado pelo handler)

### Scraping / Leads públicos
29. `/home/lg/workspace/projects/AdeusMultas-Defesa-/src/server/routes/scrape.ts` (POST /api/scrape — PÚBLICO, sem auth)

### Frontend (referência PII)
30. `/home/lg/workspace/projects/AdeusMultas-Defesa-/src/components/marketing/components/ProspectingLeadsPage.tsx`

---

## 3. VULNERABILIDADES ENCONTRADAS

### CRÍTICA — C-01: Segredos reais expostos em arquivo `.env.md` (não gitignorado)

**Arquivo:** `/.env.md` (untracked, presente no working directory)

**Descrição:** O arquivo `.env.md` contém valores reais de segredos de produção/homologação, incluindo:
- `SUPABASE_SERVICE_ROLE_KEY` — JWT com privilégios de service_role (bypassa RLS)
- `SUPABASE_ACCESS_TOKEN` — token de acesso da Supabase CLI
- `CLOUDFLARE_API_TOKEN` — token da Cloudflare
- `NVIDIA_API_KEY` ×3 — chaves da NVIDIA NV-Embed-QA
- `NINEROUTER_KEY` — chave da 9Router
- `EVOLUTION_API_KEY` e `VITE_EVOLUTION_API_KEY` — chave da Evolution API (uma exposta client-side via Vite)
- `VITE_EVOLUTION_INSTANCE_TOKEN` — token da instância exposto client-side
- `ADMIN_TEST_LOGIN` / `ADMIN_TEST_PASSWORD` — credenciais de admin de teste (valores sanitizados: [EMAIL_TESTE] / [SENHA_TESTE])
- `USER_TEST_LOGIN` / `USER_TEST_PASSWORD` — credenciais de usuário real
- `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` — segredo real do app Meta

**Impacto:** Qualquer pessoa com acesso ao repositório (ou working directory) obtém credenciais válidas para serviços de produção. Possível tomada de controle total da infraestrutura (Supabase, Cloudflare, WhatsApp, Meta Ads, IA).

**OWASP:** A07:2021 — Identificação e Falha de Autenticação / A04:2021 — Design Inseguro (segredos em repositório)

**Remediação:** Remover `.env.md` do working directory, adicionar `env_*.md` e `.env.md` ao `.gitignore`, rotacionar TODOS os segredos expostos, migrar para variáveis de ambiente injetadas pelo provedor de hospedagem (Vercel/Supabase) sem arquivo no disco.

---

### CRÍTICA — C-02: WhatsApp webhook aceita requisições não autenticadas se segredo não configurado

**Arquivo:** `src/server/shared/webhook/evolution-webhook-auth.ts` (linha 86-88) + `src/server/routes/whatsapp.ts` (linhas 211-226)

**Descrição:** `authorizeEvolutionWebhook()` retorna `{ ok: true, mode: 'disabled' }` quando `EVOLUTION_WEBHOOK_SECRET` não está definido. Isso acontece inclusive em produção. O endpoint `POST /api/webhooks/whatsapp` é público e qualquer atacante pode forjar payloads, injetando mensagens no pipeline de normalização → CRM → IA.

**Impacto:** Injeção de mensagens falsas, criação de leads falsos, disparo de automações de prospecção para números arbitrários, contaminação do histórico de conversas.

**OWASP:** A01:2021 — Controle de Acesso Quebrado / A07:2021 — Falha de Identificação e Autenticação

**Remediação:** Tornar `EVOLUTION_WEBHOOK_SECRET` obrigatório em produção (fail-closed). Se não estiver definido, rejeitar com 500 ou 401 em vez de aceitar sem validação. O `server.ts` já faz fail-closed para variáveis críticas — adicionar `EVOLUTION_WEBHOOK_SECRET` a essa lista quando `PAYMENT_MODE=production` ou `NODE_ENV=production`.

---

### CRÍTICA — C-03: Meta webhook verifica HMAC sobre body re-serializado (não o raw body)

**Arquivo:** `src/server/routes/meta.ts` (linha 288)

**Descrição:** A rota POST do webhook Meta computa `rawPayload = JSON.stringify(req.body)` em vez de usar `req.rawBody` (que já é capturado pelo middleware `express.json({ verify: ... })` em `app.ts` linha 63). O `JSON.stringify` pode alterar ordenação de chaves, espaços em branco e escaping, produzindo um byte-stream diferente do body original assinado pela Meta. A verificação HMAC em `meta-webhook-service.verifySignature()` falharia para webhooks legítimos da Meta, ou pior, permitiria bypass se a assinatura não for estritamente exigida.

**Impacto:** Webhooks legítimos da Meta podem ser rejeitados (disponibilidade), ou, se a verificação for contornada por erro de implementação, webhooks falsos podem ser aceitos (injeção de leads falsos).

**OWASP:** A07:2021 — Falha de Identificação e Autenticação / A05:2021 — Configuração de Segurança Incorreta

**Remediação:** Substituir `JSON.stringify(req.body)` por `(req as any).rawBody` na rota `/api/meta/webhook` POST, consistente com o middleware de raw body já configurado em `app.ts`.

---

### ALTA — H-01: Falta de idempotência no handler de webhook PagBank

**Arquivo:** `src/server/routes/payments.ts` (POST /api/webhooks/pagbank — linhas 555-694)

**Descrição:** O handler verifica a assinatura HMAC (via `pagBankIntegration.processWebhook`) mas NÃO verifica se o evento já foi processado. O repositório `payment-repository.ts` possui `persistWebhookEvent()` com upsert por `pagbank_event_id` (idempotência), mas esse método NÃO é chamado no handler do webhook. O handler grava diretamente no store in-memory `databaseRows`. Eventos duplicados (retry da PagBank) resultariam em múltiplos processamentos: logs de auditoria duplicados, entradas de timeline duplicadas, eventos comerciais duplicados.

**Impacto:** Duplicação de efeitos colaterais (auditoria, timeline, comercial), embora `isPaid=true` seja idempotente em si. Falta de rastreabilidade de eventos já processados.

**OWASP:** A04:2021 — Design Inseguro / A09:2021 — Falhas de Log e Monitoramento

**Remediação:** Inserir verificação de idempotência antes de processar: consultar `payment_webhook_events` por `pagbank_event_id`; se já processado, retornar 200 sem reprocessar. Chamar `persistWebhookEvent()` após processamento bem-sucedido.

---

### ALTA — H-02: VenoPag webhook ignora assinatura em modo não-produção

**Arquivo:** `src/server/integrations/gateway/venopag-adapter.ts` (linhas 344-349) + `src/server/routes/payments.ts` (linha 1108: `const signatureValid = true`)

**Descrição:** `verifyVenoSignature()` só é chamada quando `isProductionMode()` retorna true (`PAYMENT_MODE === 'production'`). Em desenvolvimento/sandbox, webhooks VenoPag são aceitos sem verificação de assinatura HMAC. Além disso, a rota hardcoda `signatureValid = true` independentemente do resultado do adapter.

**Impacto:** Em ambiente de homologação, qualquer atacante pode forjar webhooks VenoPag e confirmar pagamentos falsos. Se `PAYMENT_MODE` for acidentalmente deixado como `sandbox` em produção, a proteção fica desabilitada.

**OWASP:** A01:2021 — Controle de Acesso Quebrado / A07:2021 — Falha de Identificação e Autenticação

**Remediação:** Exigir verificação de assinatura VenoPag em todos os ambientes (ou ao menos logar rejeição em não-produção). Remover hardcode `signatureValid = true` — usar o resultado real do adapter.

---

### ALTA — H-03: Endpoints públicos em `/api/marketing/*` sem autenticação

**Arquivo:** `src/server/app.ts` (linhas 87-88) + `src/server/routes/marketing.ts`

**Descrição:** O mount guard de `/api/marketing` só exige auth para:
- GET em `/inbox/conversations`, `/inbox/stats`, `/automation/leads`, `/automation/export`
- POST/PUT/PATCH/DELETE (qualquer path)

Outros GETs são públicos, incluindo:
- `GET /api/marketing/status` — expõe status dos agentes, conteúdos, métricas, brand identity
- `GET /api/marketing/contents/:id/versions` — expõe versões de conteúdo
- `GET /api/marketing/inbox/conversations/:id` — expõe conversas e mensagens (PII de contatos)

**Impacto:** Divulgação de informações internas do sistema de marketing e potencialmente dados de contatos/leads para usuários não autenticados.

**OWASP:** A01:2021 — Controle de Acesso Quebrado / A05:2021 — Configuração de Segurança Incorreta

**Remediação:** Exigir `authenticateToken` (e `requireAdmin` quando apropriado) em todos os endpoints `/api/marketing/*`, exceto health checks explícitos.

---

### ALTA — H-04: Endpoint de scraping público sem autenticação nem rate limit específico

**Arquivo:** `src/server/routes/scrape.ts` (POST /api/scrape — linha 18)

**Descrição:** `POST /api/scrape` cria jobs de scraping headless (Google Maps) sem qualquer autenticação. É montado diretamente em `/api` (app.ts linha 114) sem mount guard de auth. O global limiter (200/15min) aplica em produção, mas é insuficiente para proteger contra abuso de scraping (esgotamento de créditos Firecrawl/Google Maps, DoS no worker).

**Impacto:** Ataque de negação de serviço, esgotamento de orçamento de serviços externos, coleta massiva de dados públicos.

**OWASP:** A04:2021 — Design Inseguro / A05:2021 — Configuração de Segurança Incorreta

**Remediação:** Adicionar `authenticateToken` + `requireAdmin` ao endpoint de criação de scraping. Adicionar rate limit dedicado (ex: 10 req/min por IP).

---

### MÉDIA — M-01: CORS excessivamente permisivo

**Arquivo:** `src/server/config/cors.ts`

**Descrição:**
- Em desenvolvimento (`NODE_ENV !== 'production'`): `isOriginAllowed` retorna `true` para QUALQUER origem.
- Em produção: permite qualquer origem terminada em `.run.app`, `.google.com`, `.googleusercontent.com`, além de `http://localhost:*`.
- `allowedHeaders` inclui `x-user-id`, `x-user-role`, `x-user-email`, `x-user-name` — headers que o auth-middleware explicitamente alerta serem forjáveis e nunca devem estabelecer identidade.
- `credentials: true` com origem permissiva.

**Impacto:** Possível bypass de políticas de origem em navegadores, embora o impacto direto seja limitado porque a autenticação é via JWT (não cookies). A inclusão de headers `x-user-*` no CORS sinaliza confusão sobre a fonte de identidade.

**OWASP:** A05:2021 — Configuração de Segurança Incorreta

**Remediação:** Remover wildcard de origem em dev (ou restringir a origins conhecidas). Remover `*.google.com` e `*.googleusercontent.com` da lista de produção (manter apenas domínio da aplicação e Supabase). Remover headers `x-user-*` da lista de `allowedHeaders`.

---

### MÉDIA — M-02: Rate limiting insuficiente em endpoints públicos

**Arquivo:** `src/server/middleware/rate-limit.ts` + `src/server/app.ts`

**Descrição:**
- `globalLimiter`: 200 req/IP/15min apenas em produção; desabilitado (no-op) em desenvolvimento.
- `strictLimiter`: 20 req/IP/15min apenas para `/api/admin`, `/api/ai`, `/api/auth`.
- Nenhum rate limit dedicado para: cadastro/onboarding, webhooks (WhatsApp/Meta), scraping, endpoints públicos de marketing.
- Webhooks são públicos e de alto volume — sem proteção contra flood.

**Impacto:** Brute force em endpoints de autenticação, flood de webhooks, exaustão de recursos em scraping público.

**OWASP:** A04:2021 — Design Inseguro / A05:2021 — Configuração de Segurança Incorreta

**Remediação:** Habilitar rate limiting também em desenvolvimento (com limite mais generoso). Adicionar rate limit dedicado para webhooks (ex: 100 req/min) e endpoints públicos de cadastro (ex: 5 req/min por IP).

---

### MÉDIA — M-03: PII em lote via export XLSX de leads

**Arquivo:** `src/server/routes/marketing-automation.ts` (`/export` — linhas 853-965)

**Descrição:** Os endpoints `GET /api/marketing/automation/export` e `/export/:collectionRunId` retornam TODOS os campos de `marketing_leads` (incluindo `name`, `phone`, `whatsapp`, `email`, `address`, `city`, `state`) em formato XLSX, sem paginação (limite 500). Embora protegidos por `requireAdmin`, a exportação em lote de PII (telefone, email, endereço) aumenta a superfície de vazamento se a conta admin for comprometida.

**Impacto:** Vazamento em massa de PII de leads B2B (despachantes, advogados) em caso de comprometimento de conta admin.

**OWASP:** A02:2021 — Falhas Criptográficas / Exposição de Dados Sensíveis

**Remediação:** Adicionar paginação e limites menores para export. Considerar mascaramento de campos sensíveis (telefone/email) em exports salvo quando explicitamente solicitado com justificativa. Auditar acessos a export via logs.

---

### MÉDIA — M-04: Estado de pagamento em store in-memory (perda de persistência)

**Arquivo:** `src/server/routes/payments.ts` + `src/server/stores.ts`

**Descrição:** O handler de webhook PagBank grava confirmações de pagamento no store in-memory `databaseRows` (não no banco Supabase). Se o processo reiniciar, o estado de pagamento confirmado via webhook é perdido. Não há persistência imediata no banco para o estado `isPaid`.

**Impacto:** Perda de estado de pagamento pago em caso de reinício, inconsistência entre gateway e aplicação, possíveis cobranças duplicadas ou liberação de serviço sem pagamento.

**OWASP:** A04:2021 — Design Inseguro / A09:2021 — Falhas de Log e Monitoramento

**Remediação:** Persistir confirmações de pagamento no banco (tabela `payment_orders` já existe) de forma síncrona antes de retornar 200 ao webhook.

---

### BAIXA — L-01: Arquivos de debug no diretório raiz

**Arquivos:** `debug-*.mjs`, `visual-*.mjs`, `explore-*.mjs` (raiz do projeto)

**Descrição:** Vários arquivos de debug e visualização estão presentes na raiz do projeto, alguns podem conter dados de teste, URLs internas ou tokens temporários.

**Impacto:** Divulgação de informações internas se expostos via servidor estático ou acidentalmente commitados.

**OWASP:** A05:2021 — Configuração de Segurança Incorreta

**Remediação:** Remover arquivos de debug do diretório raiz ou movê-los para fora do caminho público. Adicionar ao `.gitignore`.

---

### BAIXA — L-02: Chave da Evolution API exposta client-side (Vite)

**Arquivo:** `/.env.md` + `src/server/services/whatsapp-service.ts`

**Descrição:** `VITE_EVOLUTION_API_KEY` e `VITE_EVOLUTION_INSTANCE_TOKEN` são variáveis com prefixo `VITE_`, injetadas pelo Vite no bundle client-side. Qualquer usuário do frontend pode ler a chave da Evolution API.

**Impacto:** Um atacante pode usar a chave para enviar mensagens via WhatsApp em nome da instância, consumir cota da Evolution API, ou consultar status da instância.

**OWASP:** A02:2021 — Exposição de Dados Sensíveis / A05:2021 — Configuração Incorreta

**Remediação:** Remover prefixo `VITE_` dessas variáveis. Toda comunicação com Evolution API deve ocorrer apenas no backend. Frontend chama endpoints próprios do backend (que autenticam e autorizam).

---

## 4. GAPS DE SEGURANÇA (itens ausentes)

| Gap | Detalhe | Severidade |
|-----|---------|------------|
| Falta de HMAC obrigatório em WhatsApp webhook | `EVOLUTION_WEBHOOK_SECRET` opcional; se ausente, aceita tudo | Crítica |
| HMAC com body re-serializado (Meta webhook) | `JSON.stringify(req.body)` vs `req.rawBody` | Crítica |
| Falta de idempotência em webhook PagBank | Não consulta `payment_webhook_events` antes de processar | Alta |
| VenoPag sem assinatura em não-produção | `isProductionMode()` skipa verificação | Alta |
| Endpoints marketing GET públicos | Falta auth em `/status`, `/contents/:id/versions`, etc. | Alta |
| Scraping público sem auth | `POST /api/scrape` sem autenticação | Alta |
| Segredos em `.env.md` | Valores reais no disco, não gitignorado | Crítica |
| Rate limit dedicado para webhooks/scrape/cadastro | Apenas global 200/15min (só produção) | Média |
| CORS permissivo (dev + `*.google.com` prod) | Origens excessivamente amplas | Média |
| Export XLSX sem paginação/mascaramento PII | Até 500 leads com telefone/email completo | Média |
| Estado pagamento apenas in-memory | Perda em reinício | Média |
| Chave Evolution API exposta client-side | `VITE_EVOLUTION_API_KEY` no bundle | Baixa |
| Arquivos debug na raiz | `debug-*.mjs`, `visual-*.mjs` | Baixa |

---

## 5. RECOMENDAÇÕES DE PRIORIDADE

### PRIORIDADE ALTA (corrigir antes de produção)

1. **Rotacionar todos os segredos expostos** em `.env.md` (Supabase service_role, Cloudflare token, NVIDIA keys, Evolution API key, Facebook secret, credenciais admin/teste) e remover o arquivo do disco.
2. **Tornar `EVOLUTION_WEBHOOK_SECRET` obrigatório** em produção; fail-closed se ausente.
3. **Consertar Meta webhook HMAC**: usar `req.rawBody` em vez de `JSON.stringify(req.body)`.
4. **Adicionar idempotência ao webhook PagBank**: verificar `payment_webhook_events` por `pagbank_event_id` antes de processar.
5. **Exigir assinatura VenoPag em todos os ambientes** (ou ao menos não hardcodar `signatureValid = true`).
6. **Proteger endpoints GET públicos de `/api/marketing/*`** com `authenticateToken` + `requireAdmin`.
7. **Proteger `POST /api/scrape`** com autenticação admin e rate limit dedicado.

### PRIORIDADE MÉDIA (corrigir na próxima sprint)

8. **Restringir CORS**: remover wildcard de dev, remover `*.google.com`/`*.googleusercontent.com` de prod, remover headers `x-user-*`.
9. **Habilitar rate limiting em desenvolvimento** e adicionar limites dedicados para webhooks e cadastro.
10. **Paginar e mascarar PII** em exports XLSX de leads.
11. **Persistir estado de pagamento** no banco (não apenas in-memory).
12. **Remover `VITE_` prefixo** da Evolution API key (movê-la para backend-only).

### PRIORIDADE BAIXA (corrigir em manutenção)

13. **Remover arquivos de debug** da raiz do projeto.
14. **Adicionar headers de segurança** ausentes (Referrer-Policy, Permissions-Policy).
15. **Implementar logging estruturado de eventos de segurança** (tentativas de webhook inválido, acessos negados admin).

---

## 6. SHA DO COMMIT ATUAL

```
41dd4a8 fix(auth): remove insert manual user_profiles — trigger handle_new_user() já cria [DEPLOY-PRODUCTION]
```

**Estado do working directory:** Há alterações não commitadas (diff stat):
- Modificados: `src/server/integrations/gateway/gateway-manager.ts`, `index.ts`, `types.ts`, `webhook-handler.ts`, `src/server/routes/admin.ts`, `src/server/routes/payments.ts`
- Deletados: `src/server/integrations/gateway/ggpix-adapter.ts`, `pagbank-adapter.ts`, `test-adapter.ts`
- Adicionados: `src/server/integrations/gateway/venopag-adapter.ts`, `.env.md`, vários `debug-*.mjs` e `visual-*.mjs`

**Recomendação:** Não commit alterações de segurança até revisar o diff completo. O arquivo `.env.md` (com segredos reais) deve ser removido e adicionado ao `.gitignore` antes de qualquer commit.

---

## 7. MAPEAMENTO OWASP TOP 10 (2021)

| OWASP | Risco | Aplicável a | Referência no relatório |
|-------|-------|-------------|------------------------|
| A01:2021 | Controle de Acesso Quebrado | Endpoints marketing públicos, scraping público, WhatsApp webhook sem HMAC, VenoPag sem assinatura | H-03, H-04, C-02, H-02 |
| A02:2021 | Falhas Criptográficas | PII em export XLSX, chave Evolution API client-side | M-03, L-02 |
| A03:2021 | Injeção | Baixo risco — queries parametrizadas via Supabase JS; nenhum SQL bruto encontrado | (nenhuma crítica) |
| A04:2021 | Design Inseguro | Segredos em `.env.md`, falta idempotência pagamento, estado in-memory | C-01, H-01, M-04 |
| A05:2021 | Configuração de Segurança Incorreta | CORS permissivo, RLS sem políticas (histórico), rate limit ausente, debug files | M-01, M-02, L-01 |
| A07:2021 | Falha de Identificação e Autenticação | HMAC WhatsApp desabilitado, HMAC Meta body re-serializado, bypasses auth em dev | C-02, C-03 |
| A09:2021 | Falhas de Log e Monitoramento | Sem rastreamento de eventos webhook duplicados, estado pagamento volátil | H-01, M-04 |

---

**Nota metodológica:** Esta avaliação é baseada em revisão estática de código-fonte. Não foram realizados testes de penetração ativos nem varredura de dependências (SAST/DAST/SCA). Recomenda-se execução de `npm audit`, `trivy` ou equivalente, e testes de penetração autorizados antes do deploy em produção.

---