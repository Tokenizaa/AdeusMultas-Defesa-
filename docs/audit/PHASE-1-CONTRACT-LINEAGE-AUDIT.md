# FASE 1 — AUDITORIA DE CONTRATOS E DATA LINEAGE

**Data:** 2026-09-08  
**Base Git:** `main` após reconciliação da Fase 0  
**Regra:** diagnóstico somente. Nenhuma correção de produto foi aplicada nesta fase.

## Veredito

**🔴 BLOQUEADA PARA LIBERAÇÃO DO GOLDEN PATH.**

A arquitetura possui uma cadeia coerente em vários pontos, mas a auditoria encontrou lacunas concretas entre `case`, `payment_orders`, `documents`, segurança do banco e o contrato de geração. Portanto a próxima fase deve corrigir os bloqueadores antes da preparação do Golden Path.

## 1. User → Case

**🟡 Parcialmente consistente.**

O frontend canônico usa `useOnboarding()` e mantém `state.caseId`. O backend cria o caso com `case_${crypto.randomUUID()}` e um claim token separado por `crypto.randomBytes(32).toString('hex')`.

Ownership usa UUID do JWT quando presente e o `CaseRepository` grava `user_id` somente quando é UUID canônico.

Não foi encontrado o antigo padrão `claimToken = caseId`. Expiração, revogação e uso único do token não foram comprovados.

## 2. Case → Supabase / cold start

**🟢 Contrato de persistência / 🟡 prova E2E.**

`CaseRepository.set()` faz write-through no Supabase e só atualiza o cache após a persistência. Sem cliente Supabase, o fallback em memória exige explicitamente `ALLOW_IN_MEMORY_CASE_PERSISTENCE=true`.

A leitura persistente tenta `app_ref` e, quando aplicável, UUID. `cases.app_ref` é UNIQUE.

Não foi comprovada uma criação real seguida de recuperação após cold start da Vercel.

## 3. Case → Analysis

**🟡 Embutida, sem entidade independente.**

`CaseAnalysis` possui `id` e `caseId`, mas o schema auditado não possui tabela `analyses`. A persistência ocorre em `cases.analysis_json`.

O endpoint de análise recalcula `RagPipeline.analyzeInfraction()` e persiste o resultado no caso.

Conclusão: `analysis_id` não é entidade relacional independente no modelo atual.

## 4. Analysis → recommendedArguments → Defense

**🟡 Autoridade correta, lineage persistente incompleta.**

`RagPipeline.generateDefenseDraft()` recompõe a análise canônica no servidor. O `DocumentAssemblyEngine`, quando recebe `analysis`, seleciona teses somente de `analysis.recommendedArguments`; `selectedArgumentIds` do caller não substitui a análise.

Isso elimina o bypass identificado anteriormente.

Entretanto, não existe um identificador persistente que ligue inequivocamente a análise exibida à versão exata usada para autorizar o documento. A geração pode recomputar a análise a partir da infração atual.

## 5. Payment → payment_orders → Case

**🔴 Bloqueador de lineage.**

O Supabase real possui `payment_orders` com `case_id` FK → `cases.id`, `user_id` FK → `auth.users.id`, `case_id UNIQUE` e referências de gateway.

O projeto atualmente auditado possui **0 registros em `payment_orders`**. O fluxo de criação PIX analisado demonstra criação no gateway e retorno ao frontend, mas não fornece evidência suficiente de uma persistência correspondente em `payment_orders` antes do sucesso.

O webhook associa o caso por `reference_id`/`referenceId`, porém a consistência webhook → payment order → caso ainda não está comprovada.

## 6. Webhook → Case → Defense

**🟡 Implementado, recuperação incompleta.**

O webhook valida assinatura, extrai a referência, marca pagamento/caso como confirmado e tenta gerar a defesa.

A geração é não-bloqueante: se falhar, o pagamento permanece confirmado. Isso evita documento fabricado, mas deixa um estado possível de pagamento confirmado sem defesa pronta sem contrato explícito de recuperação.

## 7. Document identity → Storage

**🔴 Bloqueador.**

O banco possui `documents(id UUID, case_id UUID, order_id UUID, ...)`, mas não há FK identificada de `documents.case_id` para `cases.id`.

O adapter canônico de geração chama `POST /api/cases/:id/generate-defense` e força `status: 'ready'` no resultado HTTP, sem exigir `documentUrl` ou uma entidade documental persistida.

Não há prova de `document_id` integrado ao lineage do caso nem de storage/URL final persistido.

## 8. RLS / segurança de dados

**🔴 Bloqueador de segurança.**

Consulta direta ao Supabase real atualmente auditado mostrou:

| Tabela | RLS |
|---|---|
| `cases` | DESABILITADO |
| `payment_orders` | HABILITADO |
| `documents` | DESABILITADO |

`cases` e `documents` contêm dados de casos/documentos e estão em schema público. A ausência de RLS é uma lacuna concreta a corrigir antes de considerar o fluxo seguro para exposição via Data API.

## 9. Estado observado no banco

Projeto Supabase auditado: `sgomwklorpzdwdubtmgg`.

| Tabela | Registros |
|---|---:|
| `cases` | 9 |
| `payment_orders` | 0 |
| `documents` | 0 |

Constraints verificadas:
- `cases.app_ref` UNIQUE;
- `payment_orders.case_id` FK → `cases.id` + UNIQUE;
- `payment_orders.user_id` FK → `auth.users.id`;
- `documents.id` PK;
- nenhuma FK identificada de `documents.case_id` → `cases.id`.

## 10. Artefatos históricos incompatíveis

`FASE-1.3-VERIFICACAO.md` e `FASE-1.5-1.7-VERIFICACAO.md` referenciam o Supabase `llmxnpgjpxcvyrqjkfwb`. O projeto atualmente auditado é `sgomwklorpzdwdubtmgg`.

Esses documentos permanecem históricos e não constituem evidência da Fase 1 atual.

## 11. Matriz de lineage

| ID | Origem | Persistência | Destino | Estado |
|---|---|---|---|---|
| `user_id` | JWT Supabase | `cases.user_id` / `payment_orders.user_id` | ownership | 🟡 |
| `case_id` | `createDraft` | `cases.app_ref` + `cases.id` | etapas | 🟡 |
| `analysis_id` | Rule Engine | `cases.analysis_json.id` | defesa | 🟡 |
| `recommendedArguments` | `CaseAnalysis` | `analysis_json` | `DocumentAssemblyEngine` | 🟡 |
| `payment_id` | gateway | `payment_orders.id` pretendido | webhook/caso | 🔴 |
| `reference_id` | servidor/gateway | `payment_orders.reference_id` pretendido | webhook → caso | 🔴 |
| `document_id` | geração | `documents`, mas fluxo não ligado | storage/URL | 🔴 |
| `claim_token` | backend crypto | `cases.claim_token` + sessionStorage | autorização | 🟡 |

## 12. Bloqueadores para a próxima fase

### P0

1. Persistir `payment_orders` de forma comprovável, vinculando `case_id`, `user_id` e `reference_id`.
2. Criar lineage documental real: `document_id` → case → storage/URL, com integridade relacional adequada.
3. Remover o `status: 'ready'` sintético do adapter.
4. Criar recuperação explícita para pagamento confirmado sem documento.
5. Habilitar/configurar RLS para `cases` e `documents`.

### P1

6. Persistir/identificar inequivocamente a versão da análise que autorizou a defesa.
7. Definir expiração, revogação e uso único do claim token.
8. Reconciliar o namespace `/api/onboarding-v2/*` com o namespace canônico.
9. Auditar controles/mocks de teste que possam gerar falso PASS em produção.

## Conclusão

**Fase 1: EXECUTADA.**

**Golden Path: 🔴 BLOQUEADO.**

Nenhuma correção de produto foi aplicada nesta fase. A próxima fase operacional é **FASE 2 — CORREÇÃO DOS BLOQUEADORES**.
