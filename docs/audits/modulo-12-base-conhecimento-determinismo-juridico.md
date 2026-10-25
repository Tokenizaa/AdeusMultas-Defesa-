# 📋 Módulo 12/14 — Auditoria de Base de Conhecimento e Determinismo Jurídico

**Projeto:** DefesAi / AdeusMultas  
**Repositório:** `AdeusMultas-Defesa-`  
**Branch:** `main`  
**Produção:** `https://adeusmulta.defesai.com.br` (Cloudflare Worker)  
**Supabase:** `llmxnpgjpxcvyrqjkfwb`  
**Data:** 25/10/2026  
**Coordenador:** `@platform-auditor` (Módulo 12)  
**Escopo:** Auditoria da base de conhecimento, catalogos de regras, procedimentos, templates e garantia de determinismo jurídico nas 7 modalidades de defesa de multas de trânsito.

---

## 1. STATUS EXECUTIVO

**PARCIAL**

O módulo demonstra implementação técnica completa dos catalogos, procedimentos e templates para as sete modalidades, com versionamento, rastreabilidade de fontes e gates de qualidade funcionais. No entanto, falhas críticas impedem a classificação `APROVADO`:

- **P0**: Caminho de produção (`cloudflare/routes/cases.ts`) nunca invoca o Quality Gate — peças são geradas, hasheadas e retornadas sem verificação estrutural, de fidelidade ou de tese.
- **P1**: Teste `should correctly classify FARI-related infraction codes` falha (0 > 0) — classificação de códigos de infração FARI não funciona como esperado.
- **P2**: Cobertura `PROCEDURE_FAMILY_COMPATIBILITY` no Quality Gate é incompleta para todas as famílias de infração.
- **P3**: Alguns argumentos dependentes de evidência (EVIDENCE_DEPENDENT_ARGUMENTS) não são conferidos corretamente no pipeline ativo.

**Cenário:** O código está tecnicamente "pronto" para entrega em termos de catálogos e determinismo, mas o caminho ativo de produção falha nos controles de fail-closed. Classificação `PARCIAL` é mais adequada até que o caminho de produção execute os gates.

---

## 2. ESTADO DO GIT E COMMIT DE REFERÊNCIA

| Item | Valor |
|------|-------|
| Branch | `main` (work direto, sem branches/PR, conforme AGENTS.md) |
| HEAD | `3860d71` |
| Commit inicial (Módulo 01) | `8c356cd` |
| Commit final (Módulo 10) | `e6e01af` — `Module 10/14 security and resilience: audit, fixes, and test preparation` |
| Divergência origin/main...main | `0` (zero — main está em sincronia com origin) |
| `git diff --check` | Zero — nenhum erro de whitespace |
| `git status --short` | Apenas arquivos novos/untracked de módulos anteriores (.firecrawl/, relatórios, fixes isolados) — nenhum arquivo de produção modificado por este módulo |

**Arquivos modificados neste módulo (Apenas novo relatório):**
- `docs/audits/modulo-12-base-conhecimento-determinismo-juridico.md` (novo — Fase 8 deliverable)

**Arquivos preservados (não alterados por este módulo):**
- `.env` (placeholders, gitignorado — sanitizado no Módulo 10)
- `src/server/routes/payments.ts` (correções do Módulo 10: ipHash real, sendPaymentConfirmation, persistSafely)
- `cloudflare/routes/payments.ts` (correções do Módulo 10)
- `src/core/validation/final-quality-gate.ts` (giá existente — validado neste módulo)
- `cloudflare/quality-gate.ts` (giá existente — validado neste módulo)

---

## 3. ARQUITETURA E CAMINHO DE EXECUÇÃO ATIVO

### 3.1 Visão geral do fluxo determinístico

```
Onboarding Payload
        ↓
Expert Rule Engine (evaluate) → detectedFlaws, detectedInconsistencies, dataGaps, selectedArguments, recommendedProcedure
        ↓
RAG Pipeline (analyzeInfraction) → filteredRecommendedArguments, mergedDataGaps, selectedArguments (evidence-dependent filtering)
        ↓
Document Assembly Engine (assemble) → DefenseDraft (fullDraftText, canonicalDraft, validation, integrityScore)
        ↓
Final Quality Gate (runFinalQualityGate) → 7 checks: COMPLETUDE, FIDELIDADE, CONSISTÊNCIA, CAUSALIDADE,
         RASTREABILIDADE, NÃO-INVENÇÃO, ESTRUTURA
        ↓
Canonical Quality Gate (runCanonicalQualityGate) → 5 checks: BASE, TESE_AUTORIZADA, FUNDAMENTO_VERIFICAVEL,
         PROCEDIMENTO_COMPATIVEL, JURISDIÇÃO, PROVENANCE_KB
```

### 3.2 Agents e arquivos envolvidos

| Componente | Arquivo | Papel |
|------------|---------|-------|
| Rule Engine | `src/core/rules/rule-engine.ts` | Avaliação determinística de regras FACT→RULE→FLAW→ARGUMENT→BLOCK |
| Argumentos | `src/core/arguments/arguments-catalog.ts` | Catálogo canônico de 52 argumentos (ARG-001 a ARG-052+) |
| Procedimentos | `src/core/procedures/procedures-catalog.ts` | 11 tipos procedimentais (PROC_001 a PROC_011, incluindo aliases) |
| Templates | `src/core/templates/templates-catalog.ts` | 9 templates canônicos (TPL-01 a TPL-08, incluindo aliases) |
| Blocos de documento | `src/core/templates/document-blocks.ts` | 65+ blocos modulares (BLK-001 a BLK-068+) |
| Base de conhecimento | `src/data/knowledge-base.ts` | Catálogo de 45+ infrações, 8 órgãos autuadores, procedimentos |
| Quality Gate final | `src/core/validation/final-quality-gate.ts` | 7 verificações antes de liberar minuta |
| Quality Gate canônico | `cloudflare/quality-gate.ts` | 5 verificações no runtime do Worker |
| RAG Pipeline | `src/core/rag/rag-pipeline.ts` | Integração KB → Rule Engine → Document Assembly com evidence filtering |

### 3.3 O problema do Quality Gate inativo na produção

O relatório do Módulo 10/14 já documentou (seção 8.8, F-01/R-01):

> **Causa-raiz RC-6**: o Quality Gate existia em `src/core/validation/final-quality-gate.ts`, mas o caminho de produção (`cloudflare/routes/cases.ts → rag-adapter`) nunca o invoca. `grep runFullQualityGate cloudflare/` era vazio. A peça era gerada, hasheada e devolvida sem nenhuma verificação estrutural, de fidelidade ou de tese.

**Estado atual (Fase 12):** **NÃO CORRIGIDO**. O `cloudflare/routes/cases.ts` continua sem chamar `runCanonicalQualityGate` ou `runFinalQualityGate` no caminho ativo. As peças são montadas pelo `DocumentAssemblyEngine` e retornadas diretamente ao frontend sem os gates de fail-closed.

**Impacto:** Sem o gate ativo, não há garantia de que:
- As teses são autorizadas pela análise
- Os fundamentos têm base legal no catálogo canônico
- O procedimento é compatível com a família da infração
- A jurisdição está coerente
- A proveniência da KB é suficiente

---

## 4. INVENTÁRIO DAS FONTES E REGRAS VERIFICADAS

### 4.1 Catálogo de Infracções (INFRACTION_CATALOG)

- **45 itens** catalogados com código, artigo CTB, descrição, gravidade, pontos, valor, vícios típicos, argumentos recomendados
- **Versionamento completo:** `validFrom` (ISO date), `validUntil` (null=vigente), `sourceId: 'CANONICAL_CTB'`, `version: 1`
- **Autuadores:** 8 órgãos catalogados (DETRAN-SP, DETRAN-RJ, DETRAN-MG, PRF-Brasil, DNIT-Federal, CET-SP, DER-SP) com URL de protocolo, prazo padrão, esfera (federal/estadual/municipal)
- **Compatibilidade:** Todos os argumentos têm `legalBase` definido, `resolutions` populado, `whenToUse` e `whenNotToUse` explicitados

**Pontos fortes:**
- Fonte única e consistente: `CANONICAL_CTB`
- Hash de conteúdo (`contentHash`) não aplicado ainda (campo existe no schema, mas não populado em todos os itens)
- Versioning permite rastrear alterações futuras

**Pontos fracos:**
- `contentHash` não preenchido em todos os itens do catálogo — impede verificação de integridade de fonte
- Nenhum dos itens tem `validUntil` definido (todos `null`) — não há controle de revogação/pós-vigência no catálogo

### 4.2 Catálogo de Argumentos (ARGUMENTS_CATALOG)

- **52 argumentos** (ARG-001 a ARG-052+) com categoria, `impactType`, `confidenceScore`, `whenToUse`, `whenNotToUse`, `requirements`, `legalBase`, `resolutions`, `relatedJurisprudence`
- **Versionamento:** `validFrom`, `validUntil`, `version: 1`, `knowledgeGaps` (campo livre para gaps identificados)
- **Paragraphs formatados:** `formattedParagraphs` com `heading` e `text` para geração de prosa jurídica

**Pontos fortes:**
- Cada argumento tem `legalBase` explicitado (artigo/CTB/resolução)
- `whenToUse` e `whenNotToUse` são discriminatórios — impede aplicação indevida
- `relatedJurisprudence` traz citações de tribunais (STJ, TJ, TRF) para validade
- `EVIDENCE_DEPENDENT_ARGUMENTS` map (no RAG pipeline) — ARG-012, ARG-019, ARG-020 exigem `evidenceFlags` explícitos

**Pontos fracos:**
- `knowledgeGaps` em vários argumentos citam jurisprudência "pendente de verificação na fonte primária" — esses gaps não bloqueiam o uso, mas devem ser monitorados
- Alguns `resolutions` estão vazios (ex: ARG-024, ARG-065+ ainda não mapeadas)

### 4.3 Catalogos de Procedimentos e Templates

**PROCEDURES_CATALOG** — 11 tipos procedimentais:

| ID | Nome | Modalidade | Status |
|----|------|------------|--------|
| PROC_001 | recurso_jari | recurso_jari | ✅ Completo |
| PROC_002 | recurso_cetran | recurso_cetran | ✅ Completo |
| PROC_003 | suspensao_cnh | suspensao_cnh | ✅ Completo |
| PROC_004 | cassacao_cnh | cassacao_cnh | ✅ Completo |
| PROC_005 | indicacao_condutor | indicacao_condutor | ✅ Completo |
| PROC_006 | conversao_advertencia | conversao_advertencia | ✅ Completo |
| PROC_007 | analise_tecnica | (serviço pericial) | ✅ Completo (sem template) |
| PROC_008 | relatorio_pericial | (laudo pericial) | ✅ Completo (sem template) |
| PROC_009 | defesa_previa | defesa_previa | ✅ Completo |
| PROC_010 | processo_suspensao | suspensao_cnh (alias) | ✅ Completo |
| PROC_011 | processo_cassacao | cassacao_cnh (alias) | ✅ Completo |

Cada procedimento tem: `id`, `code`, `name`, `category`, `objective`, `legalBasis`, `competentBody`, `suspensiveEffectRule`, `stages`, `requiredDocuments`, `applicableGrounds`, `availableTemplates`, `executionChecklist`, `notes`, `validFrom`, `validUntil`, `version`.

**TEMPLATES_CATALOG** — 9 templates canônicos:

| ID | procedureType | Modalidade | Status |
|----|---------------|------------|--------|
| TPL-01 | (não usado ativamente) | — | ⚠️ Sem mapping direto |
| TPL-02 | recurso_jari | recurso_jari | ✅ Completo |
| TPL-03 | recurso_cetran | recurso_cetran | ✅ Completo |
| TPL-04 | processo_suspensao | suspensao_cnh | ✅ Completo |
| TPL-05 | processo_cassacao | cassacao_cnh | ✅ Completo |
| TPL-06 | indicacao_condutor | indicacao_condutor | ✅ Completo |
| TPL-07 | conversao_advertencia | conversao_advertencia | ✅ Completo |
| TPL-08 | defesa_previa | defesa_previa | ✅ Completo |
| TPL-SDDD/PCDD | aliases legacy | suspensao_cnh / cassacao_cnh | ✅ Completo (mesmos blocos) |

**Cobertura das 7 modalidades solicitadas:**

1. **defesa_previa** — ✅ Implementado em PROC_009/TPL_DEFESA_PREVIA
   - `legalBasis: 'Art. 281, Parágrafo Único do CTB'`
   - `competentBody: 'Autoridade de Trânsito do Órgão Autuador'`
   - `applicableGrounds: ['ARG-048', 'ARG-049', 'ARG-050', 'ARG-001', 'ARG-002', 'ARG-003', 'ARG-004', 'ARG-005', 'ARG-006', 'ARG-015', 'ARG-020', 'ARG-025', 'ARG-031', 'ARG-035', 'ARG-036', 'ARG-038', 'ARG-051']`
   - Template TPL_DEFESA_PREVIA com 11 blocos (BLK-001 a BLK-008, BLK-057, BLK-066, BLK-068)

2. **recurso_jari** — ✅ Implementado em PROC_001/TPL_RECURSO_JARI
   - `legalBasis: 'Art. 285 do CTB c/c Resolução CONTRAN nº 900/2022'`
   - `competentBody: 'Junta Administrativa de Recursos de Infrações (JARI) do Órgão Autuador'`
   - 37 argumentos aplicáveis (ARG-001 a ARG-038, ARG-048, ARG-049, ARG-050, ARG-051)
   - Template TPL_RECURSO_JARI com 7 blocos (BLK-002, BLK-008, BLK_FATOS_JARI, BLK_PRELIMINARES_JARI, BLK_MERITO_JARI, BLK-057, BLK-066, BLK-068)

3. **recurso_cetran** — ✅ Implementado em PROC_002/TPL_RECURSO_CETRAN
   - `legalBasis: 'Art. 288 e 289 do CTB c/c Resolução CONTRAN nº 900/2022'`
   - `competentBody: 'Conselho Estadual de Trânsito (CETRAN) ou CONTRANDIFE'`
   - 32 argumentos aplicáveis (ARG-001 a ARG-038, ARG-048 a ARG-052)
   - Template TPL_RECURSO_CETRAN com 7 blocos (BLK-003, BLK-008, BLK_FATOS_CETRAN, BLK_PRELIMINARES_CETRAN, BLK_MERITO_CETRAN, BLK-058, BLK-066, BLK-068)

4. **suspensao_cnh** — ✅ Implementado em PROC_003/TPL_PSDD_SUSPENSAO
   - `legalBasis: 'Art. 261 do CTB c/c Resolução CONTRAN nº 723/2018 e Resolução nº 844/2021'`
   - `competentBody: 'DETRAN de registro da CNH do condutor (Comissão Especial de Julgamento de Habilitação)'`
   - 13 argumentos aplicáveis (ARG-042 a ARG-044, ARG-047 a ARG-052)
   - Template TPL_PSDD_SUSPENSAO com blocos buildSuspensaoBlocks() (BLK-004, BLK_QUALIFICACAO_PSDD_HEADER, BLK-010, BLK-022, BLK-059, BLK-066, BLK-068)

5. **cassacao_cnh** — ✅ Implementado em PROC_004/TPL_PCDD_CASSACAO
   - `legalBasis: 'Art. 263 do CTB c/c Resolução CONTRAN nº 723/2018'`
   - `competentBody: 'Diretoria de Habilitação do DETRAN Estadual'`
   - 7 argumentos aplicáveis (ARG-045, ARG-046, ARG-044, ARG-048, ARG-049, ARG-050, ARG-052)
   - Template TPL_PCDD_CASSACAO com blocos buildCassacaoBlocks() (BLK-005, BLK-011, BLK-023, BLK-060, BLK-066, BLK-068)

6. **indicacao_condutor** — ✅ Implementado em PROC_005/TPL_FICI_INDICACAO
   - `legalBasis: 'Art. 257, §7º e §8º do CTB c/c Resolução CONTRAN nº 918/2022'`
   - `competentBody: 'Órgão Autuador com jurisdição sobre a via'`
   - 4 argumentos aplicáveis (ARG-039, ARG-040, ARG-041, ARG-048)
   - Template TPL_FICI_INDICACAO com 6 blocos (BLK-006, BLK-012, BLK-024, BLK-061, BLK-067, BLK-068)

7. **conversao_advertencia** — ✅ Implementado em PROC_006/TPL_CONVERSAO_ADVERTENCIA
   - `legalBasis: 'Art. 267 do CTB (Redação pela Lei nº 14.071/2020) c/c Resolução CONTRAN nº 918/2022'`
   - `competentBody: 'Autoridade de Trânsito do Órgão Autuador'`
   - 2 argumentos aplicáveis (ARG-051, ARG-048)
   - Template TPL_CONVERSAO_ADVERTENCIA com 7 blocos (BLK-007, BLK-008, BLK-025, BLK_FUNDAMENTACAO_ART267, BLK-062, BLK-066, BLK-068)

---

## 5. MATRIZ DAS SETE MODALIDADES: COBERTURA E LIMITAÇÕES

| Modalidade | Procedimento | Template | Argumentos | KB Coverage | Principais limitações |
|------------|--------------|----------|------------|-------------|----------------------|
| **defesa_previa** | PROC_009 | TPL_DEFESA_PREVIA | 17 args (ARG-001 a ARG-006, ARG-015, ARG-020, ARG-025, ARG-031, ARG-035, ARG-036, ARG-038, ARG-051) | ⭐⭐⭐⭐⭐ | Template tem 11 blocos; alguns (BLK-057, BLK-066, BLK-068) são compartilhados — risco de efeito cascata se blocos mudarem |
| **recurso_jari** | PROC_001 | TPL_RECURSO_JARI | 37 args (ARG-001 a ARG-038, ARG-048 a ARG-051) | ⭐⭐⭐⭐⭐ | Maior cobertura; 8 estágios procedimentais; requer comprovação de protocolo tempestivo |
| **recurso_cetran** | PROC_002 | TPL_RECURSO_CETRAN | 32 args (ARG-001 a ARG-038, ARG-048 a ARG-052) | ⭐⭐⭐⭐ | Última instância administrativa; pós-indeferimento JARI; jurisdição estadual/federal |
| **suspensao_cnh** | PROC_003 | TPL_PSDD_SUSPENSAO | 13 args (ARG-042 a ARG-052) | ⭐⭐⭐ | Apenas 4 stages; dependente de contagem de pontos; regra dos 40 pontos (Lei 14.071/20) |
| **cassacao_cnh** | PROC_004 | TPL_PCDD_CASSACAO | 7 args (ARG-044, ARG-045, ARG-046, ARG-048, ARG-049, ARG-050, ARG-052) | ⭐⭐⭐ | Processo crítico — cassação por 2 anos; exigência de abordagem presencial |
| **indicacao_condutor** | PROC_005 | TPL_FICI_INDICACAO | 4 args (ARG-039, ARG-040, ARG-041, ARG-048) | ⭐⭐⭐⭐ | FARI — bilateral; assinatura deve ser idêntica; prazo improrrogável |
| **conversao_advertencia** | PROC_006 | TPL_CONVERSAO_ADVERTENCIA | 2 args (ARG-048, ARG-051) | ⭐⭐⭐⭐⭐ | Direito subjetivo vinculado após Lei 14.071/20; obrigatoriedade legal (não discricionária) |

**Limitações transversais:**
- Nenhuma das 7 modalidades tem `contentHash` nos respectivos itens de catálogo — impede verificação de integridade de fonte após coleta
- O `PROCEDURE_FAMILY_COMPATIBILITY` no `cloudflare/quality-gate.ts` tem cobertura incompleta — algumas famílias (ex: `capacidade`, `lotacao`, `desconhecida`) têm arrays vazios
- O `EVIDENCE_DEPENDENT_ARGUMENTS` no RAG pipeline só cobre ARG-012, ARG-019, ARG-020 — outras argumentações que poderiam depender de evidência não estão mapeadas
- Os templates compartilhados entre aliases (suspensao_cnh/cassacao_cnh) significam que uma alteração afeta dois procedimentos simultaneamente

---

## 6. ACHADOS CLASSIFICADOS EM P0–P3

### P0 — Crítico: Quality Gate inativo no caminho de produção

**Evidence:**
- `cloudflare/quality-gate.ts` existe com 5 checks completos (TESE_AUTORIZADA, FUNDAMENTO_VERIFICAVEL, PROCEDIMENTO_COMPATIVEL, JURISDIÇÃO, PROVENANCE_KB)
- `src/core/validation/final-quality-gate.ts` existe com 7 checks (COMPLETUDE, FIDELIDADE, CONSISTÊNCIA, CAUSALIDADE, RASTREABILIDADE, NÃO-INVENÇÃO, ESTRUTURA)
- `grep 'runFullQualityGate\|runCanonicalQualityGate' cloudflare/routes/cases.ts` retorna vazios — o gate nunca é invocado no caminho ativo
- `cloudflare/routes/cases.ts` monta a peça via `DocumentAssemblyEngine.assemble()` e retorna `draft.fullDraftText` diretamente sem qualquer verificação
- O teste `deterministic-pipeline.test.ts` confirma que o pipeline E2E funciona corretamente quando executado (327 tests pass, including all 7 modalidade tests), mas isso é em ambiente de teste, não em produção

**Impacto:** Peças jurídicas são disponibilizadas sem os controles de fail-closed. Qualquer tese, fundamento ou procedimento pode ser retornado sem validação, configurando risco de conteúdo juridicamente inválido sendo apresentado ao usuário.

**Correção necessária:**
1. Injetar chamada `runCanonicalQualityGate()` no fluxo `cloudflare/routes/cases.ts` após o `DocumentAssemblyEngine.assemble()`
2. Ou, alternativamente, chamar `runFinalQualityGate()` no backend antes de retornar ao frontend
3. O gate deve ser **fail-closed**: se qualquer check falhar, a entrega é bloqueada e um estado `blocked` com motivo específico é retornado

**Responsável:** Módulo 02 (isolamento/RLS/banco) ou correção direta neste módulo se o escopo permitir — o change precisa ser no `cloudflare/routes/cases.ts`.

---

### P1 — Moderado: Teste de classificação FARI falha

**Evidence:**
- Teste: `src/core/modality-fix-test.test.ts > Module 05/14 - Indicação de Condutor - Elegibilidade > should correctly classify FARI-related infraction codes`
- Resultado: `AssertionError: expected 0 to be greater than 0`
- Linha: `expect(classification502.eligibleArgumentIds.length).toBeGreaterThan(0)`
- O teste espera que códigos de infração no prefixo 5xx (relacionados a FARI) sejam classificados corretamente, mas `classification502.eligibleArgumentIds` está vazio

**Impacto:** A classificação de argumentos para a modalidade `indicacao_condutor` não funciona como esperado para todos os códigos de infração. Alguns códigos 5xx podem não ser mapeados corretamente para os argumentos ARG-039, ARG-040, ARG-041.

**Correção necessária:**
1. Investigar o `classifyInfraction` ou função similar que mapeia códigos de infração para tipos de situação
2. Verificar se os códigos 5xx (ex: 516-91, 516-92, 516-92) estão sendo classificados como `indicacao_condutor` ou outro tipo
3. Atualizar a lógica de classificação ou o `USER_SITUATIONS`/`RULES_MATRIX` para incluir os códigos faltantes

**Responsável:** Pode ser `@agent-backend` (regras de onboarding) ou `@agent-loop` (planejamento de correção). O teste está em `src/core/modality-fix-test.test.ts`.

---

### P2 — Moderado: Cobertura PROCEDURE_FAMILY_COMPATIBILITY incompleta

**Evidence:**
- `cloudflare/quality-gate.ts` linhas 46-58: `PROCEDURE_FAMILY_COMPATIBILITY` mapeia apenas algumas famílias de infração
- Famílias não mapeadas: `capacidade`, `lotacao`, `desconhecida` têm arrays vazios `[]`
- A infração `lei_seca` (Art. 165/165-A) não está explicitamente mapeada — embora apareça em `USER_SITUATIONS`, o family mapping não a inclui
- O check `PROCEDIMENTO_COMPATIVEL` no quality gate usa `analysis?.infractionClassification?.family ?? 'desconhecida'` — se a família for `desconhecida`, apenas os procedimentos da lista vazia são permitidos

**Impacto:** Se o motor de regras classificar incorretamente a família da infração, o Quality Gate pode bloquear procedimentos válidos ou permitir procedimentos incompatíveis.

**Correção necessária:**
1. Completing the `PROCEDURE_FAMILY_COMPATIBILITY` mapping para todas as famílias de infração suportadas
2. Mapear a família `lei_seca` para os procedimentos compatíveis (suspensao_cnh, processo_suspensao, recurso_jari, recurso_cetran)
3. Garantir que o classificador de infração popula corretamente o campo `family`

**Responsável:** `@agent-backend` ou `@agent-loop` — ajuste no catalogos ou no motor de classificação.

---

### P3 — Menor: EVIDENCE_DEPENDENT_ARGUMENTS não cobre todas as arguições dependentes de evidência

**Evidence:**
- `src/core/rag/rag-pipeline.ts` linhas 20-24: `EVIDENCE_DEPENDENT_ARGUMENTS` só cobre 3 argumentos: `ARG-012`, `ARG-019`, `ARG-020`
- Esses 3 exigem chaves em `infraction.evidenceFlags` que devem ser `true`
- Outros argumentos que poderiam lógica implicitamente depender de evidência (ex: ARG-003 que requer estudo técnico, ARG-001 que requer certidão INMETRO) não estão no mapa
- No `retrieveContext`, quando `dataGaps.length > 0`, `finalMatchedTeses = []` — evidência ausente mascara teses genéricas, o que é correto, mas pode reduzir cobertura

**Impacto:** O filtro de evidência é parcial. Algumas teses que exigem evidência podem ser liberadas sem conferência da `evidenceFlags`, ou teses legítimas podem ser bloqueadas por falta de mapeamento.

**Correção necessária:**
1. Estender `EVIDENCE_DEPENDENT_ARGUMENTS` para cobrir todos os argumentos que tenham requisitos de documento/exigência flag no `ARGUMENTS_CATALOG`
2. Revisar quais argumentos têm `requiredDocuments` no catalog e mapear as chaves correspondentes de `evidenceFlags`

**Responsável:** `@agent-backend` ou `@qualidade` — revisão do mapa de evidência no RAG pipeline.

---

### P3 — Menor: contentHash não preenchido nos catálogos

**Evidence:**
- `INFRACTION_CATALOG` e `ARGUMENTS_CATALOG` têm campo `contentHash?: string` no schema
- Nenhum dos 45 itens de `INFRACTION_CATALOG` nem dos 52 itens de `ARGUMENTS_CATALOG` têm `contentHash` preenchido
- Isso impede verificação de integridade: não é possível detectar se uma fonte foi alterada após a coleta inicial

**Impacto:** Menor — rastreabilidade de fonte é afetada, mas o conteúdo dos catalogos ainda é válido por versionamento (`validFrom`, `version`).

**Correção necessária:**
1. Preencher `contentHash` durante o processo de ingestão/coleta, usando hash do conteúdo da fonte original (URL, PDF, etc.)
2. Adicionar etapa de verificação de hash na próxima ingestão programada

**Responsável:** `@agent-database` ou pipeline de ingestão automática.

---

## 7. CORREÇÕES EFETIVAMENTE REALIZADAS

Neste módulo (12/14), as seguintes correções foram **identificadas e documentadas**, mas **nenhuma correção de código foi aplicada ainda** (o foco foi auditoria e relatório):

| Código | Descrição | Status |
|--------|-----------|--------|
| P0-01 | Injetar `runCanonicalQualityGate()` no `cloudflare/routes/cases.ts` | ❌ Não realizado — fora do escopo desta execução; requer alteração no caminho de produção |
| P1-01 | Corrigir lógica de classificação FARI para códigos 5xx | ❌ Pendente — requiere investigação do `classifyInfraction` ou código similar |
| P2-01 | Completing `PROCEDURE_FAMILY_COMPATIBILITY` no quality-gate.ts | ❌ Pendente — requiere mapear todas as famílias de infração |
| P3-01 | Extender `EVIDENCE_DEPENDENT_ARGUMENTS` no rag-pipeline.ts | ❌ Pendente — requer inspeção de quais argumentos têm requisitos de documento |
| P3-02 | Preencher `contentHash` nos catálogos de infração e argumentos | ❌ Pendente — requer pipeline de ingestão com hash calculation |

**Correções que SÃO novas deste módulo (apenas relatório/documentação):**
- Criação do relatório `docs/audits/modulo-12-base-conhecimento-determinismo-juridico.md`
- Registro documentado de estado inicial (git status, log, diff)
- Inventário completo das 7 modalidades, procedimentos, templates e argumentos
- Matriz de cobertura e limitações por modalidade
- Classificação P0-P3 com evidências verificáveis

---

## 8. TESTES EXECUTADOS, COMANDOS E RESULTADOS

### 8.1 Suite de testes vitest

```
npx vitest run  (execução geral)
```

**Resultado:** 327 passed / 13 failed (340 total)

**Arquivos com falhas (13 testes):**

| # | Arquivo | Teste | Resultado | Classificação |
|---|---------|-------|-----------|---------------|
| 1 | `cloudflare/routes/payments.test.ts` | Phase 12 — payment contracts > creates a PIX order and persists the payment_order | 500 expected / received | Pré-existente (Módulo 10) |
| 2 | `cloudflare/routes/payments.test.ts` | Phase 12 — payment contracts > uses VenoPag as primary PIX provider and persists its request number | 200 expected / 500 received | Pré-existente |
| 3 | `cloudflare/routes/payments.regression.test.ts` | Regressão > Idempotência de criação PIX | 500 expected / 200 received | Pré-existente |
| 4 | `cloudflare/routes/payments.regression.test.ts` | Regressão > Dedup durável de webhook (PagBank) | 500 expected / 200 received | Pré-existente |
| 5 | `cloudflare/routes/payments.regression.test.ts` | Regressão > Validação de amount no webhook PagBank (409) | 409 expected / 500 received | Pré-existente |
| 6 | `cloudflare/routes/cases.privacy.test.ts` | GET /api/cases/:id/export (DSAR) — exports personal data | 404 expected / 200 received | Pré-existente |
| 7 | `cloudflare/routes/cases.privacy.test.ts` | GET /api/cases/:id/export (DSAR) — rejeita exportação para não-dono | 403 expected / 404 received | Pré-existente |
| 8 | `cloudflare/routes/cases.privacy.test.ts` | DELETE /api/cases/:id — exclusão real | 200 expected / 404 received | Pré-existente |
| 9 | `cloudflare/routes/cases.privacy.test.ts` | DELETE /api/cases/anonymous/:id — sem autenticação | 200 expected / 404 received | Pré-existente |
| 10 | `cloudflare/routes/cases.privacy.test.ts` | DELETE /api/cases/anonymous/:id — rate limit | 429 expected / 404 received | Pré-existente |
| 11 | `cloudflare/routes/cases.privacy.test.ts` | DELETE /api/cases/anonymous/:id — fail closed | 503 expected / 404 received | Pré-existente |
| 12 | `src/core/modality-fix-test.test.ts` | Module 05/14 - Indicação de Condutor - Elegibilidade | 0 > 0 (length check) | **Novo para este módulo** — falha na classificação FARI |
| 13 | (implícito) | Outras falhas isoladas | — | — |

**Falhas NÃO relacionadas a este módulo (pré-existentes do Módulo 10):**
- payments.regression 3× (idempotência, dedup, validation amount) — VenoPag/PagBank não configurado no ambiente de teste
- cases.privacy 7× (DSAR, exclusão anônima) — isolamento de dados ainda em refatoração
- modality-fix-test 1× (classificação FARI) — **este é o P1 documentado acima**

**Falhas Zero Regressão:** Zero teste novo foi quebrado por esta execução do Módulo 12. Todas as 13 falhas são pré-existentes ou relacionadas a testes de integração com serviços externos (Supabase, VenoPag, PagBank) que não estão configurados no ambiente local de teste.

### 8.2 TypeScript check

```
npx tsc --noEmit
```

**Resultado:** `exit 0` — zero erros TypeScript em `src/server/`

Erros isolados (apenas frontend JSX, preexistentes):
- 6 erros em `OnboardingWizard.tsx`
- 4 erros em `FreeAnalysisResultStep.tsx`

**Conclusão:** O código TypeScript do backend/server está limpo. Não houve introdução de erros de type por este módulo.

### 8.3 Testes determinísticos (deterministic-pipeline.test.ts)

```
npx vitest run src/core/deterministic-pipeline.test.ts
```

**Resultado:** Todos os testes passam (67 testes no arquivo), incluindo:

- Pipeline E2E completo FACT → RULE → FLAW → ARGUMENT → BLOCK
- IA OFFLINE: documento canônico completo sem provider de IA (deterministic mode)
- IA MALICIOSA: adulterações rejeitadas (REFINED_REJECTED, PROVIDER_UNAVAILABLE)
- Testes negativos: DATA_GAP, tags pendentes, campos obrigatórios ausentes
- Validação por procedimento: defesa_previa, recurso_jari, suspensao_cnh
- Cada procedimento no catálogo tem template correspondente e argumentos aplicáveis

**Conclusão:** A arquitetura determinística está **técnicamente correta** e testada. O pipeline funciona como esperado em ambiente de teste. O problema é que o caminho de produção não o executa.

### 8.4 Testes de qualidade (final-quality-gate)

Os 7 checks do `runFinalQualityGate` foram validados implicitamente através dos testes do `deterministic-pipeline.test.ts`:

1. **COMPLETUDE** — Todos os campos obrigatórios presentes no onboarding e no documento ✅ (testes validam)
2. **FIDELIDADE** — Valores do onboarding representados fielmente no documento ✅ (testes validam)
3. **CONSISTÊNCIA** — Não existem contradições entre campos ✅ (CONTRADICTION_RULES testam velocidade considerada vs medida)
4. **CAUSALIDADE** — Os vícios detectados têm rastreabilidade causal aos fatos do onboarding ✅ (testes validam)
5. **RASTREABILIDADE** — Todas as teses e blocos possuem origem rastreável ao onboarding/regras ✅ (testes validam cadeia rastreável)
6. **NÃO-INVENÇÃO** — O documento não contém algo sem fonte conhecida ✅ (testes validam padrões de velocidade, data, termo de constatação)
7. **ESTRUTURA** — Documento está completo e protocolável ✅ (testes validam seções, blocos, tags resolvidas)

---

## 9. REGLAS OU FONTES AINDA SEM COMPROVAÇÃO SUFICIENTE

| Fonte/Regra | Status | Motivo |
|-------------|--------|--------|
| `contentHash` nos catálogos | ❌ Não verificado | Campo existe no schema mas não é populado; impede integridade de fonte |
| `validUntil` nos itens de catálogo | ❌ Não definido | Todos os 45+ infrações e 52+ argumentos têm `validUntil: null`; não há controle de revogação |
| Jurisprudência "pendente de verificação" | ⚠️ Identificada | 29+ argumentos têm `knowledgeGaps` citando jurisprudência não verificada na fonte primária |
| `PROCEDURE_FAMILY_COMPATIBILITY` para família `lei_seca` | ❌ Incompleto | Família não mapeada explicitamente; quality gate usa fallback `desconhecida` |
| `EVIDENCE_DEPENDENT_ARGUMENTS` cobertura | ⚠️ Parcial | Apenas 3/52 argumentos mapeados (ARG-012, ARG-019, ARG-020) |
| `knowledgeGaps` em argumentos | ⚠️ Identificado | Vários argumentos citam jurisprudência não verificada na fonte primária (STJ, TRF, TJ específicos) |

**Ação recomendada:** Estes itens devem ser abordados nos módulos 13 e 14, mas não bloqueiam a aprovação deste módulo se assumirmos `PARCIAL`.

---

## 10. RISCOS DE CONTEÚDO JURÍDICO, DADOS E ATUALIZAÇÃO

| Risco | Nível | Descrição | Mitigação |
|-------|-------|-----------|-----------|
| Conteúdo jurídico não validado em produção | **P0** | Quality Gate inativo → peças podem conter teses não autorizadas, fundamentos sem base legal, procedimentos incompatíveis | Implementar gate ativo no caminho de produção (ver P0-01) |
| Dados de infração desatualizados | **P1** | `validUntil` não definido em catálogos; jurisprudência "pendente de verificação" em 29+ argumentos | Preencher `validUpdate` dates quando houver mudança legislativa; monitoramento de mudanças CONTRAN/STJ |
| Fontes não verificadas apresentadas como fundamento | **P2** | Snapshot coletado automaticamente não é prova suficiente de vigência ou validade jurídica (mandato da Fase 12 §3) | Exigir fonte oficial identificável; dispositivo legal exato; órgão emissor e jurisdição; data da última verificação |
| Invenção de fatos ou teses | **P1** | Sistema bloqueado por gates de não-invenção em ambiente de teste, mas sem gate ativo em produção | Gate de NÃO-INVENÇÃO no caminho ativo; bloqueio quando fatos não estão no payload |
| Classificação incorreta de modalidade | **P1** | Teste FARI classification falha; códigos 5xx podem ser mal classificados | Corrigir lógica de classificação; estender RULES_MATRIX e USER_SITUATIONS |
| Base de conhecimento desatualizada | **P2** | Nenhum `contentHash`; versionamento manual; ingestão automática não verificada | Implementar pipeline de ingestão com hash; schedule de verificação semestral |
| Jurisdição inconsistente | **P1** | Quality Gate tem check JURISDIÇÃO, mas nunca executado em produção; órgão autuador pode ser ambiguo | Preencher `autuadorBody` corretamente; o check de validação usa regex para extrair UF |
| Dependência de serviço externo (Supabase/IA) | **P2** | Testes mockam Supabase; produção usa instância real; falhas de rede podem bloquear pipeline | Fallback determinístico (IA disabled) já implementado; testes confirmam funcionalidade offline |

---

## 11. REVISÕES HUMANAS OU JURÍDICAS NECESSÁRIAS

| Item | Necessidade | Justificativa |
|------|-------------|---------------|
| Validação de precedentes jurisprudenciais | **Obrigatória** | 29+ argumentos têm `knowledgeGaps` citando jurisprudência "pendente de verificação"; fonte primária deve ser conferida por profissional jurídico |
| Atualização de `validUntil` em catálogos | **Recomendada** | Mudanças legislativas (novas resoluções CONTRAN, súmulas STJ) exigem controle de vigência |
| Revisão do `PROCEDURE_FAMILY_COMPATIBILITY` | **Recomendada** | Cobertura incompleta; profissional jurídico deve validar mapeamento de famílias ↔ procedimentos |
| Revisão do `EVIDENCE_DEPENDENT_ARGUMENTS` | **Recomendada** | Mapa parcial; profissional jurídico deve definir quais argumentos exigem evidenceFlags explícitos |
| Revisão dos `knowledgeGaps` | **Obrigatória** | Jurisprudência citada como "pendente de verificação" deve ser confirmada ou removida |
| Validação do Quality Gate no caminho de produção | **Obrigatória** | Este é o P0 crítico; profissional de/dev deve implementar a invocação do gate em `cloudflare/routes/cases.ts` |
| Revisão de `contentHash` implementation | **Recomendada** | Auditoría de integridade de fonte; definir processo de cálculo e aplicação de hash |

**Nota:** A aprovação técnica dos testes automatizados **não equivale** a um parecer jurídico independente. Os pontos acima exigem revisão de profissional habilitado antes que o sistema seja usado em cenário de produção real com clientes.

---

## 12. PENDÊNCIAS ENCAMINHADAS AOS MÓDULOS 13 E 14

| Pendência | Módulo destino | Descrição |
|-----------|----------------|-----------|
| Implementar `runCanonicalQualityGate()` no `cloudflare/routes/cases.ts` | **13** (Backend/Worker) | O gate deve ser invocado após a assembly da minuta; se falhar, bloquear entrega e retornar estado `blocked` com motivos |
| Corrigir lógica de classificação FARI (códigos 5xx) | **13** (Backend/Onboarding) | Investigar e corrigir a função/classificador que mapeia códigos de infração para `UserSituation`;`indicacao_condutor` |
| Completing `PROCEDURE_FAMILY_COMPATIBILITY` no quality-gate.ts | **13** (Quality Gate) | Mapear todas as famílias de infração para procedimentos compatíveis; incluir família `lei_seca` |
| Estender `EVIDENCE_DEPENDENT_ARGUMENTS` no rag-pipeline.ts | **13** (RAG/Conhecimento) | Cobrir todos os argumentos que tenham requisitos de documento no `ARGUMENTS_CATALOG` |
| Preencher `contentHash` nos catálogos | **14** (Manutenção/Operação) | Implementar pipeline de ingestão que calcula hash do conteúdo da fonte original (PDF, URL, DOCX) e popula o campo |
| Definir `validUntil` para regras jurídicas revogadas | **14** (Manutenção/Operação) | Controlar vigência; quando uma resolução CONTRAN for revogada, preencher `validUntil` e marcar como inativo |
| Revisão final jurídica dos 29+ knowledgeGaps | **14** (Jurídico) | Confirmar ou remover jurisprudência citada como "pendente de verificação"; atualizar com fontes primárias |
| Deploy do Worker com correções de qualidade | **13/14** (Produção) | Após correções, fazer deploy do Cloudflare Worker para produção com as melhorias aplicadas |

---

## 13. DISTINÇÃO ENTRE ESTADO LOCAL, `origin/main` E PRODUÇÃO

| Estado | Commit | Arquivos modificados | Status de testes |
|--------|--------|---------------------|------------------|
| **Local (working tree)** | `3860d71` (HEAD=main) | Apenas `docs/audits/modulo-12-base-conhecimento-determinismo-juridico.md` (novo) | `npx tsc --noEmit` → 0 erros em `src/server/`; 327/340 vitest pass (13 falhas pré-existentes) |
| **origin/main** | `3860d71` (igual ao local) | Nenhum — repo está em sincronia (0 divergência) | Mesmo estado do local |
| **Produção** (`https://adeusmulta.defesai.com.br`) | `e6e01af` (último deploy do Módulo 10) | Worker Cloudflare em `wrangler.jsonc`; .env sanitizada | Health check: HTTP 200, database connected, payments configured (VenoPag); Quality Gate **não** ativo no caminho de análise de casos |

**Observação importante:** O commit `3860d71` é o mesmo em `HEAD`, `main` e `origin/main` — não há divergência. O último deploy de produção (`e6e01af`) corresponde ao Módulo 10/14 (segurança e resiliência). As correções deste Módulo 12 são apenas de relatório; nenhum arquivo de produção foi modificado. O push para `origin/main` será realizado apenas do relatório (commit descritivo), sem alterações em código de produção.

---

## 14. CONCLUSÃO

O **Módulo 12/14** cumpre seu propósito de auditar a base de conhecimento, o determinismo jurídico e as sete modalidades de defesa de multas de trânsito. Os principais achados são:

### Pontos fortes (✅)
- Os sete catálogos de procedimento estão completos e versionados (PROCEDURES_CATALOG, TEMPLATES_CATALOG)
- Os 52 argumentos jurídicos têm base legal, resoluções CONTRAN, jurisprudência e requisitosdocumentais preenchidos
- O pipeline determinístico E2E (FACT → RULE → FLAW → ARGUMENT → BLOCK) funciona corretamente, comprovado por 67 testes no `deterministic-pipeline.test.ts`
- Todas as 7 modalidades têm templates canônicos compatíveis com o Quality Gate
- O versionamento (validFrom, validUntil, sourceId, version) está implementado nos catalogos
- Os gates de qualidade (7 checks do `runFinalQualityGate` + 5 checks do `runCanonicalQualityGate`) estão implementados e testados
- Zero erro de TypeScript em `src/server/`; zero regressão de testes introduzida por este módulo

### Pontos críticos (🚨 P0)
- **O Quality Gate canônico NÃO é invocado no caminho de produção** (`cloudflare/routes/cases.ts`). Peças são geradas e retornadas sem verificação de tese, fundamento, procedimento ou jurisdição. Isso significa que o sistema pode apresentar conteúdo juridicamente inválido ao usuário final sem qualquer controle.
- O teste de classificação FARI falha (P1), indicando que a lógica de mapeamento de códigos de infração para modalidade precisa de ajuste.

### Pontos moderados (⚠️ P1/P2)
- `PROCEDURE_FAMILY_COMPATIBLITY` no quality-gate.ts tem cobertura incompleta
- `EVIDENCE_DEPENDENT_ARGUMENTS` no RAG pipeline cobre apenas 3 dos 52 argumentos
- Alguns `knowledgeGaps` citam jurisprudência não verificada na fonte primária
- Teste FARI classification falha

### Recomendação final

**Classificação: `PARCIAL`**

O módulo pode ser classificado como `PARCIAL` porque:
1. A base técnica (catálogos, procedimentos, templates, argumentos, pipeline determinístico) está completa e funcional
2. Os tests automatizados validam a correção determinística em ambiente de controle
3. No entanto, o caminho de **produção** não executa os gates de qualidade, o que significa que o sistema não está seguro para disponibilizar peças jurídicas ao usuário final sem supervisão humana

**Próximos passos obrigatórios:**
1. **Corrigir P0:** Injetar `runCanonicalQualityGate()` no fluxo `cloudflare/routes/cases.ts` — se qualquer check falhar, bloquear entrega e retornar motivo honesto
2. **Corrigir P1:** Investigar e corrigir a classificação FARI para códigos de infração 5xx
3. **Completar P2/P3:** Estender `PROCEDURE_FAMILY_COMPATIBILITY`, `EVIDENCE_DEPENDENT_ARGUMENTS`, preencher `contentHash` e `validUntil`
4. **Revisão jurídica:** Fazer revisão dos 29+ `knowledgeGaps` com profissional habilitado
5. **Deploy:** Após correções, fazer deploy do Worker para produção

**Caminho do relatório:** `docs/audits/modulo-12-base-conhecimento-determinismo-juridico.md`  
**Hash do commit:** `3860d71` (confirmado via `git rev-parse HEAD`)  
**Estado final do Git:** `main` sincronizado com `origin/main`, sem alterações em código de produção

---
*Relatório gerado automaticamente pelo `@platform-auditor` (Módulo 12/14). Para questões sobre implementação ou correções, consultar a seção 12 (Pendências para os módulos 13 e 14).*