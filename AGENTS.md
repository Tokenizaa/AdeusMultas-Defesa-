# Topologia de Agentes — DefesAi

> Gerado automaticamente pelo `@agent-loop` em 2024-08-19

---

## Visão Geral do Projeto

**DefesAi** — Plataforma de defesa de multas de trânsito com:
- Frontend: React 19 + TypeScript + Vite + TailwindCSS
- Backend: Express + TypeScript (server.ts)
- Database: Supabase (PostgreSQL) + Firebase
- Auth: Supabase Auth + Firebase Auth
- Payments: Resend (email) + Stripe (implícito)
- IA: Google GenAI + ComfyUI (marketing)

---

## Agents Disponíveis no Projeto

### Core Agents (Sempre Disponíveis)

| Agent | Papel | Quando Usar |
|-------|-------|-------------|
| `@agent-loop` | Orquestrador global | Qualquer task que precise de loop percepção→decisão→ação→verificação |
| `@supervisor` | Orquestrador universal | Conflitos entre agents, shared kernel, escalação, discovery pipeline |
| `@descoberta` | Discovery pipeline | Projeto novo ou redescoberta completa |
| `@qualidade` | Guardião qualidade | PR review, SOLID, acoplamento, performance, contratos |
| `@seguranca` | Auditoria segurança | OWASP, secrets, SSRF, injection, crypto |
| `@documentacao` | Documentação viva | ADRs, folder-structure, decision-log, roadmap |

### Domain Agents

| Agent | Domínio | Escopo Principal |
|-------|---------|------------------|
| `@backend` | Backend | Rotas Express, serviços, auth, middleware, validação |
| `@frontend` | Frontend | Componentes React, estado, roteamento, estilos |
| `@banco` | Database | Schema Supabase, queries, migrations, índices |
| `@testes` | Qualidade/Testes | Unit, integração, E2E, performance |
| `@build-error-resolver` | Build | Erros TypeScript, build, lint |
| `@refactor-cleaner` | Refatoração | Dead code, duplicatas, dependências não usadas |

### Specialized Agents

| Agent | Especialidade | Gatilhos |
|-------|---------------|----------|
| `@cloudflare` | Cloudflare | Workers, Pages, KV, D1, R2, Durable Objects |
| `@evolution-api` | WhatsApp | Instâncias, mensagens, webhooks, chatbot |
| `@marketing` | Marketing | Estratégia, conteúdo, SEO, ads, email, social |
| `@nvidia` | NVIDIA | RAG, ASR, Nemotron, AI-Q |

---

## Fronteiras e Contratos

### Backend ↔ Frontend
- **Contrato**: REST API via Express (server.ts)
- **Auth**: Supabase JWT + Firebase tokens
- **Dados**: Types compartilhados em `src/types/` (se existir)

### Frontend ↔ Database
- **Cliente**: `@supabase/supabase-js` direto no frontend
- **RLS**: Policies no Supabase controlam acesso
- **Realtime**: Supabase Realtime para updates live

### Backend ↔ Database
- **Admin client**: `supabase-js` com service role
- **Migrations**: `supabase/migrations/` versionadas
- **Triggers/Functions**: PostgreSQL nativo

---

## Fluxos de Trabalho Padrão

### 1. Nova Feature (Padrão)
```
@agent-loop (DISCOVERY)
    ↓
@descoberta (se projeto novo)
    ↓
@agent-loop (PLANNING) → define objetivo, escopo, agent inicial
    ↓
@backend / @frontend / @banco (EXECUTION)
    ↓
@testes (VERIFICATION)
    ↓
@qualidade (REVIEW)
    ↓
@agent-loop (DECISION) → DONE ou REPLAN
```

### 2. Bug Fix
```
@agent-loop (DISCOVERY)
    ↓
@build-error-resolver (se erro build/TS)
    ↓
@backend ou @frontend (EXECUTION)
    ↓
@testes (VERIFICATION)
    ↓
@agent-loop (DECISION)
```

### 3. Refatoração
```
@agent-loop (DISCOVERY)
    ↓
@refactor-cleaner (análise: knip, depcheck, ts-prune)
    ↓
@backend/@frontend (EXECUTION - mudanças seguras)
    ↓
@testes (VERIFICATION - regression check)
    ↓
@qualidade (REVIEW)
    ↓
@agent-loop (DECISION)
```

### 4. Feature Cross-Domínio (com @supervisor)
```
@supervisor (recebe demanda)
    ↓
@agent-loop (cria máquina de estados)
    ↓
@backend + @frontend + @banco (paralelo via task tool)
    ↓
@testes (integração)
    ↓
@qualidade (contratos)
    ↓
@supervisor (aprova final)
```

---

## Escopo Padrão por Agent

### @backend
- **Permitido**: `src/server.ts`, `src/routes/**`, `src/services/**`, `src/middleware/**`, `src/validators/**`
- **Proibido**: `src/components/**`, `src/pages/**`, `supabase/migrations/**` (exceto leitura)

### @frontend
- **Permitido**: `src/components/**`, `src/pages/**`, `src/hooks/**`, `src/context/**`, `src/styles/**`
- **Proibido**: `src/server.ts`, `src/routes/**`, `src/services/**`, `supabase/migrations/**`

### @banco
- **Permitido**: `supabase/migrations/**`, `supabase/functions/**`, `src/lib/supabase.ts`
- **Proibido**: `src/components/**`, `src/routes/**`, `src/server.ts`

### @testes
- **Permitido**: `tests/**`, `*.test.ts`, `*.spec.ts`, `playwright.config.ts`
- **Proibido**: Código de produção (apenas leitura)

---

## Configuração Global

```json
{
  "project": "DefesAi",
  "root": "/home/lg/workspace/projects/DefesAi_AdeusMultas",
  "loop": {
    "max_attempts": 3,
    "auto_commit": true,
    "require_quality_gate": true,
    "learning_enabled": true
  },
  "agents": {
    "default_start_agent": "qualidade",
    "parallel_execution": true
  }
}
```

---

## Comandos Úteis

```bash
# Ver estado atual
cat .agent-loop/state.json

# Inicializar loop para task
loop:run "Descrição da task" --objective "Critério mensurável" --desired-state "Estado alvo" --agent backend

# Verificar gates
loop:gates

# Forçar replan
loop:replan --reason "Mudança de requisitos"

# Escalar para supervisor
loop:escalate --reason "Bloqueio arquitetural"
```

---

## Legacy Pipeline Agents (agents/)

> **⚠️ NÃO USADOS PELO RUNTIME.** Decisão arquitetural: [ADR-008](docs/adr/ADR-008-Agent-Topology-Unification.md).

O diretório `agents/` na raiz contém o **scaffold morto do antigo pipeline de agents** (sistema A):
- Definições `.md` + implementações `.ts` parciais: `base-agent`, `case-agent`, `ai-analysis-agent`, `document-agent`, `communication-agent`, `crm-agent`, `knowledge-agent`, `automation-agent`, `admin-agent`, `infrastructure-agent`, `marketing-agent`, `payment-agent` e subdiretórios (`legal/`, `document/`, `ocr/`, `quality/`, `product/`, `marketing-platform/`, `pipeline/`).

**Por que é legacy:**
- Excluído do `tsconfig.json` (commit `57253b9`)
- Zero imports de `src/` (`rg "agents/" src/` → 0 matches)
- 31 erros TypeScript; depende de `CaseContext` que nunca existiu ([ADR-005](docs/adr/ADR-005-Missing-Agent-Implementations.md))

**Regras:**
1. Nenhum código novo importa de `agents/`.
2. Nenhum recurso novo é criado lá.
3. Deletar, migrar ou ressuscitar conteúdo de `agents/` exige um ADR novo.

**Fonte canônica da topologia de agents = este AGENTS.md** (sistema B, orquestrado por `@agent-loop`).

---

## Próximos Passos Recomendados

1. **Validar funcionamento**: Rodar um ciclo de teste simples
2. **Criar primeira task real**: Ex: "Corrigir onboarding etapa 3"
3. **Configurar @supervisor**: Se precisar de orquestração cross-domínio
4. **Ativar learning loop**: Para capturar padrões do projeto

---

*Este arquivo é mantido automaticamente pelo `@agent-loop` e `@documentacao`. Não edite manualmente — use os comandos do loop.*