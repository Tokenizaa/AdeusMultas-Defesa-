# FASE 0 — AUDITORIA INDEPENDENTE

**Produto:** Adeus Multa  
**Data:** 2026-09-07  
**Escopo:** revisão independente do resultado reportado pelo agente local para a Fase 0 — Mapeamento Forense.

## 🔎 STATUS

# 🟡 AUDITORIA PARCIALMENTE APROVADA — REVISÃO NECESSÁRIA

A Fase 0 foi executada pelo agente local e o resultado reportado é tecnicamente plausível em vários pontos, mas **não pode ser considerada auditada integralmente** porque o commit informado pelo agente (`f29adc0`) não está resolvível no histórico/branch acessível do repositório e o arquivo `docs/audit/E2E-CONTRACT-MAP.md` não está presente no estado atual da branch principal acessível pela auditoria.

O roadmap mestre registra o commit `f29adc0` como resultado da Fase 0, mas isso é uma declaração do agente, não uma evidência independente. O commit posterior `e02b1aa5a7f61c14f130525ac45a7ab762db18ed` apenas registra essa declaração no roadmap. Portanto, **não devemos tratar os 13/10/8/8 números reportados como fatos auditados**.

## 🟢 CONFIRMADO INDEPENDENTEMENTE

### 1. Não existe mais `server.ts` como fonte ativa de execução

A arquitetura atual documentada no commit `73c43c28981518af266411510b4cd117467c8949` registra que `server.ts` foi removido e que o runtime canônico usa `src/server/app.ts`, `src/server/routes/*` e `caseRepository`/`databaseRows`.

### 2. `databaseRows` é atualmente o `caseRepository`

`src/server/app.ts` exporta `databaseRows = caseRepository`.

`src/server/routes/cases.ts` utiliza essa fonte para GET/POST/PUT/claim/generate-defense.

Isso significa que o achado histórico `casesStore ≠ caseRepository` **não deve ser repetido como estado atual sem qualificação**. O problema foi parcialmente resolvido pela remoção do entrypoint legado.

### 3. Existe uma segunda camada de memória dentro do `CaseRepository`

`CaseRepository` mantém `Map<string, CaseRow>` em memória, mas `set()` primeiro persiste no Supabase quando o cliente está configurado e só depois atualiza o Map. O próprio código classifica essa estratégia como write-through/fail-closed.

Portanto, a pergunta correta para a próxima fase não é mais simplesmente "casesStore versus caseRepository", mas:

`persistência Supabase → hidratação/cold start → memória → consumidores de pagamento/documento`.

### 4. Há mapeamento explícito de UUID de domínio para UUID persistido

O repository usa `domainIdToUuid()` para a coluna `cases.id` e mantém `app_ref` para IDs de domínio não-UUID.

Esse contrato precisa ser confrontado com `payment_orders.case_id` e demais consumidores na Fase 1.

### 5. A autenticação real existe e os bypasses estão condicionados a ambiente não produtivo

`authenticateToken()` valida JWT via Supabase quando disponível. Os bypasses locais (`usr_admin_defesai`, `usr_admin_e2e`) são condicionados a `NODE_ENV !== 'production'`.

Isso reduz o risco de um fallback de autenticação chegar diretamente à produção, mas mantém um **risco de ambiente de teste** que precisa ser explicitamente separado do Golden Path real.

### 6. Existe autorização de caso por usuário/admin

`canAccessCase()` exige usuário, permite admin e verifica `row.user_id` contra `user.id` ou email. O claim canônico é `/cases/:id/claim`.

### 7. A geração canônica usa análise/teses e integridade

`src/server/routes/cases.ts` usa `permittedTheses()`, `RagPipeline` e `computeDefenseIntegrityHash()`. A leitura de um documento também valida integridade e autorização das teses.

### 8. O pagamento possui fluxo gateway-agnóstico, mas há uma restrição importante

`POST /api/pagbank/orders` e `/api/pix/create` usam `prodAuth`, e o código exige admin quando o gateway ativo é PagBank. Isso é incompatível com uma jornada simples de cidadão usando PagBank se não houver outro caminho de pagamento adequado.

Essa é uma questão de contrato de produto que deve ser resolvida/confirmada na Fase 1 antes de chamar o fluxo de pagamento de Golden Path.

### 9. O pagamento tem persistência Supabase documentada no histórico recente

O histórico do repositório registra correções para centralização de `payment_orders`, mapeamento UUID, status e leitura do dashboard a partir de Supabase. Isso deve ser confrontado com o código atual durante a Fase 1.

### 10. A geração automática pós-pagamento possui comportamento fail-closed para dados incompletos

`generateDefenseDraftForDomain()` rejeita ausência de qualificação necessária em vez de fabricar CNH, cidade ou CPF. O comentário do código registra explicitamente que o webhook pode confirmar o pagamento sem fabricar uma peça.

Isso é uma decisão de segurança, mas cria exatamente o risco funcional que o Golden Path precisa testar: **pagamento confirmado sem documento**.

## 🔴 GAPS QUE A AUDITORIA CONSIDERA REAIS OU PRIORITÁRIOS

### P0-1 — Evidência da Fase 0 não está auditável no branch acessível

O SHA `f29adc0` informado pelo agente não é resolvível via GitHub e `docs/audit/E2E-CONTRACT-MAP.md` não está presente na branch principal acessível.

**Impacto:** não é possível auditar os 13/10/8/8 itens diretamente.

**Ação:** recuperar/pushar o commit ou documento no histórico correto antes de usar o mapa como baseline formal.

### P0-2 — O Golden Path de pagamento/documento ainda não está provado

O histórico anterior do projeto já registrava que E2E completo dependia de Supabase/gateway externo. O código atual também mostra que o fluxo PagBank possui requisito de admin e que a geração pós-pagamento pode falhar fechadamente por dados incompletos.

**Impacto:** não há base para declarar a jornada cidadão → pagamento → documento como funcional.

### P1-1 — `user_id` possui normalização múltipla

O caso pode comparar `row.user_id` tanto com UUID quanto com email em `canAccessCase()`, enquanto a persistência Supabase só envia `user_id` quando ele é UUID; valores não-UUID podem ser convertidos em `null` no payload.

**Impacto:** potencial divergência entre identidade lógica em memória e ownership persistido.

Isso precisa de teste real de cold start e consulta ao banco.

### P1-2 — `CaseRepository` é dual-engine

Embora diferente do antigo `casesStore`, ainda existe estado em memória sobreposto à persistência Supabase.

**Impacto:** precisamos provar que GET/PUT/payment/generation depois de restart não dependem de memória residual.

### P1-3 — PagBank possui gate administrativo

O código atual explicitamente retorna 403 para usuário não-admin quando o gateway ativo é PagBank.

**Impacto:** isso pode impedir o Golden Path do usuário final dependendo do gateway/fluxo escolhido.

### P1-4 — Sandbox payment auth é diferente da produção

O `prodAuth()` só aplica `authenticateToken` quando `PAYMENT_MODE=production`; em sandbox, a rota de criação pode operar sem autenticação própria. Isso não deve ser confundido com autenticação real do usuário no Golden Path.

### P1-5 — Pagamento confirmado sem documento é um estado permitido pelo código

O código explicitamente mantém o pagamento confirmado quando a geração da defesa falha por falta de dados, em vez de fabricar o documento.

Isso é fail-closed juridicamente, mas precisa existir como estado operacional tratado pela UX.

### P1-6 — Necessário confrontar payment reference com case ID canônico

A criação de ordem utiliza `referenceId: defe...case_<caseId>` e o repository possui mapeamento UUID. A Fase 1 deve provar que o mesmo caso é recuperável a partir do pagamento em todos os caminhos.

## 🟡 ITENS DO RELATÓRIO DO AGENTE QUE NÃO PODEM SER ACEITOS AINDA COMO CONFIRMADOS

Os seguintes itens foram reportados pelo agente local, mas não possuem evidência verificável nesta auditoria:

- dual analysis sources;
- case ID generation como risco concreto;
- user ID inconsistency em toda a jornada;
- optional userId;
- webhook não-bloqueante em execução real;
- claim token previsível;
- TestFillButton exposto;
- race condition;
- paid without document em execução real;
- localStorage de dados sensíveis;
- real PIX;
- real webhook;
- real PDF;
- RLS real;
- concorrência;
- anon → auth → pay → doc completo;
- token renewal;
- rate limiting.

Eles devem entrar na Fase 1 como **hipóteses a confirmar**, não como fatos.

## 📊 DECISÃO DA FASE 0

```text
MAPEAMENTO DECLARADO PELO AGENTE       🟢 EXECUTADO
ARTEFATO RECUPERÁVEL NO GITHUB         🔴 NÃO CONFIRMADO
MAPA AUDITÁVEL INDEPENDENTEMENTE       🔴 NÃO
ARQUITETURA ATUAL PARCIALMENTE CONFIRMADA 🟢 SIM
GOLDEN PATH FUNCIONAL                  ⚫ NÃO VERIFICADO
LIBERAÇÃO AUTOMÁTICA DA FASE 1         🔴 NÃO
```

## 🎯 DECISÃO DOS AUDITORES

**FASE 0: 🟡 CORREÇÃO DE EVIDÊNCIA NECESSÁRIA ANTES DA LIBERAÇÃO FORMAL DA FASE 1.**

Não vamos pedir ao agente para repetir toda a investigação. A estrutura atual do código já permite avançar, mas o artefato `E2E-CONTRACT-MAP.md` precisa estar recuperável/versionado para que o baseline seja auditável.

Depois disso, a Fase 1 deve começar focada nos contratos que realmente importam para a jornada vertical:

```text
USER
 ↓
CASE
 ↓
PERSISTENCE / COLD START
 ↓
ANALYSIS
 ↓
PAYMENT
 ↓
AUTHORIZATION
 ↓
DEFENSE DRAFT
 ↓
DOCUMENT
 ↓
STORAGE
```

**Não executar correções de produto na Fase 1. Primeiro fechar o diagnóstico.**
