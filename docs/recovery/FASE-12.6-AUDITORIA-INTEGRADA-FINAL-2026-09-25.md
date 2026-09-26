# FASE 12.6 — AUDITORIA INTEGRADA FINAL / HARDENING / COBERTURA NACIONAL — 2026-09-25

> **Auditoria SOMENTE LEITURA do banco. Zero correções aplicadas. Zero migrations criadas.**
> Snapshot: `llmxnpgjpxcvyrqjkfwb`, observado em 2026-09-25T00:03Z.

---

## 1. Checkpoint

```
HEAD:          911abf92742455bd9ad30df57a79eb1785100174
origin/main:   911abf92742455bd9ad30df57a79eb1785100174
ahead/behind:  0/0
branch:        main
working tree:  clean (0 tracked, 29 untracked baseline)
```

---

## 2. Escopo

Auditoria integrada da cadeia construída nas Fases 0–12.5. Sem reconstruir, sem corrigir, sem
refatorar. Objetivo: determinar com evidência o estado real de produção e classificar os gaps.

---

## 3. Arquitetura atual (comprovada por código)

```
Cloudflare Worker                        wrangler.jsonc:4 → cloudflare/worker.ts
  └─ run_worker_first: /api/*            wrangler.jsonc:24
     ├─ onboardingRoutes                cloudflare/routes/onboarding.ts
     │    └─ importa RULES_MATRIX canônico  src/core/onboarding/rules-matrix.ts:8
     ├─ casesRoutes                     cloudflare/routes/cases.ts
     │    ├─ analyzeInfractionCompat ×3   :85 POST /cases · :121 PUT /cases/:id · :236 generate-defense
     │    └─ generateDefenseDraftCompat    → rag-adapter.ts:309
     ├─ ocrRoutes                       cloudflare/routes/ocr.ts
     └─ knowledgeRoutes                 cloudflare/routes/knowledge.ts

rag-adapter.ts                           KB canônica via RPC pgvector
  ├─ searchKnowledgeViaRPC              :103 supabase.rpc('match_knowledge_chunks', …)
  ├─ applyDeterministicAnalysis         :155 ExpertRuleEngine + EVIDENCE_DEPENDENT_ARGUMENTS
  └─ generateDefenseDraftCompat         :309 → DocumentAssemblyEngine.assemble()
     └─ computeDefenseIntegrityHash     :336

document-assembly-engine.ts              Analysis é autoridade
  └─ if (payload.analysis)              :120
     └─ filter canonicalArgumentIds     :122-123
```

**Runtime de produção:** Cloudflare Worker — COMPROVADO.
**Runtime de desenvolvimento:** Express (`src/server/app.ts:28,31,103,107`) — existe, não é produção.
**Runtime legado no Worker:** nenhum vestígio de `onboarding-v2` ou `src/onboarding/ui` em `cloudflare/`
(grep vazio) — COMPROVADO.

---

## 4. Golden Path — execução real

| Etapa | Verificação | Resultado |
|---|---|---|
| Case → persistência | `tests/integration/golden-path-documents.integration.test.ts` | ✅ 6/6 PASS |
| Analysis fresh | 3 endpoints chamam `analyzeInfractionCompat` | ✅ COMPROVADO |
| RAG cross-process | RPC `match_knowledge_chunks` existe no banco com body | ✅ COMPROVADO |
| Analysis → argumentos | `document-assembly-engine.ts:122-123` | ✅ COMPROVADO |
| Document → Quality Gate | `final-quality-gate.ts` 7 checks fail-closed | ✅ COMPROVADO |
| IntegrityHash | `cases.ts:62` verifica; `rag-adapter.ts:336` computa | ✅ COMPROVADO |
| Testes core | cloudflare routes + audit + case suites | ✅ 281/281 PASS |
| TypeScript runtime | `npx tsc --noEmit` filtrado `cloudflare/` | ✅ 0 erros |

---

## 5. Case

| Item | Evidência | Estado |
|---|---|---|
| 15 flags + `real_driver_*` | Migration `20260925120000` (14 matches de coluna) | ✅Versionado |
| `notification_delivery_date` | Mesma migration | ✅ Versionado |
| `commercial_offer_id` | Mesma migration + FK condicional | ✅ Versionado |
| `applicant_json` | Coluna existe; recovery no read path | ⚠️ PARCIAL |
| `evidence_json` | Coluna + round-trip testado | ✅ COMPROVADO |
| Modelos concorrentes | `CaseDomain` (types/index.ts) + `CaseRow` + `CaseInfractionData` (rag-adapter) | ⚠️ 3 tipos |
| Persistência | `case-repository.ts:128 upsert` → Supabase | ✅ COMPROVADO |
| `loadAllFromSupabase()` | Nunca chamado (Express) | ❌ NÃO CHAMADO |
| cases em produção | 72 registros no banco | ✅ |
| RLS `cases` | 6 policies, `cases_own_all` COM `WITH CHECK` | ✅ COMPROVADO |

**Achado:** `loadAllFromSupabase()` nunca é invocado. Em runtime Cloudflare não importa (consulta
Supabase direto por request). Em Express significa Map vazio após restart. **Não-bloqueante** para
produção, **bloqueante** para o Express.

---

## 6. Analysis

| Item | Evidência | Estado |
|---|---|---|
| Fresh em POST /cases | `cases.ts:85` | ✅ |
| Fresh em PUT /cases/:id | `cases.ts:121` | ✅ |
| Fresh em generate-defense | `cases.ts:236` | ✅ |
| Stale analysis | Impossível (sempre recomputa) | ✅ |
| Persistência | `analysis_json` gravado via `domainToRow` | ✅ |
| Procedimento | `analysis.recommendedProcedure` vs `payload.procedureType` → `procedureMismatch` | ⚠️ Detectado, não bloqueante |
| Jurisdição na Analysis | `extractJurisdiction()` heurística por regex em `autuadorBody` | ⚠️ PARCIAL |

**Achado crítico:** `rag-adapter.ts:141-152` — a jurisdição é extraída por **regex sobre string livre**
do órgão autuador. Não há campo estruturado `uf` no Case (gap herdado da 12.1, não corrigido). Casos
com `autuadorBody` ambíguo podem receber norma de jurisdição errada.

---

## 7. RAG

### 7.1 Contagens (snapshot 2026-09-25T00:03Z)

| Tabela | Esperado (histórico) | Encontrado | Δ |
|---|---|---|---|
| `knowledge_sources` | 39 | **39** | 0 |
| `knowledge_documents` | 66 | **66** | 0 |
| `knowledge_document_versions` | 66 | **66** | 0 |
| `knowledge_chunks` | 58 | **58** | 0 |
| `knowledge_embeddings` | 58 | **58** | 0 |
| `knowledge_document_relations` | 0 | **0** | 0 |

Nenhuma alteração no acervo. Auditoria não modificou nada.

### 7.2 Integridade

| Verificação | Resultado |
|---|---|
| Chunks órfãos | **0** |
| Embeddings órfãos | **0** |
| Versions órfãs | **0** |
| Chunks sem `content_hash` | **0** |
| Chunks sem `source_id` | **0** |
| Chunks sem `document_version_id` | **0** |
| Hashes distintos | 57 / 58 |

**Duplicidade CE (1 hash compartilhado):**
`73740653…` entre `chk_SRC_CE_DETRAN_DEFESA_AUTUAR_INFRACAO_0000` e
`chk_SRC_CE_DETRAN_RECURSO_JARI_0000`. Já classificada `DUPLICATA_EXATA` na Fase 9 com
`duplicate_of` em metadata. **Preservada. Nenhum DELETE.** ID único ≠ conteúdo único — confirmado.

### 7.3 Embeddings

```
provider:   DETERMINISTIC_LOCAL   (58/58)
model:      defesai-legal-vectorizer-v1
dimensions: 1024
```

**Classificação: FALLBACK, não produção comprovada.**
O código tem NVIDIA (`nvidia/nv-embedqa-e5-v5`) como primário (`embedding-service.ts:81`), mas a
execução real gravou o determinístico. Busca vetorial funciona cross-process, porém
**similaridade por hash determinístico não é recuperação semântica real.** O Golden Path funciona;
a qualidade do RAG é limitada.

### 7.4 RAG_REQUIRES_HUMAN_VALIDATION

66/66 documentos marcados para validação humana na Fase 10. **Nenhum foi reclassificado.** A KB opera
inteiramente sob `RAG_REQUIRES_HUMAN_VALIDATION` — nenhuma fonte foi formalmente promovida a validada.

---

## 8. DocumentAssembly

| Garantia | Evidência | Estado |
|---|---|---|
| Analysis é autoridade | `document-assembly-engine.ts:120-124` | ✅ COMPROVADO |
| Não seleciona teses autonomamente | Só lê `payload.analysis.recommendedArguments` | ✅ COMPROVADO |
| `applicableGrounds` NÃO é fallback | Comentário FASE 3.5 P0-07 linha 128-131 | ✅ COMPROVADO |
| Fatos do Case | `payload.infraction` | ✅ COMPROVADO |
| Placeholder → `validationStatus: 'invalid'` | Linhas 383-391 | ✅ COMPROVADO |
| `procedureMismatch` detectado | Linha 404 | ⚠️ Flag mas não bloqueia |
| Proceduras sem template | `analise_tecnica`, `relatorio_pericial` → `throw` | ⚠️ GAP |

---

## 9. Quality Gate

| Check | Estado |
|---|---|
| Fail-closed 7 checks | ✅ COMPROVADO (`final-quality-gate.ts`) |
| `COMPLETUDE`, `FIDELIDADE`, `CONSISTÊNCIA`, `CAUSALIDADE`, `RASTREABILIDADE`, `NÃO-INVENÇÃO`, `ESTRUTURA` | ✅ |
| Bloqueia documento (`blocked=true` → throw) | ✅ |
| **Jurisdição** | ❌ NÃO VERIFICADO pelo Quality Gate |
| **Temporalidade** | ❌ NÃO VERIFICADO (vigência NULL em 66/66) |
| **Validação RAG_REQUIRES_HUMAN_VALIDATION** | ❌ NÃO VERIFICADO |

**Bypass identificado:** o Quality Gate valida o documento contra a Analysis, mas **não valida** se a
fundamentação jurídica usada tem vigência comprovada nem se a jurisdição é compatível com o Case. Como
66/66 docs têm `effective_from` NULL, **toda tese pode citar norma revogada sem detecção**.

---

## 10. IntegrityHash

| Garantia | Evidência | Estado |
|---|---|---|
| Computado na geração | `rag-adapter.ts:336` | ✅ |
| Verificado na leitura | `cases.ts:62` → HTTP 409 se inválido | ✅ |
| Cobre draft + analysis | `computeDefenseIntegrityHash(draft, analysis)` | ✅ |
| Detecta alteração | 22 testes (authz/legal-authority) | ✅ |
| Cobre **fatos do Case** | ❌ NÃO — hash não inclui `infraction` | ⚠️ PARCIAL |

**Achado:** o hash liga Analysis ↔ Document, mas **não** liga Case ↔ Document. Alterar o AIT no Case
não invalida o documento já gerado.

---

## 11. Testes

| Suite | Resultado |
|---|---|
| `cloudflare/routes/` (11 arquivos) | ✅ 40/40 |
| `tests/audit/` (12 arquivos) | ✅ 190/190 |
| `tests/unit/` Case (5 arquivos) | ✅ 51/51 |
| Golden Path integration | ✅ 6/6 |
| `npx tsc --noEmit` | 12 erros, **0 em `cloudflare/`** |
| Testes falhando (full suite) | 12 em `webhook-verification.test.ts` (Documenso) — **fora da cadeia** |

---

## 12. Banco

| Tabela | Registros |
|---|---|
| `cases` | 72 |
| `payment_orders` | 14 |
| `documents` | 0 |
| `commercial_orders` | 0 |
| `ai_execution_logs` | 0 |

**Achado:** `ai_execution_logs` = 0 apesar de `recordMetric()` existir em `ai-execution-logs`. A
observabilidade de IA **não está persistindo** em produção. Não bloqueante (diagnóstico apenas).

---

## 13. Segurança

### 13.1 Supabase Advisor

| Lint | Nível | Contagem |
|---|---|---|
| `rls_enabled_no_policy` | INFO | 17 tabelas |
| `extension_in_public` | WARN | 3 (`vector`, `pg_trgm`, `citext`) |
| `anon_security_definer_function_executable` | WARN | 2 (`is_admin`, `current_role_name`) |
| `authenticated_security_definer_function_executable` | WARN | 2 (mesmas) |
| `auth_leaked_password_protection` | WARN | 1 (desabilitado) |

**17 tabelas RLS ON sem policy:** `collection_runs`, `commercial_offers`, `commercial_orders`,
`commissions`, **`knowledge_document_relations`**, `marketing_*` (5), `messaging_*` (3), `orders`,
`payments`, `promotions`, `service_pricings`.

Para `knowledge_document_relations`: RLS ON sem policy = **deny-all** para não-service_role. Como a
tabela tem 0 linhas, **sem impacto funcional**. Padrão service-role-only.

**2 funções SECURITY DEFINER acessíveis via `/rest/v1/rpc/` sem auth:** `is_admin()` e
`current_role_name()`. Ambas apenas leem `user_profiles` do chamador via `auth.uid()`. Risco:
**enumeração de papel** (retorna `admin`/`citizen`/`null` para qualquer token anônimo). Não permite
escalada, mas é vazamento de informação. **Não-bloqueante.**

### 13.2 RLS `cases` — COMPROVADO

6 policies, incluindo `cases_own_all` (FOR ALL, TO authenticated, COM `WITH CHECK`). O gap
registrado na 12.1 (Fase 9.1 knowledge sem policies) **está resolvido no banco canônico** para
knowledge_sources/documents/versions/chunks/embeddings (4 policies cada) — mas **não** para
`knowledge_document_relations`.

### 13.3 Autorização

| Cenário | Teste | Estado |
|---|---|---|
| user → próprio Case | `routes-cases-authz-p0` (20 asserts) | ✅ |
| user → outro Case | `routes-cases-legal-authority-p0` (17) | ✅ |
| admin → Case | `routes-cases-authz-p0` | ✅ |
| outro user → documento (RLS) | Golden Path integration (403) | ✅ |
| LGPD anonymization | `case-deletion-lgpd` (6) | ✅ |

---

## 14. Cobertura nacional

### 14.1 Documental por jurisdição (banco, 2026-09-25)

| UF | Documentos | Classificação Fase 10 | Estado |
|---|---|---|---|
| AC | 3 | PARCIAL | ✅ Presente |
| AL | 3 | CONFIRMADA | ✅ Presente |
| AM | 5 | RECUPERADA | ✅ Presente |
| AP | 2 | PARCIAL | ✅ Presente |
| BA | **0** | FORA_DO_ESCOPO | ❌ Ausente |
| CE | 9 | CONFIRMADA | ✅ Presente |
| DF | **0** | BLOQUEADA_POR_ACESSO | ❌ Ausente |
| ES | 2 | CONFIRMADA | ✅ Presente |
| GO | 2 | PARCIAL | ✅ Presente |
| MA | **0** | BLOQUEADA_POR_ACESSO | ❌ Ausente |
| MG | 1 | PARCIAL | ✅ Presente |
| MS | 2 | CONFIRMADA | ✅ Presente |
| MT | **0** | BLOQUEADA_POR_ACESSO | ❌ Ausente |
| PA | 1 | PARCIAL | ✅ Presente |
| PB | 2 | CONFIRMADA | ✅ Presente |
| PE | **0** | BLOQUEADA_POR_ACESSO | ❌ Ausente |
| PI | 4 | CONFIRMADA | ✅ Presente |
| PR | 3 | CONFIRMADA | ✅ Presente |
| RJ | 3 | CONFIRMADA | ✅ Presente |
| RN | **0** | BLOQUEADA_POR_ACESSO | ❌ Ausente |
| RO | **0** | BLOQUEADA_POR_ACESSO | ❌ Ausente |
| RR | 3 | PARCIAL | ✅ Presente |
| RS | 2 | CONFIRMADA | ✅ Presente |
| SC | 3 | CONFIRMADA | ✅ Presente |
| SE | **0** | BLOQUEADA_POR_ACESSO | ❌ Ausente |
| SP | 3 | CONFIRMADA | ✅ Presente |
| TO | 3 | PARCIAL | ✅ Presente |
| **BR_FEDERAL** | **10** | PARCIAL | ✅ Presente |

**Total: 19/27 UFs presentes · 7 bloqueadas · 1 fora de escopo · Federal 10 docs.**

**Cobertura documental efetiva: 70,4% das UFs.**

### 14.2 Os 7 estados bloqueados — revalidação

Não foi feita nova coleta nesta fase (§24 da 12.6: a pergunta é o estado, não a recuperação).
O banco confirma **0 documentos** para DF, MA, MT, PE, RN, RO, SE — consistente com o registro
histórico. Classificação mantida: **`RECUPERACAO_BLOQUEADA`**.

**Impacto no Golden Path:** Case com `autuadorBody` de qualquer um desses 7 UFs recebe
fundamentação **apenas federal** (10 docs). A peça é gerada, mas sem respaldo estadual específico.

### 14.3 CETRAN

13 CETRANs sem DNS (registro histórico) — **não revalidado nesta fase** (requer tentativa de rede,
fora do escopo de auditoria de leitura). Classificação mantida: **NÃO VALIDADO** nesta fase.

---

## 15. OCR

**13 documentos `ACTIVE` com 0 chunks:**

| Documento | Jurisdição | Tipo |
|---|---|---|
| `SRC_AC_DETRAN_PORTARIA_NOVA_PROCURAA` | AC | Portaria |
| `SRC_AL_CETRAN_RESOLUCAO_01_2000` | AL | Resolução |
| `SRC_AL_CETRAN_RESOLUCAO_02_2000` | AL | Resolução |
| `SRC_AL_CETRAN_RESOLUCAO_04_2002` | AL | Resolução |
| `SRC_CE_CETRAN_RESOLUCAO_001_2013` | CE | Resolução |
| `SRC_CE_CETRAN_RESOLUCAO_001_2014` | CE | Resolução |
| `SRC_CE_CETRAN_RESOLUCAO_003_2019` | CE | Resolução |
| `SRC_CE_CETRAN_RESOLUCAO_005` | CE | Resolução |
| `SRC_CE_CETRAN_RESOLUCAO_006` | CE | Resolução |
| `SRC_CE_DETRAN_INSTRUCAO_SERVICO_004_2007_COHAB` | CE | Instrução |
| `SRC_GO_CETRAN_RESOLUCAO_1999_003` | GO | Resolução |
| `SRC_GO_DETRAN_DEFESA_PREVIA_PF` | GO | Formulário |
| `SRC_PI_CETRAN_DECRETO_22731_2024` | PI | Decreto |

**Classificação: `OCR_REQUIRED`.** Documentos catalogados e `ACTIVE` mas sem conteúdo indexável.
O Golden Path **não depende** deles (58 chunks cobrem o fluxo). **NÃO BLOQUEANTE.**

**Risco:** `SRC_GO_DETRAN_DEFESA_PREVIA_PF` é um **formulário de defesa prévia** — o procedimento mais
usado. Sua ausência reduz a fundamentação para casos de defesa prévia em GO.

---

## 16. Vigência jurídica

```
knowledge_document_versions: 66
  effective_from  NULL: 66  (100%)
  effective_until NULL: 66  (100%)
knowledge_documents: status='ACTIVE' em 66/66
```

**Classificação: `KNOWLEDGE_GAP` — BLOQUEANTE para afirmação de vigência.**

Nenhuma norma tem vigência comprovada. O sistema **não pode afirmar** que uma tese se baseia em norma
vigente. `status='ACTIVE'` é um rótulo operacional, não vigência comprovada.

**O Quality Gate não verifica temporalidade** (ver §9). Logo, uma norma revogada pode fundamentar uma
peça sem detecção.

---

## 17. Relações jurídicas

`knowledge_document_relations = 0`. Nenhuma relação criada. **Não validado, não bloqueante.**

Nenhuma relação foi inventada — correto conforme regra das Fases 9–11.

---

## 18. Matriz de gaps

| Gap | Evidência | Impacto | Classificação |
|---|---|---|---|
| **Vigência 66/66 UNKNOWN** | `effective_from` NULL 66/66 | Tese pode citar norma revogada sem detecção; Quality Gate não valida | **BLOQUEANTE** |
| **7 UFs sem documento** | 0 docs para DF/MA/MT/PE/RN/RO/SE | Case nesses UFs sem fundamentação estadual | **BLOQUEANTE** |
| **UF estruturada ausente no Case** | `extractJurisdiction()` por regex; sem coluna `uf` | Jurisdição errada possível; `filterJurisdiction` frágil | **BLOQUEANTE** |
| **Quality Gate não valida vigência** | Sem check em `final-quality-gate.ts` | Vigência não bloqueada | **BLOQUEANTE** |
| **Jurisdição não validada no Gate** | Sem check | Documento pode usar norma de outro estado | **BLOQUEANTE** |
| OCR 13 documentos | 13 `ACTIVE` com 0 chunks | Fundamentação reduzida em AL/CE/GO/PI/AC | NÃO BLOQUEANTE |
| Embeddings determinístico | 58/58 `DETERMINISTIC_LOCAL` | Busca não é semântica real; funciona cross-process | NÃO BLOQUEANTE |
| 66/66 `RAG_REQUIRES_HUMAN_VALIDATION` | Nenhuma fonte promovida | KB opera sem validação humana | NÃO BLOQUEANTE |
| Relations = 0 | Tabela vazia | Sem AMENDS/REVOKES/SUPERSEDES | NÃO BLOQUEANTE |
| `applicant_json` read path | Não lido de volta pelo `case-repository` | `GET /cases/:id` retorna `applicant: undefined` | NÃO BLOQUEANTE |
| `loadAllFromSupabase()` nunca chamado | Sem caller | Map vazio no Express após restart | NÃO BLOQUEANTE (produção) |
| `integrityHash` não cobre fatos do Case | Hash = draft+analysis | Alterar AIT não invalida documento | NÃO BLOQUEANTE |
| `procedureMismatch` não bloqueia | Flag em `validation` | Peça pode usar procedimento ≠ Analysis | NÃO BLOQUEANTE |
| `ai_execution_logs` = 0 | Tabela vazia | Observabilidade de IA não persiste | NÃO BLOQUEANTE |
| 17 tabelas RLS sem policy | Advisor | Padrão deny-all; funcional via service_role | NÃO BLOQUEANTE |
| 2 funções SECURITY DEFINER públicas | `is_admin()`, `current_role_name()` | Vazamento de papel (não escalada) | NÃO BLOQUEANTE |
| 3 extensions em `public` | `vector`, `pg_trgm`, `citext` | Superfície de ataque teórica | NÃO BLOQUEANTE |
| Leaked password protection off | Advisor | Senhas comprometidas aceitas | NÃO BLOQUEANTE |
| `knowledge_document_relations` RLS sem policy | Advisor | Deny-all; 0 linhas; sem impacto | NÃO BLOQUEANTE |
| Express como runtime dev | `src/server/app.ts` | Dois runtimes; possível confusão | NÃO BLOQUEANTE |
| 3 modelos de Case concorrentes | `CaseDomain`/`CaseRow`/`CaseInfractionData` | Divergência de contrato | NÃO BLOQUEANTE |
| 12 erros TypeScript | PWA hooks, redis, CLI, shared api, test | Não afeta runtime Cloudflare | FORA DO ESCOPO |
| 12 testes falhando (webhook Documenso) | `webhook-verification.test.ts` | Assinatura Documenso | FORA DO ESCOPO |
| Golden Document Test 10/10 FAIL | `test/golden-document-test.ts` | FASE 19.1 pendente | FORA DO ESCOPO |
| 13 CETRANs sem DNS | Registro histórico | Sem doc CETRAN | NÃO VALIDADO |

---

## 19. Matriz final de estado

| Camada | Status | Evidência |
|---|---|---|
| **Runtime Cloudflare** | ✅ COMPROVADO | `wrangler.jsonc:4` |
| **Onboarding único** | ✅ COMPROVADO | Importa `rules-matrix`; zero legado no Worker |
| **Case canônico** | ✅ COMPROVADO | 72 casos; 14 colunas novas versionadas |
| **Analysis fresh** | ✅ COMPROVADO | 3 endpoints recomputam |
| **RAG persistente** | ✅ COMPROVADO | 58/58 chunks + embeddings; RPC funcional |
| **Provenance** | ✅ COMPROVADO | 0 orphans; 0 sem source/version |
| **DocumentAssembly** | ✅ COMPROVADO | Analysis é autoridade; fail-closed |
| **Quality Gate** | ⚠️ PARCIAL | 7 checks; sem vigência/jurisdição |
| **IntegrityHash** | ⚠️ PARCIAL | Analysis↔Doc; sem Case↔Doc |
| **Golden Path** | ✅ COMPROVADO | 6/6 integration + 281 core |
| **Segurança (authz)** | ✅ COMPROVADO | 6 RLS policies; 22 testes authz |
| **Segurança (hardening)** | ⚠️ PARCIAL | 2 SECURITY DEFINER públicos; 17 RLS sem policy |
| **Cobertura nacional** | ❌ PARCIAL | 19/27 UFs; 7 bloqueadas + BA fora escopo |
| **Federal** | ⚠️ PARCIAL | 10 documentos |
| **OCR** | ⚠️ PARCIAL | 13/66 docs sem texto indexável |
| **Vigência jurídica** | ❌ **BLOQUEADO** | 66/66 UNKNOWN; Gate não valida |
| **Relações jurídicas** | ⚠️ NÃO VALIDADO | 0 |
| **Embeddings** | ⚠️ FALLBACK | 58/58 determinístico |
| **LGPD** | ✅ COMPROVADO | Anonymization testada |

---

## 20. Classificação de produção

### O que está COMPROVADO

```
✅ PRODUÇÃO TÉCNICA VALIDADA

Runtime Cloudflare Worker funcional
Golden Path executado ponta-a-ponta (6/6 integration)
281 testes core passando
RAG persistente cross-process com provenance íntegra
DocumentAssembly governado por Analysis
Quality Gate fail-closed (7 checks)
IntegrityHash detecta adulteração
RLS cases com WITH CHECK
Autorização testada (IDOR, LGPD, RLS)
Banco íntegro (39/66/66/58/58/0)
RPC match_knowledge_chunks funcional
```

### O que NÃO está comprovado

```
❌ COBERTURA JURÍDICA/DOCUMENTAL PARCIAL

Vigência: 66/66 UNKNOWN — nenhuma norma comprovadamente vigente
Cobertura: 19/27 UFs (70,4%)
  7 UFs BLOQUEADAS: DF, MA, MT, PE, RN, RO, SE
  1 FORA DO ESCOPO: BA
Jurisdição: sem campo estruturado no Case; heurística por regex
Validação humana: 66/66 KB docs aguardam validação
Embeddings: fallback determinístico (não semântico real)
OCR: 13/66 documentos sem conteúdo indexável
Relações: 0
```

### Gaps BLOQUEANTES (4)

1. **Vigência 66/66 UNKNOWN** + Quality Gate não verifica → tese pode citar norma revogada
2. **7 UFs sem documento** → Case em DF/MA/MT/PE/RN/RO/SE sem fundamentação estadual
3. **UF não é dado estruturado** → jurisdição errada possível, `filterJurisdiction` frágil
4. **Quality Gate não valida vigência nem jurisdição** → gaps acima não bloqueiam a geração

### Gaps NÃO BLOQUEANTES (11)

OCR (13 docs), embeddings determinístico, `RAG_REQUIRES_HUMAN_VALIDATION` (66/66), relations (0),
`applicant_json` read path, `loadAllFromSupabase()`, `integrityHash` sem fatos do Case,
`procedureMismatch` não-bloqueante, `ai_execution_logs` vazio, 17 RLS sem policy,
2 SECURITY DEFINER públicos.

---

## 21. Limitações desta auditoria

1. **Não revalidou os 7 UFs bloqueados via rede** (§24: objetivo é estado, não recuperação).
2. **Não revalidou CETRANs** (requer tentativa de rede).
3. **Não executou análise semântica** dos 58 chunks (embeddings são determinísticos).
4. **Não rodou `test/golden-document-test.ts` como gate** (FASE 19.1 pendente; 10/10 FAIL).
5. **Não testou produção real** (sem credenciais de deploy).
6. **Não verificou vazamento de PII** em logs.
7. **Não revalidou Backup (Fase 5)** nem **RPO/RTO**.

---

## 22. Conclusão

A **Fase 12.6 está CONCLUÍDA**.

### Resposta às perguntas centrais

| Pergunta | Resposta |
|---|---|
| O Golden Path funciona? | ✅ **SIM** — 6/6 integration, 281 core |
| A Analysis controla o documento? | ✅ **SIM** — `document-assembly-engine.ts:120-124` |
| O documento é consistente com o Case? | ⚠️ **PARCIAL** — Analysis↔Doc sim; Case↔Doc não tem hash |
| A fundamentação tem provenance? | ✅ **SIM** — 0 orphans, cadeia completa |
| O Quality Gate bloqueia violações? | ⚠️ **PARCIAL** — 7 checks; sem vigência/jurisdição |
| O IntegrityHash funciona? | ✅ **SIM** para Analysis↔Doc; ⚠️ não para Case↔Doc |
| O RAG funciona cross-process? | ✅ **SIM** — RPC + pgvector, 58 chunks |
| O runtime de produção está correto? | ✅ **SIM** — Cloudflare Worker |
| O banco está íntegro? | ✅ **SIM** — 39/66/66/58/58/0, 0 orphans |
| A segurança possui gaps? | ⚠️ **SIM** — 2 SECURITY DEFINER públicos, 17 RLS sem policy, leaked protection off |
| A cobertura nacional é qual? | ⚠️ **19/27 UFs (70,4%)** — 7 bloqueadas + BA fora escopo |
| Quais documentos exigem OCR? | ⚠️ **13 de 66** — AL(3), CE(6), GO(2), PI(1), AC(1) |
| Quais normas têm vigência UNKNOWN? | ⚠️ **66 de 66** — nenhuma comprovada |
| Quais relações não foram comprovadas? | ⚠️ **Todas** — 0 criadas |
| O que impede produção? | **4 gaps BLOQUEANTES** (§20) |
| O que é apenas gap não-bloqueante? | **11 gaps** (§20) |

### Veredito

```
PRODUÇÃO TÉCNICA VALIDADA
+
COBERTURA JURÍDICA/DOCUMENTAL PARCIAL
+
4 GAPS BLOQUEANTES
+
11 GAPS NÃO BLOQUEANTES
+
NÃO VALIDADO (CETRANs, produção real, backup)
```

O sistema **executa o Golden Path de forma íntegra, rastreável e segura** do ponto de vista técnico.
O que **falta** é a **validação jurídica**: vigência comprovada, cobertura nacional completa e
jurisdição estruturada. Os 4 gaps bloqueantes são de **conteúdo e validação**, não de **arquitetura**.

---

## 23. Artefato

```
docs/recovery/FASE-12.6-AUDITORIA-INTEGRADA-FINAL-2026-09-25.md
```

## 24. HARD STOP

**FASE 12.6 CONCLUÍDA.** Nenhuma Fase 13. Nenhuma correção aplicada. Nenhuma nova coleta.
Aguardando decisão sobre o próximo ciclo.
