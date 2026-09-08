# E2E GOLDEN PATH — ROADMAP DE AUDITORIA E EXECUÇÃO

**Produto:** Adeus Multa  
**Objetivo:** provar uma jornada vertical real, coerente e auditável, do primeiro acesso ao documento final persistido.

## Regra operacional

Uma fase por vez. Cada fase produz evidência, atualiza este documento, faz commit e para. A próxima fase só é liberada após revisão dos auditores.

## Estado atual

- **Fase 0:** 🟡 parcial/histórica; evidência original não recuperável.
- **Fase 1:** 🔴 concluída com bloqueadores.
- **Fase 2:** 🟡 executada parcialmente; bloqueadores estruturais corrigidos, Golden Path ainda bloqueado.
- **Fase 3:** 🔵 próxima fase operacional somente após revisão/liberação.

## FASE 1 — RESULTADO

A auditoria de contratos e data lineage foi executada sobre o `main` reconciliado.

Artefatos:
- `docs/audit/PHASE-1-CONTRACT-LINEAGE-AUDIT.md`
- `docs/audit/E2E-CONTRACT-MAP.md`

### Bloqueadores encontrados

1. `payment_orders` existia com FK para `cases`/`auth.users` e `case_id UNIQUE`, mas possuía **0 registros** no Supabase auditado; o fluxo não comprovava persistência da ordem.
2. `documents` existia, mas sem FK identificada para `cases.id`; o fluxo não comprovava documento persistido.
3. `cases` e `documents` estavam com RLS desabilitado.
4. O adapter de geração transformava qualquer HTTP 200 em `status: 'ready'`.
5. Pagamento confirmado podia ficar sem defesa pronta sem contrato explícito de recuperação.
6. `analysis.id` estava embutido em `cases.analysis_json`, sem vínculo persistente inequívoco com a geração.
7. Claim token tinha geração forte, mas ciclo de vida não comprovado.
8. Havia artefatos históricos apontando para outro projeto Supabase.

## FASE 2 — RESULTADO

**🟡 EXECUTADA PARCIALMENTE — não libera o Golden Path.**

### Aplicado

- RLS de `cases` habilitado com ownership por `auth.uid()`.
- RLS de `documents` habilitado com leitura condicionada ao proprietário do caso.
- FK `documents.case_id → cases.id ON DELETE CASCADE` criada.
- `documents.case_id` tornou-se UNIQUE.
- `documents` recebeu `storage_path`, `document_url`, `content_hash`, `generated_at` e `metadata`.
- Trigger de transição para `aguardando_pagamento` garante criação de `payment_orders` interna vinculada ao caso, usuário e referência, usando a oferta comercial vigente.
- Trigger de transição para `defesa_pronta` garante identidade documental `documents` vinculada ao caso e à ordem de pagamento.
- Funções de trigger foram colocadas no schema `private`, sem execução pública.
- `http-application.ts` deixou de fabricar `status: 'ready'`; só considera `ready` quando há `documentUrl` real.

### Verificação Supabase

Projeto: `sgomwklorpzdwdubtmgg`.

Confirmado após as migrations:
- RLS ativo em `cases`, `documents` e `payment_orders`.
- Políticas de ownership presentes em `cases` e `documents`.
- FK `documents_case_id_fkey` presente.
- Triggers de pagamento/documento habilitados e apontando para funções no schema `private`.
- Bucket Storage privado `documents` existente.
- Nenhum registro sintético foi inserido: `payment_orders=0` e `documents=0` após a verificação.

Migrations aplicadas no Supabase:
- `20260908201604_phase_2_lineage_security_hardening`
- `20260908201619_phase_2_trigger_security_fix`

Artefato:
- `docs/audit/PHASE-2-BLOCKER-CORRECTIONS.md`

### P0 ainda aberto

1. A criação PIX precisa atualizar a ordem interna com os IDs/referência/QR/expiração reais do gateway.
2. A geração precisa fazer upload real do documento ao Storage, persistir hash/path/URL e marcar o documento como `uploaded`/`verified` após confirmação.
3. A geração precisa devolver `document_id` e `documentUrl` somente após persistência real.
4. O webhook precisa sincronizar `payment_orders` de forma idempotente e manter recuperação para `paid` sem documento.

### P1 ainda aberto

5. Versionamento persistente da análise autorizadora.
6. Expiração/revogação/uso único do claim token.
7. Reconciliação definitiva de `/api/onboarding-v2/*`.

## FASES 3–8

Permanecem `🟠 PENDING` até revisão da Fase 2 e posterior liberação.

## REGRA DE PARADA

**Fase 2 encerrada neste ponto. Não executar a Fase 3 automaticamente.**
