# 📊 Relatório de Auditoria de Infraestrutura e DevOps — Prontidão de Produção

**Projeto:** DefesAi (AdeusMultas-Defesa-)  
**Data da Auditoria:** 21 de Outubro de 2026  
**Auditor:** DevOps Automator (subagente)  
**Escopo:** Leitura estática local de arquivos de configuração, CI/CD e variáveis de ambiente  
**Restrições:** Sem deploy, sem alteração de arquivos, sem criação de branches/PRs

---

## 🎯 Veredito Geral

### **BLOCKED** — Não Pronto para Produção

O projeto apresenta **falhas críticas** que impedem a implantação em produção sem correções obrigatórias. Existem riscos de exposição de segredos, ausência de estratégia de rollback, falta de segurança na pipeline CI/CD e nenhuma observabilidade de produção configurada.

---

## 📋 Resumo Executivo de Achados

| Severidade | Quantidade | Categorias |
|------------|-----------|------------|
| 🔴 **ALTO** | 7 | Exposição de segredos, ausência de rollback, CI/CD incompleto, segredos expostos ao cliente |
| 🟡 **MÉDIO** | 6 | Configurações duplicadas/contraditórias, health check incompleto, secrets ausentes na CI, variáveis hardcoded |
| 🟢 **BAIXO** | 4 | Nomenclatura de arquivos, documentação ausente, build sem otimização, drift de variáveis |

---

## 🔴 Achados de Severidade ALTO

### ALTO-01: Segredos reais presentes no arquivo .env local
**Arquivo:linha:** `.env:4-75`  
**Descrição:** O arquivo `.env` contém chaves reais de produção, incluindo:
- `SUPABASE_SERVICE_ROLE_KEY` (linha 7) — chave de serviço com privilégios de administrador
- `SUPABASE_PASSWORD` (linha 9) — senha de banco de dados em texto claro
- `CLOUDFLARE_API_TOKEN` (linha 19) — token de API da Cloudflare com potencial acesso total
- `NVIDIA_API_KEY`, `NVIDIA_API_KEY_2`, `NVIDIA_API_KEY_3` (linhas 24-26) — chaves de API da NVIDIA
- `EVOLUTION_API_KEY` (linha 34) — chave da Evolution API (WhatsApp Business)
- `ADMIN_TEST_PASSWORD`, `USER_TEST_PASSWORD` (linhas 55, 61) — senhas de contas de teste
- `FACEBOOK_APP_SECRET` (linha 75) — segredo do app Facebook/Meta

**Impacto:** Se o arquivo `.env` for acidentalmente commitado (remoção do `.gitignore`), todos esses segredos serão expostos no repositório Git. Comprometimento total de Supabase, Cloudflare, NVIDIA, WhatsApp e Meta.

**Recomendação:** Remover todos os valores reais do `.env` local. Manter apenas placeholders. Injetar segredos exclusivamente via GitHub Secrets, Vercel Environment Variables ou Cloudflare Secrets no momento do deploy.

---

### ALTO-02: SUPABASE_URL e VITE_SUPABASE_URL hardcoded no vercel.json
**Arquivo:linha:** `vercel.json:12-13, 17-18`  
**Descrição:** As variáveis `SUPABASE_URL` e `VITE_SUPABASE_URL` estão hardcoded diretamente no `vercel.json` com valores de produção (`https://llmxnpgjpxcvyrqjkfwb.supabase.co`). Este arquivo é versionado no Git.

**Impacto:** Configuração de infraestrutura exposta no repositório. Dificulta a gestão de múltiplos ambientes (staging/produção) e viola o princípio de separação entre código e configuração (12-Factor App).

**Recomendação:** Remover essas variáveis do `vercel.json` e configurá-las exclusivamente no dashboard da Vercel como Environment Variables.

---

### ALTO-03: Nenhuma estratégia de rollback configurada
**Arquivo:linha:** `.github/workflows/cloudflare-deploy.yml:1-109` (todo o arquivo)  
**Descrição:** O workflow de deploy para Cloudflare não contém qualquer mecanismo de rollback. Não há:
- Blue-green deployment
- Canary deployment
- Rollback automático em caso de falha de health check
- Versionamento de implantação para revertência rápida
- Comando `wrangler rollback` ou similar

**Impacto:** Em caso de deploy com falha em produção, não há como reverter automaticamente para uma versão estável. O tempo de recuperação (MTTR) será elevado, exigindo intervenção manual.

**Recomendação:** Implementar deploy blue-green ou canary via Cloudflare Workers com divisão de tráfego, adicionar health check gate antes de redirecionar 100% do tráfego, e configurar rollback automático via `wrangler` ou Vercel instant rollback.

---

### ALTO-04: VITE_EVOLUTION_API_KEY exposto ao cliente (frontend)
**Arquivo:linha:** `.env:42`  
**Descrição:** A variável `VITE_EVOLUTION_API_KEY` tem prefixo `VITE_`, o que a torna automaticamente exposta ao bundle do frontend pelo Vite. Esta é uma chave de API da Evolution API (WhatsApp Business) que deveria ser mantida exclusivamente server-side.

**Arquivo:linha:** `.env:43-44`  
`VITE_EVOLUTION_INSTANCE_NAME` e `VITE_EVOLUTION_INSTANCE_TOKEN` também expostos.

**Impacto:** Qualquer usuário do navegador pode extrair essas chaves do código JavaScript enviado ao cliente, permitindo uso indevido da Evolution API (envio de mensagens WhatsApp, acesso a instâncias, etc.).

**Recomendação:** Remover prefixo `VITE_` dessas variáveis. Movê-las para variáveis de ambiente server-side apenas. O frontend deve chamar um endpoint backend que proxy as chamadas para a Evolution API usando chaves server-side.

---

### ALTO-05: CI/CD sem security scanning (SAST/DAST/dependency scan)
**Arquivo:linha:** `.github/workflows/ci-cd.yml:1-28`  
**Descrição:** O pipeline `ci-cd.yml` executa apenas: testes unitários, typecheck e build. Não há:
- Análise estática de segurança (SAST) — ex: CodeQL, Snyk, Semgrep
- Scanning de vulnerabilidades de dependências — ex: `npm audit`, `snyk test`
- Análise de secrets commiteados — ex: `gitleaks`, `truffleHog`
- Linting (ESLint, Prettier check)

**Impacto:** Vulnerabilidades de dependências, código inseguro e secrets acidentais podem chegar à produção sem detecção.

**Recomendação:** Adicionar steps de `npm audit --audit-level high`, CodeQL ou Semgrep, e gitleaks ao pipeline CI antes do build.

---

### ALTO-06: Referência a workflow inexistente (production-golden-path)
**Arquivo:linha:** `.github/workflows/ci-cd.yml:29-32`  
**Descrição:** O job `production-golden-path` faz `uses: ./.github/workflows/golden-path-production.yml`, mas este arquivo **não existe** no repositório.

**Impacto:** Se o commit contiver `[PHASE4-RUN]`, o workflow falhará com erro de referência inexistente, bloqueando o deploy.

**Recomendação:** Criar o arquivo `.github/workflows/golden-path-production.yml` ou remover a referência do `ci-cd.yml`.

---

### ALTO-07: Nenhuma observabilidade/monitoramento de produção configurado
**Arquivo:linha:** `.github/workflows/cloudflare-deploy.yml:1-109`, `vercel.json:1-31`, `wrangler.jsonc:1-47`  
**Descrição:** Nenhuma configuração de:
- Uptime monitoring (Pingdom, UptimeRobot, Cloudflare Monitoring)
- Alerting (PagerDuty, Slack, email)
- Log aggregation centralizado
- Distributed tracing
- Métricas de negócio (error rate, latency, throughput)

O `/api/health` existe no Cloudflare Worker (`cloudflare/worker.js:31-63`) mas não há ninguém monitorando ele.

**Impacto:** Falhas em produção só serão detectadas por usuários reportando. Não há SLO/SLA rastreável.

**Recomendação:** Configurar Cloudflare Monitoring ou UptimeRobot para `/api/health`, integrar com PagerDuty/Slack para alertas, e configurar log aggregation (ex: Cloudflare Logpush, Datadog, ou Grafana Cloud).

---

## 🟡 Achados de Severidade MÉDIO

### MÉDIO-01: Dois arquivos wrangler contraditórios (wrangler.json vs wrangler.jsonc)
**Arquivo:linha:** `wrangler.json:1-25` vs `wrangler.jsonc:1-47`  
**Descrição:** Existem dois arquivos de configuração wrangler no raiz:
- `wrangler.json`: main=`cloudflare/worker.ts`, routes=`adeusmulta.defesai.com.br`, vars apenas API_ORIGIN_PRIMARY/FALLBACK
- `wrangler.jsonc`: main=`cloudflare/dist/worker.js`, AI binding, Vectorize, RateLimit, vars incluem SUPABASE_URL, PAGBANK_ENV, PAYMENT_MODE

O `cloudflare-deploy.yml` usa `wrangler.jsonc`, mas o `wrangler.json` ainda está presente e pode causar confusão. Além disso, `wrangler.jsonc` aponta para `cloudflare/dist/worker.js` (arquivo buildado) enquanto `cloudflare/index.ts` exporta de `./worker` (TypeScript).

**Impacto:** Ambiguidade sobre qual configuração é a correta para deploy. Risco de deploy com configuração incorreta.

**Recomendação:** Remover `wrangler.json` (versão antiga) ou renomear para backup. Manter apenas `wrangler.jsonc` como fonte da verdade. Corrigir a referência `main` para apontar para o source TypeScript ou garantir que o build gere `dist/worker.js` corretamente antes do deploy.

---

### MÉDIO-02: Secrets ausentes no GitHub Actions cloudflare-deploy.yml
**Arquivo:linha:** `.github/workflows/cloudflare-deploy.yml:32-37`  
**Descrição:** O workflow injeta apenas `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_MODE`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` via GitHub Secrets. Faltam:
- `SUPABASE_SERVICE_ROLE_KEY` (necessário para o admin client)
- `NVIDIA_API_KEY` (usado por rotas de IA)
- `EVOLUTION_API_KEY` (usado por WhatsApp)
- `PAGBANK_TOKEN` (usado por pagamentos)
- `VENO_CLIENT_ID`, `VENO_CLIENT_SECRET`, `VENO_WEBHOOK_SECRET`

**Impacto:** O Worker em produção falhará ao tentar acessar Supabase com privilégios de admin, processar pagamentos, enviar WhatsApp ou usar IA, pois essas env vars não estarão disponíveis no runtime do Cloudflare.

**Recomendação:** Adicionar todas as variáveis necessárias como GitHub Secrets e injetá-las no `env` do job `build-and-deploy`.

---

### MÉDIO-03: Health check apenas no Cloudflare Worker, ausente no deploy Vercel
**Arquivo:linha:** `cloudflare/worker.js:31-63` (existe) vs `api/index.mjs:1-1264` (não há health check)  
**Descrição:** O endpoint `/api/health` está implementado apenas no Cloudflare Worker (`worker.js`). O build para Vercel (`api/index.mjs`) não tem equivalente. Além disso, `vercel.json` não configura health check path.

**Impacto:** Se o deploy for feito via Vercel, não haverá endpoint de health para o load balancer ou monitoring verificar.

**Recomendação:** Adicionar endpoint `/api/health` ao `api/index.mjs` (Vercel) e configurar health check no `vercel.json`.

---

### MÉDIO-04: SUPABASE_URL hardcoded em wrangler.jsonc vars
**Arquivo:linha:** `wrangler.jsonc:39`  
**Descrição:** `SUPABASE_URL` está definido como `vars` no `wrangler.jsonc` (arquivo versionado no Git).

**Impacto:** Mesmo não sendo um segredo, é configuração de ambiente hardcoded no repositório, dificultando deploys para staging vs produção.

**Recomendação:** Mover `SUPABASE_URL` para secrets do Cloudflare (via `wrangler secret put`) ou GitHub Secrets injetados no workflow.

---

### MÉDIO-05: Deploy gated por mensagem de commit (`[DEPLOY-PRODUCTION]`)
**Arquivo:linha:** `.github/workflows/cloudflare-deploy.yml:50, 104, 108`  
**Descrição:** O build e deploy para produção só ocorrem se a mensagem do commit contiver `[DEPLOY-PRODUCTION]`. Isso é frágil e depende de disciplina humana.

**Impacto:** Esquecer a tag no commit impede o deploy. Colocar a tag por engano dispara deploy não intencional.

**Recomendação:** Usar proteção de branch (GitHub branch protection rules) e trigger de deploy baseado em merge para `main` ou tag de release, não em mensagem de commit.

---

### MÉDIO-06: Nenhum D1, R2, KV ou Durable Objects configurado
**Arquivo:linha:** `wrangler.jsonc:1-47`  
**Descrição:** O `wrangler.jsonc` configura AI, Vectorize e RateLimit, mas não há:
- D1 (banco de dados SQL)
- R2 (armazenamento de objetos)
- KV (key-value store)
- Durable Objects (stateful compute)

O projeto usa Supabase como banco principal, o que é aceitável, mas não há configuração de cache (KV) ou armazenamento de objetos (R2) para ativos estáticos.

**Impacto:** Oportunidade perdida de usar Cloudflare Edge para cache e armazenamento, aumentando latência e custos de saída (egress) do Supabase.

**Recomendação:** Avaliar adição de KV para cache de sessões/tokens e R2 para armazenamento de documentos/mídia.

---

## 🟢 Achados de Severidade BAIXO

### BAIXO-01: Nomenclatura ambígua do arquivo de exemplo de env
**Arquivo:linha:** `.env.example.example`  
**Descrição:** O arquivo se chama `.env.example.example` (dupla extensão `.example`). O `.gitignore` referencia `!.env.example` (sem o duplo), o que significa que o arquivo de exemplo real pode não ser rastreado corretamente.

**Impacto:** Novos desenvolvedores podem não encontrar o arquivo de exemplo correto para copiar.

**Recomendação:** Renomear para `.env.example` e atualizar `.gitignore` conforme necessário.

---

### BAIXO-02: Drift de variáveis entre .env e .env.example.example
**Arquivo:linha:** `.env:1-76` vs `.env.example.example:1-170`  
**Descrição:** Existem variáveis presentes em `.env` que não estão em `.env.example.example` (ex: `SUPABASE_PASSWORD`, `CLOUDFLARE_API_TOKEN`, `NVIDIA_API_KEY_2`, `NVIDIA_API_KEY_3`, `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`, `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `ADMIN_TEST_LOGIN`, `USER_TEST_LOGIN`) e variáveis no exemplo que não estão no `.env` (ex: `PAGBANK_TOKEN`, `PAGBANK_ENV`, `GGPIX_API_KEY`, `META_*`, `DOCUMENSO_*`).

**Impacto:** Novos desenvolvedores não sabem quais variáveis são obrigatórias para produção.

**Recomendação:** Sincronizar os arquivos: todas as variáveis de `.env` devem ter placeholder correspondente em `.env.example.example`, com comentários indicando se são obrigatórias ou opcionais.

---

### BAIXO-03: Build frontend sem configuração de otimização
**Arquivo:linha:** `vite.config.ts:1-32`  
**Descrição:** O `vite.config.ts` não configura:
- `build.rollupOptions.output.manualChunks` para splitting de código
- `build.minify` (terser vs esbuild)
- `build.sourcemap` para produção
- `define` para substituição de variáveis de ambiente

**Impacto:** Bundle pode ser maior que o necessário, impactando tempo de carregamento inicial em produção.

**Recomendation:** Adicionar configurações de otimização de build do Vite para produção.

---

### BAIXO-04: Nenhuma documentação de procedimento de rollback ou runbook
**Arquivo:linha:** `docs/` (nenhum arquivo de runbook de deploy encontrado)  
**Descrição:** Não há documentação em `docs/` sobre procedimentos de rollback, resposta a incidentes, ou runbook de deploy.

**Impacto:** Em caso de incidente, a equipe não tem procedimento documentado para recuperar rapidamente.

**Recomendation:** Criar `docs/deploy-runbook.md` com procedimentos de deploy, rollback, e resposta a incidentes.

---

## 🏗️ Detalhes Técnicos por Área

### CI/CD Pipeline

| Workflow | Trigger | Jobs | Status |
|----------|---------|------|--------|
| `ci-cd.yml` | push develop/main, PR main | test-unit, typecheck, build, production-golden-path | ⚠️ Referência quebrada |
| `cloudflare-deploy.yml` | push main (cloudflare/*, wrangler.jsonc, etc.) | build-and-deploy (11 testes + deploy) | ⚠️ Sem rollback, sem segurança |

**Qualidade gates:** Nenhum definido explicitamente. O `governance-check.cjs` existe (`scripts/governance-check.cjs`) mas não é chamado nos workflows CI.

### Build Frontend

- **Ferramenta:** Vite 6.2.3
- **Plugins:** React, Tailwind CSS v4
- **Output:** `dist/` (já existe no repositório)
- **Proxy:** `/api` → `http://127.0.0.1:8787` (Wrangler local)
- **Env cliente:** VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_MODE, VITE_EVOLUTION_API_URL, VITE_EVOLUTION_API_KEY, VITE_EVOLUTION_INSTANCE_NAME, VITE_EVOLUTION_INSTANCE_TOKEN

### Deploy Backend — Duplo Caminho

| Plataforma | Config | Função principal | Status |
|------------|--------|------------------|--------|
| Vercel | `vercel.json` | `api/index.mjs` (bundle esbuild) | Configurado |
| Cloudflare Workers | `wrangler.jsonc` | `cloudflare/dist/worker.js` (Hono) | Configurado |

### Cloudflare Bindings (wrangler.jsonc)

| Binding | Tipo | Configurado |
|---------|------|-------------|
| AI | Workers AI | ✅ |
| VECTORIZE | Vectorize index | ✅ (`adeusmulta-knowledge`) |
| ANONYMOUS_CASE_LIMITER | Rate limiting | ✅ (10 req/60s) |
| ASSETS | Assets binding | ✅ (`./dist`) |
| D1 | Banco SQL | ❌ Não configurado |
| R2 | Object storage | ❌ Não configurado |
| KV | Key-value | ❌ Não configurado |
| Durable Objects | Stateful compute | ❌ Não configurado |
| Cron | Triggers agendados | ❌ Não configurado |

### Variáveis de Ambiente

| Variável | Em .env | Em .env.example | Em vercel.json | Em wrangler.jsonc | Segredo? |
|----------|---------|-----------------|----------------|-------------------|----------|
| SUPABASE_URL | ✅ Real | ✅ Placeholder | ✅ Hardcoded | ✅ Hardcoded | Não (mas config) |
| SUPABASE_ANON_KEY | ✅ Real | ✅ Placeholder | ❌ | ❌ | Sim (client-side) |
| SUPABASE_SERVICE_ROLE_KEY | ✅ Real | ✅ Placeholder | ❌ | ❌ | ✅ SIM |
| SUPABASE_PASSWORD | ✅ Real | ❌ | ❌ | ❌ | ✅ SIM |
| CLOUDFLARE_API_TOKEN | ✅ Real | ✅ Placeholder | ❌ | ❌ | ✅ SIM |
| NVIDIA_API_KEY x3 | ✅ Real | ✅ Placeholder | ❌ | ❌ | ✅ SIM |
| EVOLUTION_API_KEY | ✅ Real | ✅ Placeholder | ❌ | ❌ | ✅ SIM |
| VITE_EVOLUTION_API_KEY | ✅ Real | ❌ | ❌ | ❌ | ✅ SIM (exposto!) |
| ADMIN_TEST_PASSWORD | ✅ Real | ✅ Placeholder | ❌ | ❌ | Sim |
| FACEBOOK_APP_SECRET | ✅ Real | ✅ Placeholder | ❌ | ❌ | ✅ SIM |

---

## ✅ Checklist de Pré-Deploy

| # | Item | Status | Prioridade |
|---|------|--------|------------|
| 1 | Remover valores reais do `.env` local, manter apenas placeholders | ❌ Pendente | CRÍTICO |
| 2 | Remover `SUPABASE_URL` e `VITE_SUPABASE_URL` do `vercel.json` | ❌ Pendente | CRÍTICO |
| 3 | Remover `SUPABASE_URL` dos `vars` do `wrangler.jsonc` | ❌ Pendente | MÉDIO |
| 4 | Eliminar `VITE_EVOLUTION_API_KEY` e `VITE_EVOLUTION_INSTANCE_TOKEN` da exposição cliente | ❌ Pendente | CRÍTICO |
| 5 | Adicionar security scanning (SAST, dependency audit, secrets scan) ao CI | ❌ Pendente | ALTO |
| 6 | Corrigir referência quebrada a `golden-path-production.yml` | ❌ Pendente | ALTO |
| 7 | Implementar estratégia de rollback (blue-green/canary) | ❌ Pendente | CRÍTICO |
| 8 | Configurar health check no deployment Vercel (`api/index.mjs`) | ❌ Pendente | MÉDIO |
| 9 | Configurar uptime monitoring e alerting para `/api/health` | ❌ Pendente | ALTO |
| 10 | Injetar todos os secrets necessários como GitHub Secrets no cloudflare-deploy.yml | ❌ Pendente | MÉDIO |
| 11 | Remover `wrangler.json` duplicado, manter apenas `wrangler.jsonc` | ❌ Pendente | MÉDIO |
| 12 | Sincronizar `.env` com `.env.example.example` | ❌ Pendente | BAIXO |
| 13 | Renomear `.env.example.example` para `.env.example` | ❌ Pendente | BAIXO |
| 14 | Adicionar otimizações de build Vite (chunk splitting, minify) | ❌ Pendente | BAIXO |
| 15 | Criar runbook de deploy e rollback (`docs/deploy-runbook.md`) | ❌ Pendente | BAIXO |
| 16 | Substituir gate de deploy por mensagem de commit por branch protection | ❌ Pendente | MÉDIO |
| 17 | Adicionar lint (ESLint/Prettier) ao pipeline CI | ❌ Pendente | MÉDIO |

---

## 📦 Arquivos Analisados

| Arquivo | Propósito | Achados Principais |
|---------|-----------|-------------------|
| `.github/workflows/ci-cd.yml` | CI principal | Sem segurança, referência quebrada |
| `.github/workflows/cloudflare-deploy.yml` | Deploy Cloudflare | Sem rollback, secrets ausentes |
| `vite.config.ts` | Build frontend | Sem otimização, proxy local |
| `tsconfig.frontend-check.json` | Typecheck frontend | OK |
| `vercel.json` | Deploy Vercel | Segredos hardcoded, sem health check |
| `wrangler.json` | Config Cloudflare (legado) | Duplicado, contraditório |
| `wrangler.jsonc` | Config Cloudflare (ativo) | Vars hardcoded, sem D1/R2/KV |
| `deploy/wrangler.json` | Config diferente (projeto outro) | Estranho/estray |
| `.env` | Variáveis locais | Segredos reais presentes |
| `.env.example.example` | Exemplo de env | Nomenclatura ambígua, drift |
| `cloudflare/worker.js` | Worker principal | Health check OK, sem monitoramento |
| `cloudflare/supabase.ts` | Bindings Supabase | Interface bem definida |
| `package.json` | Scripts | `lint` = `tsc --noEmit` apenas |
| `.gitignore` | Git ignore | `.env` ignorado corretamente |

---

## 🎯 Conclusão

O projeto DefesAi possui uma base técnica sólida (React 19, TypeScript, Cloudflare Workers, Supabase, Hono, testes automatizados) mas **não está pronto para produção** devido a:

1. **Risco de segurança crítico:** Segredos reais em `.env` local, `VITE_EVOLUTION_API_KEY` exposto ao cliente, valores hardcoded em `vercel.json`
2. **Ausência de resiliência:** Nenhuma estratégia de rollback, nenhum health check no deploy Vercel
3. **Pipeline CI/CD incompleto:** Sem security scanning, sem lint, referência quebrada a workflow inexistente
4. **Falta de observabilidade:** Sem monitoramento de uptime, sem alerting, sem log aggregation

**Recomendação:** Corrigir todos os itens de severidade ALTO e CRÍTICO antes de qualquer tentativa de deploy em produção. Apenas então o projeto poderá atingir veredito PASS.

---

**DevOps Automator**  
Auditoria de Prontidão de Produção — DefesAi  
21 de Outubro de 2026  
*Este relatório é baseado exclusivamente em leitura estática de arquivos locais. Nenhuma infraestrutura de produção foi acessada ou alterada.*
