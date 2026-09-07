# FASE 0 — AUDITORIA INDEPENDENTE

**Produto:** Adeus Multa  
**Data:** 2026-09-07  
**Escopo:** revisão independente da Fase 0 e registro das correções emergenciais aplicadas posteriormente.

## 🔎 STATUS

# 🟡 FASE 0 PARCIALMENTE APROVADA — CORREÇÕES EMERGENCIAIS APLICADAS

A Fase 0 foi executada pelo agente local, mas o SHA `f29adc0` reportado por ele não está resolvível na referência GitHub auditada e o mapa original não ficou recuperável nessa referência. Portanto, as contagens declaradas pelo agente não são tratadas como evidência independente.

A auditoria independente confrontou o código atual e identificou contratos que podiam ser corrigidos com segurança imediata, sem esperar a execução do Golden Path.

## 🟢 CORREÇÕES APLICADAS

### 1. Persistência de casos — fallback em memória deixou de ser implícito

`src/server/db/case-repository.ts`

Antes, a ausência de Supabase permitia persistência somente em memória fora de produção. Isso poderia permitir um E2E passar sem provar persistência real.

Agora:

- `ALLOW_IN_MEMORY_CASE_PERSISTENCE=true` é obrigatório para usar o fallback;
- sem Supabase e sem a flag, `set()` falha;
- falha no `loadAllFromSupabase()` não vira silenciosamente `[]`;
- o caminho padrão é fail-closed.

Commit:

`8a1a1cf2b0559e53c7a3e35ca0de86cbc41d30a9`

### 2. Identidade canônica do usuário

`src/server/routes/cases.ts`

Antes, ownership aceitava UUID ou email e a criação podia gravar email como identidade do caso.

Agora:

- criação de caso exige `req.user.id` em formato UUID;
- `domainData.userId` vem exclusivamente do JWT;
- ownership de cidadão compara somente UUID;
- claim usa somente UUID;
- PUT preserva `existingRow.user_id`.

Commit:

`f5d70687f545411d06ac793dc12a7ad6738ea2f3`

### 3. ID de caso não previsível

A criação deixou de usar:

`Date.now() + Math.random()`

para usar:

`crypto.randomUUID()`

Isso remove previsibilidade desnecessária do identificador de aplicação.

Commit:

`f5d70687f545411d06ac793dc12a7ad6738ea2f3`

## 🔴 GAPS AINDA ABERTOS

### P0 — Golden Path real ainda não comprovado

Ainda não existe evidência independente de:

`usuário → case → análise → pagamento → webhook → defesa → documento → storage`

### P1 — Gate administrativo do PagBank

O código ainda exige admin quando o gateway ativo é PagBank. Isso precisa ser resolvido como contrato de produto antes do Golden Path cidadão.

### P1 — Pagamento confirmado sem documento

O webhook mantém o pagamento confirmado se a geração falhar. Isso é fail-closed contra fabricação de documento, mas a UX e o mecanismo de recuperação precisam ser definidos/provados.

### P1 — Claim token

A origem e entropia do `claim_token` ainda não foram confirmadas suficientemente para declarar o risco resolvido.

### P1 — Webhook / payment_orders

Ainda precisa ser comprovada a consistência transacional/idempotente entre evento do gateway, `cases` e `payment_orders`.

### P1 — Análise dual

Ainda precisa ser confrontado se existe mais de uma fonte de verdade para análise/recommended arguments e qual alimenta a geração final.

### P1 — TestFillButton / artefatos de teste

Ainda não foi comprovado se controles de preenchimento de teste estão impossíveis de alcançar em produção.

## 🟡 O QUE AINDA É HIPÓTESE

Continuam sem comprovação independente:

- real PIX;
- real webhook;
- PDF real;
- RLS real;
- concorrência;
- token renewal;
- rate limiting;
- jornada anônima → autenticada → paga → documento;
- persistência após cold start;
- conteúdo final comparado ao input.

## 📊 ESTADO APÓS AS CORREÇÕES

```text
PERSISTÊNCIA REAL OBRIGATÓRIA POR PADRÃO      🟢
IDENTIDADE UUID CANÔNICA                       🟢
OWNERSHIP POR EMAIL COMO FALLBACK              🟢 REMOVIDO
ID DE CASO PREVISÍVEL                          🟢 CORRIGIDO
PAGBANK CIDADÃO                                🔴 ABERTO
PAYMENT → DOCUMENT                             🔴 NÃO PROVADO
CLAIM TOKEN                                    🟡 NÃO AUDITADO
WEBHOOK/PAYMENT_ORDERS                         🟡 NÃO PROVADO
ANALYSIS → DOCUMENT                            🟡 NÃO PROVADO
GOLDEN PATH                                    ⚫ NÃO EXECUTADO
```

## 🎯 DECISÃO DOS AUDITORES

As correções emergenciais foram aplicadas porque eram defeitos suficientemente claros e independentes da execução E2E.

**Isso não libera o Golden Path.**

A próxima etapa continua sendo:

**FASE 1 — AUDITORIA DE CONTRATOS E DATA LINEAGE**

com foco em:

```text
USER
 ↓
CASE
 ↓
SUPABASE / COLD START
 ↓
ANALYSIS
 ↓
PAYMENT
 ↓
WEBHOOK
 ↓
AUTHORIZATION
 ↓
DEFENSE DRAFT
 ↓
DOCUMENT
 ↓
STORAGE
```

Depois da Fase 1, os bloqueadores remanescentes devem ser corrigidos antes da execução do Golden Path.