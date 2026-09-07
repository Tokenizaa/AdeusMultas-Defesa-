# FASE 4.5 — Auditoria de Retenção e Exclusão de Dados

**Base legal**: LGPD Art. 18 (deletion), Art. 15 (transparency), Art. 16 (conservation), CTB Art. 24–25 (prescription 5 years)
**Regra de auditoria**: `FINALIDADE + BASE LEGAL + NECESSIDADE + EVENTUAL OBRIGAÇÃO → RETENTION`. Informação ausente → `KNOWLEDGE_GAP`.
**Data**: 2025-01-?? / Baseline: `920e571` (FASE 4.4)
**Status**: AUDIT COMPLETE — ação concreta identificada

---

## Resumo Executivo

A auditoria cobriu 18 categorias de dados. **1 problema P0 concreto** identificado: os dados pessoais de signatários (email + nome) ficam retidos permanentemente no campo `envelope_data JSONB` da tabela `documenso_envelopes` mesmo após a solicitação de exclusão LGPD do titular. A exclusão do caso aciona CASCADE no FK `case_id`, apagando o registro do envelope, mas **a anonimização do `envelope_data` não ocorre antes da deleção**, expondo PII de signatários (terceiros, não o próprio titular do caso) até o momento da deleção física do registro.

---

## Metodologia

- **18 categorias auditadas**: cases, auth.users, user_profiles, documenso_envelopes, documenso_recipients, documenso_webhook_events, messaging_contacts, messaging_conversations, messaging_messages, whatsapp-media, lgpd-exports, orders, commissions, payments, marketing_leads, ai-policy, skill-assets, logs/structuredlogger
- **Fluxo de exclusão rastreado**: DELETE /cases/:id → databaseRows.set (anonymization in-memory) → eventBus.publish(CASE_DELETED) → auditLogs
- **Gaps identificados** contra o fluxo: o evento `CASE_DELETED` publicado não possui subscriber (fire-and-forget)

---

## Problemas Identificados

### P0 — `envelope_data JSONB` contém PII de signatários sem anonimização na exclusão

**Onde**: `public.documenso_envelopes` — coluna `envelope_data JSONB`
**Fluxo atual**:
1. `POST /api/documenso/envelopes` → `envelopeRepository.register({ envelopeData: envelope })` (linha 158 de `src/server/routes/documenso.ts`)
2. `envelopeData = envelope` = `EnvelopeResponse` completo da API Documenso, contendo:
   ```typescript
   recipients: EnvelopeRecipient[]  // email: string, name: string
   documents: EnvelopeDocument[]
   fields: EnvelopeField[]
   settings: EnvelopeSettingsResponse
   ```
3. DELETE /cases/:id → `databaseRows.set(id, anonymizedRow)` + `eventBus.publish(CASE_DELETED)`
4. `documenso_envelopes` cascade-deleted via FK `case_id → cases(id) ON DELETE CASCADE`

**Problema**: No passo 3, o `envelope_data JSONB` dos envelopes vinculados ao caso **não é anonimizado**. A cascade delete remove o registro fisicamente, mas:
- Backups do banco criados entre a anonimização do caso e a deleção física contêm `envelope_data` com PII de signatários
- Ambientes de staging/homologação com espelhos do banco retêm os dados
- Não hágarantia de que o momento da anonimização (passo 3) ocorre antes do cleanup de qualquer outro processo

**PII exposto**: `recipients[].email` e `recipients[].name` — nomes e emails dos signatários (advogado, despachante, etc.)
**Fundamento LGPD**: Art. 18 — deletion right covers all personal data; PII of third parties stored locally requires legal basis or deletion
**Ação concreta**: No DELETE handler de cases, antes de publicar `CASE_DELETED`, atualizar `envelope_data` dos envelopes do caso, substituindo `recipients` por `[{ email: undefined, name: '[REMOVIDO]' }]` — anonymize sem destruir a estrutura de auditoria do envelope

**Opção de implementação (escolher menor)**:
- **Opção A (dentro do DELETE handler)**: Adicionar Supabase update de `envelope_data` → `anonymizeEnvelopeData()` nos envelopes do caso antes da cascade. Requer `supabaseAdmin` access no handler.
- **Opção B (subscriber CASE_DELETED)**: Criar subscriber que ouve `CASE_DELETED` e faz update no `envelopeRepository` — mantém separation of concerns, mas requer event system subscription setup.

→ **Recomendado: Opção A** (mudança mínima, local, auditable no próprio handler)

---

### P1 — `whatsapp-media` e `lgpd-exports` sem cleanup ao excluir caso

**Onde**: `storage.buckets` — buckets admin-only sem lifecycle policy vinculada a `cases`
**Fluxo atual**: Uploads de midiaWhatsApp e exports LGPD usam `case_id` no path do objeto (`whatsapp-media/case_xxx/...`, `lgpd-exports/case_xxx/...`). Não há FK entre `storage.objects` e `cases`. Quando caso é anonimizado, os objetos ficam órfãos.
**Retenção atual**: Indefinida — sem TTL configurado
**PII nas mídias**: Possible (print/screenshots de notificações, documentos pessoais)
**Concrete need for automatic cleanup**: NÃO DEMONSTRADA — buckets são admin-only, arquivos órfãos não são expostos a usuarios
**Decisão**: `KNOWLEDGE_GAP` — manter como está, sem implementação de cleanup automático. Cleanup manual acceptable via admin panel se necessário.
**Ação**: Nenhuma implementação necessária neste momento.

---

### P1 — `orders`, `commissions`, `payments` sem FK constraint para `case_id`

**Onde**: `public.orders`, `public.commissions`, `public.payments` — coluna `case_id` sem FK constraint
**Fluxo atual**: Ao excluir caso (LGPD), os registros financeiros ficam órfãos (sem cascade). O `case_id` referencia o caso excluído.
**Pagamentos**: Retenção obrigatória por obrigação fiscal (CTB + legislação tributária) — 5 anos mínimo
**Decisão**: `FINALIDADE + OBRIGAÇÃO LEGAL → RETENTION`. Pagamentos não devem ser deletados. Campos que referenciam o caso (case_id) podem ficar como `case_id = null` após anonimização — MAS: não há mecanismo para setar `case_id = null` nos payments no DELETE handler atual.
**Ação concreta (futuro)**: Adicionar `case_id = null` nos `orders/commissions/payments` ao anonimizar caso — evita referenciar caso deletado sem perder registros financeiros. PRIORIDADE: P1 — implementação recomendável, não urgente.
**Verificar**: Se `case_id = undefined` (null) é permitido na coluna — depende de constraint atual.

---

### P2 — `documenso_webhook_events` sem link para caso, TTL de 30 dias

**Onde**: `public.documenso_webhook_events.payload JSONB`
**O que contém**: `WebhookPayload.payload.recipients[]` com `email + name` (copia local do webhook Documenso)
**Retention**: 30 dias (COMMENT no migration: "Auto-cleanup after 30 days" — sem implementação verificada)
**Link para caso**: Nenhum — `envelope_id TEXT` (Documenso ID, não `case_id`)
**Problema**: Sem cascade de caso; registros órfãos após deletion de envelope. PII de signatários nos webhooks.
**Severidade**: P2 — sem link para caso, TTL curto, alta rotatividade
**Decisão**: `KNOWLEDGE_GAP` — confirmar se pg_cron ou app job implementa o cleanup de 30 dias. Se não implementado, implementar TTL job simples (app-level, mensal). PRIORIDADE: baixa.

---

### P2 — `marketing_leads` com PII mas sem link para casos

**Onde**: `public.marketing_leads` (name, phone, email, address, etc.)
**Link para caso**: Nenhum — leads sãoprospects B2B coletados por scraping (OAB, Google Maps)
**Ciclo de vida**: `opt_out_at` + audience segmentation (B2C/B2B) — lifecycle independente
**Decisão**: For a do escopo FASE 4.5 (casos de clientes). Lifecycle separado.
**Ação**: Nenhuma.

---

## KNOWLEDGE_GAPs Registrados

| #  | Pergunta                                              | Responsável    |
|----|-------------------------------------------------------|----------------|
| KG1| Prazo legal exato de retenção de registros financeiros (CTB + fiscais) — 5 anos é base razoável mas não verificado com advogado | Product Owner |
| KG2| Se o caso é anonimizado (não hard-deleted), `orders/commissions/payments` com `case_id` devem ser setados para null ou mantidos? | Legal/PO |
| KG3| Se Documenso API é chamada com DELETE envelope após anonimização — o Documenso aceita? Qual o comportamento de retention do Documenso? | Dev/Integration |

---

## Status Baseline: 732 testes passando em `920e571`

### Implementação necessária (ação concreta, escopo mínimo)

**P0 — CORRIGIR**: No DELETE handler (`src/server/routes/cases.ts`), antes de publicar `CASE_DELETED`, anonimizar `envelope_data` dos envelopes Documenso do caso.

**Detalhamento técnico**:
1. No DELETE handler, após `databaseRows.set(id, anonymizedRow)`, adicionar:
   - `const envelopes = await envelopeRepository.getByCaseId(caseId)` — método a adicionar em `envelope-repository.ts`
   - `await envelopeRepository.anonymizeEnvelopeData(envelopes)` — método a adicionar que faz `UPDATE documenso_envelopes SET envelope_data = anonymizeEnvelopeData(envelope_data) WHERE id = $1`
2. `anonymizeEnvelopeData()` substitui `recipients[].email` → `undefined`, `recipients[].name` → `'[REMOVIDO]'`, preservando a estrutura do envelope para auditoria
3. Manter o `eventBus.publish(CASE_DELETED)` para permitir subscriber futuro (ex: storage cleanup)

**Proibido neste fase**:
- Criar constants de retenção sem base legal
- Criar scheduler/worker de cleanup sem necessidade demonstrada
- Deletar registros financeiros
- Implementar hard-delete de casos

---

*Auditoria: FASE 4.5 — Retenção/Exclusão*
*Baseline: 920e571 (FASE 4.4 — documenso error log fix)*
*Próximo passo: Implementar anonimização de envelope_data no DELETE handler (P0)*
