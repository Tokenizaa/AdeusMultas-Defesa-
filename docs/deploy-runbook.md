# Runbook de Deploy — DefesAi

**Status**: obrigatório para todo deploy em produção e homologação.
**Projeto**: DefesAi (AdeusMultas-Defesa-)
**Branch canônica**: `main`
**Última revisão**: 2026-10-21

> Este runbook é um documento operacional. Não modifica código de produção. Qualquer alteração neste arquivo deve ser revisada pelo time de documentação (@documentacao) antes de entrar em vigor.

---

## 1. Visão geral

O deploy do DefesAi segue a ordem:

1. **Banco de dados (Supabase)** — migrações primeiro
2. **Backend** — worker Cloudflare / API Express
3. **Frontend** — build e publicação dos assets estáticos

**Não inverte a ordem.** O frontend depende de variáveis e rotas do backend; o backend depende do esquema do banco estar atualizado. Executar backend antes das migrações pode causar falhas de `column does not exist` / `relation does not exist` em runtime.

---

## 2. Quem autoriza o deploy

| Função | Responsabilidade | Pode autorizar deploy em |
|--------|------------------|--------------------------|
| Tech Lead / Engenheiro responsável pela release | Aprova o conteúdo do release e o momento do deploy | Produção e homologação |
| Product Owner | Confirma que o escopo da release está alinhado com o negócio | Produção (após aprovação do Tech Lead) |
| Engenheiro de plantão (on-call) | Executa o deploy e responde por incidentes | Homologação; produção apenas com autorização do Tech Lead |

**Regra**: nenhum deploy em produção é executado sem aprovação explícita do Tech Lead (ou seu substituto designado), registrada no canal de operações do time (Slack/Teams) com timestamp.

---

## 3. Variáveis de ambiente obrigatórias

As variáveis estão definidas em `.env.example.example` (modelo) e devem ser preenchidas com valores reais em cada ambiente. Nunca commite valores reais de segredos.

### 3.1 Variáveis obrigatórias — todos os ambientes

| Variável | Ambiente | Descrição | Exemplo |
|----------|----------|-----------|---------|
| `SUPABASE_URL` | todos | URL do projeto Supabase | `https://xxxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | todos | Chave pública/anônima do Supabase (cliente) | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | todos | Chave de serviço (backend/admin) — **segredo** | `eyJ...` |
| `SUPABASE_ACCESS_TOKEN` | todos | Token de acesso para CLI/gerenciamento Supabase | `sbp_...` |
| `VITE_SUPABASE_URL` | frontend | URL Supabase exposta ao frontend (Vite) | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | frontend | Chave anônima exposta ao frontend | `eyJ...` |
| `CLOUDFLARE_ACCOUNT_ID` | deploy | ID da conta Cloudflare para `wrangler deploy` | `...` |
| `CLOUDFLARE_API_TOKEN` | deploy | Token da Cloudflare com permissão de Workers | `...` |
| `VITE_API_MODE` | frontend | Modo de chamada da API (`real` em produção) | `real` |
| `EVOLUTION_API_URL` | backend | URL da Evolution API (WhatsApp) | `http://localhost:8080` ou URL pública |
| `EVOLUTION_API_KEY` | backend | Chave da Evolution API — **segredo** | `...` |
| `EVOLUTION_INSTANCE_NAME` | backend | Nome exato da instância WhatsApp | `Defesai` |
| `NVIDIA_API_KEY` (1, 2, 3) | backend | Chaves da NVIDIA NV-Embed-QA (round-robin) — **segredo** | `nvapi-...` |
| `NINEROUTER_KEY` | backend | Chave do 9Router (IA) — **segredo** | `...` |
| `NINEROUTER_URL` | backend | URL base do 9Router | `https://api.9router.com` |
| `DOCUMENSO_API_TOKEN` | backend | Token da Documenso (assinatura digital) — **segredo** | `...` |
| `DOCUMENSO_WEBHOOK_SECRET` | backend | Segredo HMAC do webhook Documenso — **segredo** | `...` |

### 3.2 Variáveis por ambiente

| Variável | Produção | Homologação |
|----------|----------|-------------|
| `SUPABASE_URL` | Projeto produção | Projeto homologação |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave produção | Chave homologação |
| `EVOLUTION_API_URL` | URL pública da Evolution | URL de homologação / localhost |
| `EVOLUTION_INSTANCE_NAME` | `Defesai` | Instância de homologação |
| `PAGBANK_ENV` *(descontinuada — migrou para VenoPag)* | `production` | `sandbox` |
| `VITE_API_MODE` | `real` | `real` ou `mock` |
| `MEDIA_LOCAL_ENABLED` | `false` | `false` (ou `true` apenas com GPU) |
| `MEDIA_REMOTE_ENABLED` | `true` | `true` |

> **Nota sobre pagamentos**: conforme o commit `47d079a`, o gateway PagBank/GGPIXAPI foi descontinuado e migrado para **VenoPag**. Confirme as variáveis de VenoPag/Stripe com o time de pagamentos antes de qualquer deploy que toque fluxos de cobrança. Não há variáveis `VENOPAG_*` ou `STRIPE_*` no modelo `.env.example.example` atual — solicite-as ao time de `@pagamentos-comercial` se necessário.

### 3.3 Como aplicar as variáveis

**Backend (Cloudflare Workers / wrangler):**
```bash
# Autenticar na Cloudflare (uma vez por máquina)
npx wrangler login

# Listar variáveis atuais do worker
npx wrangler secret list --name tokenizaa-defesa-f-cil

# Definir um segredo (exemplo)
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --name tokenizaa-defesa-f-cil
# digite o valor quando solicitado

# Definir variáveis não-secretas (se houver wrangler.toml/vars)
npx wrangler variable put VITE_API_MODE real --name tokenizaa-defesa-f-cil
```

**Frontend (Vite):**
```bash
# Criar .env de produção a partir do modelo
cp .env.example.example .env.production
# Editar .env.production com os valores reais de produção

# Build
npm run build
# Os assets ficam em dist/ (referenciado em deploy/wrangler.json)
```

**Supabase (migrations):**
```bash
npx supabase db push --project-ref <PROJECT_ID>
# ou, se usando CLI vinculado:
npx supabase migration up
```

---

## 4. Ordem de deploy (passo a passo)

### Etapa 0 — Pré-requisitos (antes de qualquer deploy)

```bash
# 1. Confirmar que está na branch main e atualizada
git branch --show-current        # deve retornar main
git pull --ff-only origin main

# 2. Confirmar que não há alterações locais não commitadas
git status --short               # deve estar limpo (exceto arquivos ?? não rastreados)

# 3. Verificar tipo de release (patch / minor / major)
git log -1 --oneline             # commit base: 47d079a

# 4. Obter autorização do Tech Lead (registre no canal de operações)
```

### Etapa 1 — Banco de dados (migrações primeiro)

```bash
# 1. Fazer backup do banco antes de migrar (produção)
# Via dashboard Supabase → Settings → Backup → "Take new backup"
# Ou via CLI:
npx supabase db push --project-ref <PROJETO_PRODUCAO>

# 2. Executar migrações pendentes
npx supabase migration up --project-ref <PROJETO_PRODUCAO>

# 3. Verificar se as migrações aplicaram sem erro
npx supabase migration list --project-ref <PROJETO_PRODUCAO>
```

**Critério de sucesso**: todas as migrações aplicadas com status `applied`, sem erros de SQL.

### Etapa 2 — Backend

```bash
# 1. Build/verificação de TypeScript (se aplicável)
npx tsc --noEmit                 # deve retornar 0 erros (exceto agents/, excluído)

# 2. Definir/atualizar segredos no Cloudflare Workers
npx wrangler secret put <VAR> --name tokenizaa-defesa-f-cil

# 3. Fazer deploy do worker
npx wrangler deploy --name tokenizaa-defesa-f-cil

# 4. Verificar a URL do deploy retornada pelo wrangler
```

### Etapa 3 — Frontend

```bash
# 1. Instalar dependências (se necessário)
npm ci

# 2. Build de produção
npm run build                    # gera dist/

# 3. Publicar assets (via wrangler / CDN configurado em deploy/wrangler.json)
# Os assets são servidos a partir de dist/ pelo worker Cloudflare
# Verificar rotas: multa.emprestamais.shop/* (zona emprestamais.shop)
```

---

## 5. Health check pós-deploy

Após cada etapa, verificar os seguintes endpoints. O deploy só é considerado bem-sucedido se **todos** os checks passarem.

### 5.1 Endpoints a verificar

| Endpoint | Método | O que esperar | Ambiente |
|----------|--------|---------------|----------|
| `GET /health` | GET | `200 OK`, corpo `"DefesAI Worker"` ou JSON saudável | Backend |
| `GET /api/admin/overview` | GET | `200 OK`, JSON com status dos serviços (supabase_db, pagbank, meta, ocr, nvidia, 9router) | Backend (admin) |
| `GET /api/health` | GET | `200 OK` (se existir) | Backend |
| `GET /` (frontend) | GET | `200 OK`, HTML carrega sem erros de console | Frontend |
| `GET /api/cases/:id` (exemplo existente) | GET | `200 OK` ou `401` se sem auth (não `500`) | Backend |

Exemplo de verificação via curl:
```bash
# Backend health
curl -s -o /dev/null -w "%{http_code}\n" https://multa.emprestamais.shop/api/agents/health
# ou ajuste o caminho conforme a rota real exposta

# Admin overview (requer auth se aplicável)
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer <TOKEN>" \
  https://multa.emprestamais.shop/api/admin/overview

# Frontend
curl -s -o /dev/null -w "%{http_code}\n" https://www.mult
```

> Ajuste os caminhos conforme as rotas efetivamente expostas em `src/server/routes/`. O endpoint público `/health` está definido em `src/server/routes/agents.ts`.

### 5.2 O que considerar "deploy bem-sucedido"

- [ ] Todas as migrações aplicadas no Supabase (etapa 1)
- [ ] `wrangler deploy` concluído com sucesso e URL ativa (etapa 2)
- [ ] `GET /health` retorna `200`
- [ ] `GET /api/admin/overview` retorna `200` e serviços críticos (`supabase_db`, `nvidia`, `9router`) estão `HEALTHY`
- [ ] Frontend carrega em `200` e não há erros de build
- [ ] Nenhum alerta novo no PagerDuty/Slack nos 15 minutos após o deploy

Se qualquer item falhar, **não prossiga para a próxima etapa**. Vá para a seção de rollback.

---

## 6. Rollback (se o deploy falhar)

### 6.1 Quando fazer rollback

- Erro de build ou `wrangler deploy` falhou
- `GET /health` retorna `500` ou não responde após 5 minutos
- Serviços críticos (`supabase_db`, `nvidia`, `9router`) reportam `UNHEALTHY` no admin overview
- Aumento anômalo de erros 5xx no Cloudflare / logs
- Regressão funcional reportada por usuários imediatamente após o deploy

### 6.2 Procedimento de rollback por camada

**Backend (Cloudflare Workers):**
```bash
# Listar implantações anteriores
npx wrangler deployments list --name tokenizaa-defesa-f-cil

# Promover uma implantação anterior (rollback)
npx wrangler rollback <deployment_id> --name tokenizaa-defesa-f-cil
```

**Frontend:**
```bash
# Reverter o build anterior (se versionado)
# Se não houver versionamento de assets, fazer deploy do commit anterior:
git revert <commit-do-deploy-falho>
npm run build
# republicar dist/
```

**Banco de dados (migrações):**
```bash
# ⚠️ Nunca reverter migrações aplicadas em produção sem avaliar impacto em dados.
# Se uma migração causou problema, criar uma nova migração de correção
# em vez de rollback da migração anterior.
npx supabase migration new corrigir-problema
# Editar o arquivo gerado e aplicar:
npx supabase db push --project-ref <PROJETO_PRODUCAO>
```

### 6.3 Após o rollback

1. Reexecutar os health checks da seção 5.
2. Abrir um incidente (ver `docs/incident-runbook.md`) se o rollback não restaurar o serviço.
3. Registrar o rollback no canal de operações com timestamp e motivo.
4. Agendar uma revisão pós-mortem (ver seção 8 do runbook de incidente).

---

## 7. Checklist de deploy (cópia para colar no canal de operações)

```
[ ] Etapa 0 — branch main, sem alterações locais, autorização do Tech Lead
[ ] Etapa 1 — backup Supabase feito; migrações aplicadas (listagem verificada)
[ ] Etapa 2 — wrangler deploy concluído; segredos atualizados se necessário
[ ] Etapa 3 — build frontend ok; assets publicados
[ ] Health check — GET /health = 200
[ ] Health check — GET /api/admin/overview = 200; serviços críticos HEALTHY
[ ] Frontend — carregamento em 200, sem erros de console
[ ] Deploy marcado como bem-sucedido no canal de operações
```

---

## 8. Contatos relacionados ao deploy

- Tech Lead / responsável pela release: [preencher]
- Engenheiro de plantão (on-call): [preencher]
- Supabase (infra de banco): dashboard Supabase + suporte do plano contratado
- Cloudflare (Workers / DNS): dashboard Cloudflare + suporte Cloudflare

---

*Fim do runbook. Mantenha este documento atualizado sempre que a arquitetura de deploy mudar.*