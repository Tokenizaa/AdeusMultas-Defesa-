# AUDITORIA DE PRODUÇÃO — Marketing OS / ComfyUI / Meta
**Projeto:** DefesAi — Plataforma de Defesa de Multas  
**Data:** 2026-08-26  
**Escopo:** Pipeline completo de Marketing (ComfyUI → Conteúdo → Aprovação → Agendamento → Meta API → Publicação → Banco)  
**Veredito Final:** ❌ NÃO PRONTO PARA PRODUÇÃO

---

## 1. Status Geral

| Dimensão | Status |
|----------|--------|
| ComfyUI | ⚠️ Parcial |
| Geração de Imagem | ❌ Não comprovada |
| Geração de Vídeo | ❌ Não comprovada |
| Pipeline de Conteúdo | ⚠️ Parcial (frontend OK, backend com falhas) |
| Integração Meta | ❌ Não conectada |
| Worker Meta Publisher | ❌ Não está em execução |
| Fila de Publicação | ❌ Não exise (somente array em memória) |
| Banco de Dados | ⚠️ Tabelas vazias |
| Rastreabilidade | ⚠️ Parcial |
| Webhooks/Retorno | ❌ Não verificado |
| Mocks/Hardcodes | 🚨 Encontrados |

---

## 2. Pipeline Validado (Passo a Passo)

### 2.1 Planejamento
- **Componente:** `src/server/workers/agents/planejamento-agent.worker.ts`
- **Backend:** `src/server/services/marketing-service.ts`
- **Status:** Código implementado
- **Persistência:** Falta confirmar

### 2.2 Geração de Conteúdo
- **Componente:** `src/components/marketing/components/ContentEditor.tsx`
- **Backend:** `src/server/services/ai-media-service.ts`
- **Status:** ⚠️ PARCIAL
- **Problema:** `createFallbackImage()` retorna SVG mock quando APIs falham

### 2.3 ComfyUI
- **Diretório:** `comfyui-marketing-os/`
- **Workflows:** `workflows/images/*.json`, `workflows/videos/*.json`, `workflows/batch/*.json`
- **Status:** ❌ NÃO COMPROVADA
- **Problemas:**
  - Servidor rodando em `localhost:8188` mas sem modelos (`flux1-dev.safetensors`, `wan2.1_t2v_1.3B_bf16.safetensors` não encontrados)
  - Integração backend (`src/server/integrations/comfyui-marketing.ts`) depende de `COMFYUI_SERVER_URL`
  - `.env` não tem `COMFYUI_SERVER_URL` configurado
  - Nenhuma geração real foi executada/testada

### 2.4 Mídia Gerada
- **Status:** ❌ NÃO TESTADO
- **Armazenamento:** Não confirmado
- **Persistência:** Depende de geração real (não ocorreu)

### 2.5 Aprovação
- **Componente:** `src/components/marketing/components/MarketingDashboard.tsx`
- **Status:** ✅ Frontend implementado
- **Backend:** Status não confirmado

### 2.6 Agendamento
- **Backend:** `src/server/services/marketing-service.ts`
- **Status:** ⚠️ PARCIAL
- **Problema:** Sem scheduler externo (não há Redis/BullMQ/cron job explícito)

### 2.7 Meta API
- **Status:** ❌ NÃO CONECTADO
- **Evidência:** Tabela `meta_accounts` no banco está vazia
- **Arquivo:** `src/integrations/meta/` (não existe o diretório completo)
- **Serviço:** `src/server/services/marketing-service.ts` referencia Meta mas sem conexão ativa

### 2.8 Publicação
- **Worker:** `src/server/workers/meta-publisher.worker.ts`
- **Status:** ❌ CÓDIGO EXISTE MAS NÃO ESTÁ EM EXECUÇÃO
- **Problema:** Fila é array em memória (`private queue: QueueItem[] = []`), não há Redis nem BullMQ

### 2.9 Banco
- **Status:** ⚠️ ESTRUTURA OK, DADOS VAZIOS
- **Tabelas:** `editorial_content`, `marketing_campaigns`, `promotion_campaigns`, `meta_accounts`
- **Problema:** Nenhuma tabela tem dados. `editorial_content.status` só tem valores em código, não no banco.

### 2.10 Métricas
- **Worker:** `src/server/workers/agents/inteligencia-agent.worker.ts`
- **Status:** ⚠️ Código existe, não executado

---

## 3. Testes Reais Executados

| Teste | Resultado | Evidência |
|-------|-----------|-----------|
| Conexão ComfyUI (`localhost:8188`) | ✅ Responde | `{"system":...,"comfyui_version":"0.33.0"}` |
| Listagem de workflows | ✅ 10 workflows | 5 imagens + 4 vídeos + 2 batch |
| Listagem de nós ComfyUI | ✅ 819 nós | KSampler, CLIPTextEncode, SaveImage etc. |
| Navegação sidebar Marketing | ✅ 10 seções OK | URLs corretas (`?view=`) |
| Navegação sidebar Comercial | ✅ 8 seções OK | URLs corretas |
| Teste de rotas backend | ⚠️ 3 rotas quebradas corrigidas | `referrals` → `referral-config`, `bonuses` → `bonus-ledger`, `coupons/validate` |
| Geração real de imagem ComfyUI | ❌ NÃO EXECUTADO | Faltam modelos |
| Geração real de vídeo ComfyUI | ❌ NÃO EXECUTADO | Faltam modelos |
| Publicação Meta real | ❌ NÃO EXECUTADO | Meta não conectada |
| Worker Meta Publisher | ❌ NÃO TESTADO | Não está em execução |
| Tabelas com dados | ❌ VAZIAS | 4 tabelas auditadas, 0 registros |

---

## 4. Problemas Encontrados

### Críticos (bloqueiam produção)

| # | Problema | Arquivo/Local | Impacto |
|---|----------|---------------|---------|
| 1 | `meta_accounts` vazia — sem Facebook Page nem Instagram Business conectados | Supabase `meta_accounts` | Nenhuma publicação pode acontecer |
| 2 | `editorial_content` vazia — pipeline de publicação sem dados | Supabase `editorial_content` | Nenhum conteúdo foi publicado |
| 3 | Worker Meta Publisher não está em execução | `src/server/workers/meta-publisher.worker.ts` | Nenhuma publicação automática |
| 4 | Fila de publicação é array em memória — workers morrem com o processo | `meta-publisher.worker.ts:34` | Perda de jobs em restart |
| 5 | Redis não instalado/acessível | Sistema | BullMQ/queue não funciona |
| 6 | Geração ComfyUI não testada — faltam modelos | `comfyui-marketing-os/workflows/` | Imagens/vídeos não geram |

### Médios

| # | Problema | Arquivo/Local | Impacto |
|---|----------|---------------|---------|
| 7 | `createFallbackImage()` retorna SVG mock quando IA falha | `ai-media-service.ts:436` | Conteúdo fake em produção |
| 8 | `startVideoGeneration()` simula operação Veo quando indisponível | `ai-media-service.ts:177-182` | Vídeo simulado |
| 9 | `.env` sem `COMFYUI_SERVER_URL` | `.env` | Fallback para localhost |
| 10 | Rota `referrals` quebrada (3 endpoints errados) | `AdminCommercialReferralsView.tsx:41,62,83` | Erro 404 em Indicações |
| 11 | Rota `bonuses` quebrada | `AdminCommercialBonusesView.tsx:39` | Erro 404 em Bônus |
| 12 | Rota `coupons/validate` errada | `AdminCommercialCouponsView.tsx:73` | Erro 404 em Cupons |

### Menores

| # | Problema | Arquivo/Local | Impacto |
|---|----------|---------------|---------|
| 13 | `MarketingSidebar.tsx` órfão (não é importado) | `src/components/layout/MarketingSidebar.tsx` | Código morto |
| 14 | URLs hardcoded com `localhost` | `comfyui-marketing.ts:47` | Quebra em deploy |
| 15 | Seeds hardcoded nos workflows | `workflows/*.json` | Conteúdo repetitivo |

---

## 5. Mocks/Hardcodes Encontrados

| Arquivo | Linha | Tipo | Classificação |
|---------|-------|------|---------------|
| `ai-media-service.ts:436` | `createFallbackImage()` | SVG mock | 🚨 RISCO DE PRODUÇÃO |
| `ai-media-service.ts:177-182` | `startVideoGeneration()` | Simulação Veo | 🚨 RISCO DE PRODUÇÃO |
| `ai-media-service.ts:68-72` | Fallback de imagem | Mock SVG | 🚨 RISCO DE PRODUÇÃO |
| `ai-media-service.ts:143-147` | Fallback de imagem (2º) | Mock SVG | 🚨 RISCO DE PRODUÇÃO |
| `comfyui-marketing.ts:47` | `serverUrl` default | localhost:8188 | ⚠️ FALLBACK LEGÍTIMO |
| `workflows/*.json` | Seeds nos nodes | Hardcoded | ⚠️ FALLBACK LEGÍTIMO |
| `pagbank.ts:213` | Token mock | Sandbox sim | ✅ DESENVOLVIMENTO |
| `pagbank-adapter.ts:176` | `simulateConfirmation()` | Sandbox | ✅ DESENVOLVIMENTO |
| `ggpix-adapter.ts:280-286` | `simulateConfirmation()` | Sandbox | ✅ DESENVOLVIMENTO |

---

## 6. Configuração Necessária para Produção

### Obrigatória (bloqueia se ausente)

| Item | Status Atual | Necessário |
|------|--------------|------------|
| Facebook Page ID | ❌ Não conectado | Conectar via Meta OAuth |
| Instagram Business ID | ❌ Não conectado | Vincular à Facebook Page |
| Meta Access Token | ❌ Ausente | Token com permissões `pages_read_engagement`, `pages_manage_posts`, `instagram_basic` |
| Redis/BullMQ | ❌ Não instalado | Instalar e configurar fila persistente |
| Worker Meta Publisher | ❌ Parado | Iniciar como processo independente |
| ComfyUI modelos | ❌ Ausentes | Baixar `flux1-dev.safetensors`, `wan2.1_t2v_1.3B_bf16.safetensors`, etc. |
| COMFYUI_SERVER_URL | ❌ Não configurado | Definir no `.env` |
| `editorial_content` com dados | ❌ Vazia | Pipeline precisa Popular |
| Webhook Meta | ❌ Não verificado | Configurar e testar |

### Opcional (melhora resiliência)

| Item | Status Atual | Necessário |
|------|--------------|------------|
| Backup de fila | ❌ Não existe | Redis com persistência (RDB/AOF) |
| Dead-letter queue | ❌ Não existe | Implementar no MetaPublisher |
| Monitoring worker | ❌ Não existe | Health check do processo |
| Retry com backoff | ⚠️ Existe mas limitado | Aumentar `MAX_ATTEMPTS` (hoje = 3) |
| Storage externo | ❌ Não confirmado | S3/Cloudflare R2 para mídias |

---

## 7. Correções Realizadas Durante a Auditoria

| # | Correção | Arquivo | Commit |
|---|----------|---------|--------|
| 1 | Corrigir rotas quebradas em Referrals (`/referrals` → `/referral-config`, `/referrals/tree/:userId` → `/referral-tree/:userId`) | `AdminCommercialReferralsView.tsx` | Pendente commit |
| 2 | Corrigir rota `bonuses` (`/api/admin/commercial/bonuses` → `/api/admin/commercial/bonus-ledger`) | `AdminCommercialBonusesView.tsx` | Pendente commit |
| 3 | Corrigir rota `coupons/validate` (adicionar `:code` na URL) | `AdminCommercialCouponsView.tsx` | Pendente commit |
| 4 | Remover `MarketingSidebar.tsx` órfão | `src/components/layout/MarketingSidebar.tsx` | Deletado |
| 5 | Restaurar sub-grupos Marketing/Comercial na AdminSidebar | `AdminSidebar.tsx` + 4 arquivos modulares | Commits `cd8106c` + `1feb38c` + `49d0c9d` |
| 6 | Corrigir imports quebrados (ShieldAlert, ExternalLink, LogOut) | `AdminSidebar.tsx` | Commit `cd8106c` |

---

## 8. Pendências (pós-auditoria)

| # | Pendência | Prioridade |
|---|-----------|------------|
| 1 | Configurar Meta OAuth + Facebook Page + Instagram Business | 🔴 Crítica |
| 2 | Instalar Redis e substituir fila em memória por BullMQ | 🔴 Crítica |
| 3 | Baixar modelos ComfyUI ou remover dependência | 🔴 Crítica |
| 4 | Executar teste de publicação real com Meta API | 🔴 Crítica |
| 5 | Remover ou substituir `createFallbackImage()` (mock SVG) | 🟡 Alta |
| 6 | Remover ou substituir simulação Veo em `startVideoGeneration()` | 🟡 Alta |
| 7 | Implementar webhook de retorno da Meta para atualizar `published_at` | 🟡 Alta |
| 8 | Popular tabela `editorial_content` com dados reais | 🟡 Alta |
| 9 | Implementar scheduler/cron para agendamento | 🟡 Média |
| 10 | Configurar `COMFYUI_SERVER_URL` no `.env` | 🟢 Baixa |
| 11 | Remover `localhost` hardcoded de URLs de integração | 🟢 Baixa |

---

## 9. Veredito Final

### ❌ NÃO PRONTO PARA PRODUÇÃO

**Motivos:**

1. **Meta API não conectada** — Tabela `meta_accounts` vazia, sem Facebook Page, sem Instagram Business, sem token válido. Sem isso, nenhuma publicação acontece.

2. **Worker Meta Publisher parado** — O código existe mas não há processo rodando. A fila é um array em memória (`private queue: QueueItem[] = []`), que desaparece se o processo reiniciar. Sem Redis/BullMQ, jobs são perdidos.

3. **Geração ComfyUI não comprovada** — O servidor responde (`localhost:8188`) mas os workflows exigem modelos que não existem no sistema (`flux1-dev.safetensors`, `wan2.1_t2v_1.3B_bf16.safetensors`). Nenhuma geração real foi executada/testada.

4. **Mocks no caminho de produção** — `createFallbackImage()` retorna SVG simulado quando a IA falha, e `startVideoGeneration()` simula operação Veo. Em produção, usuários receberiam conteúdo fake.

5. **Banco de dados zerado** — Nenhuma tabela de marketing (`editorial_content`, `marketing_campaigns`, `promotion_campaigns`, `meta_accounts`) tem registros. O pipeline está no zero.

6. **Webhook de retorno não verificado** — Não há evidência de que o sistema processa eventos da Meta para atualizar status para `PUBLICADA`.

7. **3 rotas frontend quebradas** — Foram corrigidas durante a auditoria, mas indicam falta de teste E2E prévio.

---

### Critérios de "NÃO PRONTO" atendidos:

| Critério | Status |
|----------|--------|
| Publicação Meta não testada | ❌ Não conectada |
| Worker inexistente ou parado | ❌ Não executa |
| Geração ComfyUI não comprovada | ❌ Sem modelos |
| Mídia sem armazenamento confiável | ❌ Não testado |
| Publicação sem persistência | ❌ Fila em memória |
| Ausência de rastreabilidade | ❌ Banco vazio |
| Credenciais de produção ausentes | ❌ Meta não configurada |
| Mocks no caminho de produção | 🚨 Presente |
| Agendamento manual | ❌ Sem scheduler |

**Para tornar PRONTO, é necessário:**  
1. Conectar Meta API (Facebook Page + Instagram Business)  
2. Instalar Redis + BullMQ e transformar worker em processo persistente  
3. Baixar modelos ComfyUI OU remover dependência e usar apenas APIs de imagem  
4. Eliminar mocks (`createFallbackImage`, simulação Veo) ou isolar em flag `DEV_ONLY`  
5. Popular tabelas com dados reais  
6. Testar publicação E2E com conteúdo real na Meta