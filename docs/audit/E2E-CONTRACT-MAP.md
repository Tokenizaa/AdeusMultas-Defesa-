# E2E CONTRACT MAP — ADEUS MULTA

**Estado reconciliado:** `main` — resultado da Fase 1  
**Finalidade:** mapa contratual factual para o Golden Path.  
**Regra:** existência de código não equivale a E2E comprovado.

## FASE 1 — RESULTADO DA AUDITORIA

| ID | Origem | Persistência | Destino | Resultado |
|---|---|---|---|---|
| `user_id` | Supabase JWT | `cases.user_id` / `payment_orders.user_id` | ownership | 🟡 parcial |
| `case_id` | `createDraft` | `cases.app_ref` + `cases.id` | etapas do caso | 🟡 parcial |
| `analysis_id` | Rule Engine | `cases.analysis_json.id` | defesa | 🟡 embutido |
| `recommendedArguments` | `CaseAnalysis` | `analysis_json` | `DocumentAssemblyEngine` | 🟡 server-authoritative, sem vínculo temporal explícito |
| `payment_id` | gateway | `payment_orders.id` pretendido | webhook/caso | 🔴 não comprovado |
| `reference_id` | servidor/gateway | `payment_orders.reference_id` pretendido | webhook → caso | 🔴 não comprovado |
| `document_id` | geração | tabela `documents`, fluxo não ligado | storage/URL | 🔴 não comprovado |
| `claim_token` | `crypto.randomBytes(32)` | `cases.claim_token` + sessionStorage | autorização | 🟡 sem expiração/uso único comprovados |

## ACHADOS CONCRETOS

1. **Case persistence:** `CaseRepository` faz write-through no Supabase; fallback em memória exige flag explícita. Cold start E2E ainda não provado.
2. **Analysis:** não existe tabela `analyses`; a análise é persistida em `cases.analysis_json`, embora contenha `analysis.id` e `caseId`.
3. **Arguments → Document:** `DocumentAssemblyEngine` usa `analysis.recommendedArguments` quando a análise está presente, impedindo que `selectedArgumentIds` do caller substitua a autoridade canônica. Falta identificação persistente da versão exata da análise usada no documento.
4. **Payment:** `payment_orders` possui FK para `cases` e `auth.users`, `case_id UNIQUE` e referências de gateway, mas há **0 registros** no projeto auditado. Não há evidência de persistência da ordem pelo fluxo atual.
5. **Document:** `documents` existe, mas não há FK identificada de `documents.case_id` para `cases.id`; não foi comprovada criação/associação pelo fluxo de geração.
6. **RLS:** `cases` e `documents` estão com RLS desabilitado no Supabase atualmente auditado; `payment_orders` está com RLS habilitado.
7. **Generation adapter:** o adapter HTTP força `status: 'ready'` após resposta HTTP bem-sucedida, sem exigir `documentUrl` ou documento persistido.
8. **Webhook:** assinatura e associação por referência estão implementadas; geração automática é não-bloqueante, permitindo pagamento confirmado sem defesa pronta.
9. **Claim token:** geração atual é server-side com 32 bytes aleatórios em hexadecimal; expiração, revogação e uso único não foram comprovados.
10. **Histórico:** `FASE-1.3-VERIFICACAO.md` e `FASE-1.5-1.7-VERIFICACAO.md` referem outro projeto Supabase (`llmxnpgjpxcvyrqjkfwb`) e não são evidência do ambiente atual (`sgomwklorpzdwdubtmgg`).

## EVIDÊNCIA DE BANCO — 2026-09-08

Projeto: `sgomwklorpzdwdubtmgg`.

| Tabela | Registros | RLS |
|---|---:|---|
| `cases` | 9 | 🔴 desabilitado |
| `payment_orders` | 0 | 🟢 habilitado |
| `documents` | 0 | 🔴 desabilitado |

Constraints relevantes:
- `cases.app_ref` UNIQUE;
- `payment_orders.case_id` FK → `cases.id` + UNIQUE;
- `payment_orders.user_id` FK → `auth.users.id`;
- `documents.id` PK;
- nenhuma FK identificada de `documents.case_id` → `cases.id`.

## DECISÃO

**Golden Path: 🔴 BLOQUEADO.**

**Próxima fase: FASE 2 — CORREÇÃO DOS BLOQUEADORES.**

Nenhuma correção de produto foi aplicada durante a Fase 1.
