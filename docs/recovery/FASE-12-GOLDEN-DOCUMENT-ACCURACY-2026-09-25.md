# FASE 12 — AUDITORIA DE ACURÁCIA E DIFERENCIAÇÃO DOS 10 GOLDEN DOCUMENTS — 2026-09-25

> Auditoria de execução e medição. Uma correção de código foi aplicada, motivada por evidência
> reproduzida nesta auditoria (§15). Nenhum dado de GD-01..GD-10 foi alterado.

---

## 1. Objetivo

Responder com evidência, para os 10 Golden Documents GD-01..GD-10:

> Dados diferentes de multas diferentes geram análises juridicamente coerentes com cada caso,
> argumentos próprios e documentos correspondentes aos fatos daquele caso, com rastreabilidade
> completa e sem reutilização indevida de uma defesa genérica?

**Não** é suficiente que 10 testes passem nem que 10 hashes difiram. A aprovação exige
coerência em `INPUT → ANALYSIS → ARGUMENT → LEGAL SOURCE → CHUNK → DOCUMENT → AUDIT`
para cada um dos 10 casos.

## 2. Checkpoint

```
checkpoint exigido: 63699c3a3e2a767952ba4f1b4b5f35886ce3343f
HEAD antes:          63699c3a3e2a767952ba4f1b4b5f35886ce3343f
origin/main antes:   63699c3a3e2a767952ba4f1b4b5f35886ce3343f
branch:              main
runtime canônico:    Cloudflare Worker (wrangler.jsonc:4 → cloudflare/worker.ts)
KB consultada:       llmxnpgjpxcvyrqjkfwb (RPC match_knowledge_chunks, pgvector)
```

## 3. Metodologia

1. **Runtime canônico obrigatório.** Os 10 GD executaram por
   `analyzeInfractionCompat` → `generateDefenseDraftCompat` → `DocumentAssemblyEngine.assemble`
   → `computeDefenseIntegrityHash`, exatamente como `cloudflare/routes/cases.ts:236,279`.
   O `RagPipeline` legado (`src/core/rag/rag-pipeline.ts`) **não** foi usado como runtime.
2. **Suíte nova e versionada:** `tests/integration/golden-document-accuracy.integration.test.ts`.
   Sem credencial do Supabase ela é `skip` (mesmo padrão de `golden-path-documents.integration.test.ts`).
3. **Fonte única de fixtures:** os 600+ linhas de dado dos GD foram movidos, **sem alteração de
   valor**, de `test/golden-document-test.ts` para `tests/fixtures/golden-documents.ts`
   (`tests/fixtures/golden-documents.ts:1`). O teste histórico foi preservado e importa de lá.
   Fidelidade conferida por diff contra `git show HEAD:test/golden-document-test.ts`:
   zero divergência em qualquer campo dos 10 blocos (únicas diferenças: o qualificador `export`
   e um comentário).
4. **Identidade real, não id.** `analysis.id` é `analysis_<uuid aleatório>`
   (`cloudflare/rag-adapter.ts:176`), logo 10 ids distintos não provam nada. Cada caso recebeu
   **contentFingerprint** = SHA-256 de `{recommendedProcedure, competentBody, recommendedArguments[]}`.
5. **Diferenciação medida, não presumida.** Além do hash, Jaccard de tokens par-a-par dos 10
   documentos e comparação dos conjuntos de argumentos.
6. **Invariantes como teste; gaps como `it.fails` nomeado.** Os 9 invariantes que passam cobrem
   identidade por caso, fundamento canônico, integridade, round-trip de persistência,
   ausência de contaminação e determinismo. Os 7 gaps confirmados (A-01..A-07, A-08) ficam
   marcados com `it.fails` **e** com asserção de que a falha veio daquele achado
   (`assertFinding`, `tests/integration/golden-document-accuracy.integration.test.ts:197`).
   Se um gap for corrigido, o teste fica vermelho e força a remoção do marcador.
   Nenhum achado foi mascarado para obter verde.
7. **Evidência bruta:** `test-results/golden-document-accuracy.json` (gitignored), gerado pela suíte.

## 4. Inventário GD-01..GD-10

| GD | Infração | Código | Enquadramento | Órgão | UF | Data/hora | Local | Gravidade/Pts/Multa | Velocidade (limite/medida/considerada) | Radar / Aferição | Evidências |
|---|---|---|---|---|---|---|---|---|---|---|---|
| GD-01 | Excesso de velocidade | 745-50 | Art. 218, I | DETRAN-SP | SP | 2023-10-15 08:30 | Rod. Anchieta km 45 | média/3/R$130,16 | 80/95/91 | DECUTRAN123 / 2023-09-01 | fotoVeiculo, placaLegivel |
| GD-02 | Excesso de velocidade | 745-50 | Art. 218, I | DETRAN-SP | SP | 2023-10-15 14:15 | Av. Paulista | média/3/R$130,16 | 50/68/65 | DECUTRAN456 / 2023-09-10 | placaLegivel=false, r19=false |
| GD-03 | Excesso de velocidade | 745-70 | Art. 218, III | DETRAN-SP | SP | 2023-10-15 16:45 | Rod. Imigrantes km 20 | grave/5/R$294,23 | 100/150/143 | DECUTRAN789 / 2023-09-05 | fotoVeiculo, placaLegivel, fotoPlaca |
| GD-04 | Excesso de velocidade | 745-50 | Art. 218, I | DETRAN-SP | SP | 2023-10-15 09:00 | Rod. Anchieta km 30 | média/3/R$130,16 | 100/—/— | DECUTRAN999 / 2023-09-01 | (vazio) |
| GD-05 | Excesso de velocidade | 745-50 | Art. 218, I | DETRAN-SP | SP | 2023-10-15 11:20 | Rod. Régis Bittencourt km 150 | média/3/R$130,16 | 110/125/119 | DECUTRAN111 / **2022-05-15 (vencida)** | fotoVeiculo, placaLegivel, inmetroAferitionDateProvided |
| GD-06 | Direção sob influência de álcool | 275-10 | Art. 306 | **PRF** | BR | 2023-10-15 02:30 | Rod. Fernão Dias km 100 | grave/7/R$2.934,70 | 100/—/— | — | refusedTest, offeredRetest, psicomotorTerm, hasPsychomotorTerm=true |
| GD-07 | Avanço do sinal vermelho | 208-10 | Art. 208, §2º | CET-SP | SP | 2023-10-15 17:45 | Av. Paulista x R. Consolação | média/5/R$130,16 | 40/—/— | — | tempoAmarelo, yellowPhaseCrossing=true |
| GD-08 | Uso de telefone celular | 252-10 | Art. 252 | DETRAN-SP | SP | 2023-10-15 10:15 | Marginal Tietê | média/4/R$88,38 | 80/—/— | — | celularVivaVoz, cellphoneCircumstance=bluetooth-handsfree |
| GD-09 | Estacionamento | 167-10 | Art. 167 | CET-SP | SP | 2023-10-15 12:00 | Av. Paulista nº 1000 | média/0/R$88,38 | —/—/— | — | creditoIdosoPc |
| GD-10 | Excesso de velocidade | 745-50 | Art. 218, I | DETRAN-SP | SP | 2023-10-15 08:00 | Rod. Anchieta km 50 (obra) | média/3/R$130,16 | 80/90/86 | DECUTRAN321 / 2023-06-01 | obraEmAndamento, r19=false |

### 4.1 Deficiências de dados registradas (não corrigidas — §Regra: não ajustar GD para passar)

Todas herdadas de `createBaseInfriction` e aplicáveis aos 10 casos:

| Deficiência | Efeito observado na auditoria |
|---|---|
| `hasR19SignageProof: false` fixo | Dispara `RULE_SINALIZACAO_INSUFICIENTE_90` em **todos** os 10 casos, inclusive em drank-driving, semáforo, celular e estacionamento. ARG-002 entra em 10/10. |
| `hasPhotoProof: false` fixo | Dispara `RULE_PHOTO_PROOF_REQUIRED` (ARG-006) nos 6 casos de velocidade. |
| `hasPreviousInfractionsLast12Months: false` fixo | Dispara `RULE_CONVERSAO_ADVERTENCIA_267` (ARG-051) em 6 casos. |
| Sem `defenseDeadline`, sem `notificationDeliveryDate` | `RULE_DECADENCIA_30_DIAS` e `RULE_LEI_SECA_TERMO_432` ficam em DATA_GAP. |
| GD-06: código `275-10` com `hasPsychomotorTerm: true` | A regra Lei Seca cobre apenas 516-91/516-92 e exige `=== false`; nunca aplicável a GD-06. |
| Fixtures não trazem veículo/condutor | Veículo e requerente são fornecidos pela suíte (o runtime exige qualificação completa, `cloudflare/routes/cases.ts:265-276`). |
| `hasR19SignageProof` fora de `evidenceFlags` | `determineProcedure` lê `evidenceFlags.hasPreviousInfractionsLast12Months` (`rag-adapter.ts:213`), que nunca existe; e `EVIDENCE_DEPENDENT_ARGUMENTS` (`:158-162`) lê chaves que os GD não populam. |

## 5. Execução pelo runtime canônico

Para cada um dos 10: Case isolado (`case_<gd>_<rand>`) → `analyzeInfractionCompat` (Analysis Fresh)
→ RAG/KB (`match_knowledge_chunks`) → provenance → `recommendedArguments` → autorização
(`selectedArgumentIds` = todos os recomendados) → `DocumentAssemblyEngine.assemble`
→ `runFullQualityGate` (7 checks) → `computeDefenseIntegrityHash` → documento final.

Observações de contrato verificadas na execução:

- Nenhuma Analysis stale: os 10 `analysis.id` são distintos **e** foram recomputados por execução.
- Nenhum documento reaproveitado: 10 `document.hash` distintos.
- Nenhum chunk/versão/origem órfão: **0** — porque **0** chunks foram recuperados (ACHADO A-05).
- `factsNarrative` é vazio em 10/10 (o runtime só o preenche com `body.customFacts`, opcional).
  Os fatos aparecem no bloco de template, não em narrativa própria.
- O Quality Gate **não** é invocado pelo runtime: `grep runFullQualityGate cloudflare/` → vazio.
  A suíte o executa externamente sobre o documento gerado (ACHADO A-06).

## 6. Matriz de Analysis

| GD | Infração | Analysis ID | Fingerprint (conteúdo) | Procedimento | `overallSuccessRate` | `evaluatedRules` | `detectedFlaws` | `dataGaps` |
|---|---|---|---|---|---|---|---|---|
| GD-01 | 745-50 | `analysis_*f5e5d604` | `e1ceab26` | recurso_jari | 75 | 0 | 0 | 0 |
| GD-02 | 745-50 | `analysis_*4679e070` | `e1ceab26` | recurso_jari | 75 | 0 | 0 | 0 |
| GD-03 | 745-70 | `analysis_*74d56bd5` | `4a77877c` | recurso_jari | 75 | 0 | 0 | 0 |
| GD-04 | 745-50 | `analysis_*910a935c` | `e1ceab26` | recurso_jari | 75 | 0 | 0 | 0 |
| GD-05 | 745-50 | `analysis_*43469960` | `7c0e0500` | recurso_jari | 75 | 0 | 0 | 0 |
| GD-06 | 275-10 | `analysis_*48998220` | `ab6f4d21` | recurso_jari | 75 | 0 | 0 | 0 |
| GD-07 | 208-10 | `analysis_*edf13b25` | `0dc88295` | recurso_jari | 75 | 0 | 0 | 0 |
| GD-08 | 252-10 | `analysis_*8d26711c` | `1d73a01b` | recurso_jari | 75 | 0 | 0 | 0 |
| GD-09 | 167-10 | `analysis_*fe219ce5` | `0dc88295` | recurso_jari | 75 | 0 | 0 | 0 |
| GD-10 | 745-50 | `analysis_*444faa24` | `e1ceab26` | recurso_jari | 75 | 0 | 0 | 0 |

**ANÁLISES ÚNICAS: 6/10.** Colisões: `e1ceab26` = {GD-01, GD-02, GD-04, GD-10};
`0dc88295` = {GD-07, GD-09}. `overallSuccessRate = 75` em 10/10 é **constante do código**
(`rag-adapter.ts:179`), não um cálculo. `evaluatedRules`/`detectedFlaws`/`dataGaps` são zerados
pelo próprio adapter (`:190-193`), que descarta `ruleResult` e mantém só `recommendedArguments`:
a Analysis canônica **não carrega rastro causal** das regras que a dispararam.

## 7. Matriz de argumentos

| GD | Recomendados pela Analysis | Autorizados no documento | No documento | Tese por caso | Classificação |
|---|---|---|---|---|---|
| GD-01 | ARG-051, ARG-002, ARG-006, ARG-049 + 0 RAG | 4 | 4/4 | — | genérico de velocidade |
| GD-02 | idem GD-01 | 4 | 4/4 | — | **colide com GD-01** |
| GD-03 | ARG-002, ARG-006, ARG-049 | 3 | 3/3 | — | único (sem ARG-051: gravidade grave) |
| GD-04 | idem GD-01 | 4 | 4/4 | — | **colide com GD-01** |
| GD-05 | ARG-001, ARG-051, ARG-002, ARG-006, ARG-049 | 5 | 5/5 | ARG-001 aferição vencida | **única tese própria do conjunto** |
| GD-06 | ARG-002, ARG-049 | 2 | 2/2 | — | **colide com GD-07/08/09** |
| GD-07 | ARG-002, ARG-049 | 2 | 2/2 | — | **colide com GD-06/08/09** |
| GD-08 | ARG-002, ARG-049 | 2 | 2/2 | — | **colide com GD-06/07/09** |
| GD-09 | ARG-002, ARG-049 | 2 | 2/2 | — | **colide com GD-06/07/08** |
| GD-10 | idem GD-01 | 4 | 4/4 | — | **colide com GD-01** |

**CONJUNTOS DE ARGUMENTOS ÚNICOS: 4/10.**
`{ARG-051,ARG-002,ARG-006,ARG-049}` → GD-01,02,04,10 ·
`{ARG-002,ARG-006,ARG-049}` → GD-03 ·
`{ARG-001,…,ARG-049}` → GD-05 ·
`{ARG-002,ARG-049}` → GD-06,07,08,09.

Classificação por argumento:

| Argumento | Fundamento | Aplicabilidade | Provenance KB | Veredito |
|---|---|---|---|---|
| ARG-049 (dupla notificação, Súmula 312 STJ) | Art. 5º LIV/LV CF + Súmula 312 | cases 10/10 | ausente | `VALID_ARGUMENT` como garantia de fundo, mas `UNSUPPORTED_ARGUMENT` quanto a vício concreto: a regra é injetada incondicionalmente (`rule-engine.ts:593`) sem fato que a autorize |
| ARG-051 (conversão em advertência, Art. 267) | Art. 267 CTB, Lei 14.071/2020 | 6/10, só média/leve | ausente | `VALID_ARGUMENT` onde fires; `MISSING_RELEVANT_ARGUMENT` em GD-03 (grave) — correto |
| ARG-002 (ausência de R-19, Art. 90) | Art. 90 CTB | **10/10, inclusive drank-driving, semáforo, celular, estacionamento** | ausente | `INVALID_ARGUMENT` em GD-06,07,08,09 — a regra (`rule-engine.ts:213-241`) não tem o gate `isSpeed` que as regras de metrologia têm |
| ARG-006 (múltiplos veículos na foto) | Art. 281 §único I CTB | 6/10 (só velocidade) | ausente | `VALID_ARGUMENT` |
| ARG-001 (aferição vencida) | Art. 280 §2º + Portaria INMETRO 158/2022 | 1/10 (GD-05, 518 dias) | ausente | `VALID_ARGUMENT` — **única tese que o sistema soube derivar dos fatos** |
| 3 argumentos RAG por caso | — | **0/10** | inexistente | `MISSING_RELEVANT_ARGUMENT` + `UNSUPPORTED_ARGUMENT` (o critério de aceite exige provenance) |

## 8. Matriz de provenance

| GD | RAG Sources | Chunks | `document_id` | `version_id` | `official_url` | Recuperável |
|---|---|---|---|---|---|---|
| GD-01..GD-10 | **0** | **0** | — | — | — | não |

Causa medida, não presumida (`cloudflare/rag-adapter.ts:93-122`):

| Cenário | Resultado medido |
|---|---|
| vetor determinístico real do GD-01 × `filter_jurisdiction='SP'`, `threshold=0.35` | **0 linhas** |
| maior similaridade alcançável contra o melhor chunk de SP | **0.2134** (< 0.35) |
| mesmo vetor, `filter_jurisdiction=null`, `threshold=0.35` | 1 de 58 chunks |
| `filter_jurisdiction='BR_FEDERAL'` (GD-06, autuador PRF) | **0 linhas** — nenhum chunk tem jurisdição `BR_FEDERAL` |

Consequência: a KB de 39 fontes / 66 documentos / 58 chunks **não fundamenta nenhuma tese** de
nenhum documento. A fundamentação vem exclusivamente do `ARGUMENTS_CATALOG` estático.
Observação adicional: mesmo quando houvesse chunk, `mapRAGResultToArgument` (`:200-209`) geraria
`RAG-<chunk_id>`, que `DocumentAssemblyEngine` filtra fora por não estar no catálogo
(`document-assembly-engine.ts:121-123`) — ou seja, **o texto do documento jamais carregaria
conteúdo recuperado da KB**.

## 9. Matriz de documentos

| GD | Hash documento (8) | Hash normalizado (8) | `IntegrityHash` válido | Placeholders | `Quality Gate` | Checks reprovados |
|---|---|---|---|---|---|---|
| GD-01 | `770f1794` | n/a | sim | 0 | **FAIL (86)** | ESTRUTURA |
| GD-02 | `18e2c11b` | n/a | sim | 0 | **FAIL (86)** | ESTRUTURA |
| GD-03 | `a540bac5` | n/a | sim | 0 | **FAIL (86)** | ESTRUTURA |
| GD-04 | `78c4a040` | n/a | sim | 0 | **FAIL (86)** | ESTRUTURA |
| GD-05 | `9687ec88` | n/a | sim | 0 | **FAIL (86)** | ESTRUTURA |
| GD-06 | `d0939d51` | n/a | sim | 0 | **FAIL (86)** | ESTRUTURA |
| GD-07 | `69925fa2` | n/a | sim | 0 | **FAIL (86)** | ESTRUTURA |
| GD-08 | `f858beb4` | n/a | sim | 0 | **FAIL (86)** | ESTRUTURA |
| GD-09 | `0e3dff84` | n/a | sim | 0 | **FAIL (86)** | ESTRUTURA |
| GD-10 | `7ef19426` | n/a | sim | 0 | **FAIL (86)** | ESTRUTURA |

**DOCUMENTOS ÚNICOS: 10/10** (hash) — mas **INTEGRITYHASH ÚNICOS: 10/10 não prova diferenciação**:
o hash inclui `analysis.id`, um UUID novo por execução. O texto, porém, é que é
mensuravelmente parecido: **16 pares acima de 90% de tokens em comum**, máximo **0.9718**
(GD-04 ~ GD-10). 10 hashes diferentes, quase o mesmo documento.

Motivo único e constante da reprovação do Quality Gate — `ESTRUTURA` exige 3 seções que o
template não produz (`final-quality-gate.ts:435-445`):
`/ilustríssimo senhor/i` não casa com o endereçamento real `ILUSTRÍSSIMO(A) SENHOR(A)`;
não há seção "Qualificação do requerente"; não há "identificação do auto de infração"
(o bloco fala em "Notificação de Imposição de Penalidade referente ao AIT nº").
`blocked: true` — mas o gate não é chamado pelo runtime, então o documento é entregue assim.

## 10. Comparação cruzada (par-a-par)

Similaridade de tokens (Jaccard), 45 pares. Os 16 acima de 0.90:

| Par | Códigos | Similaridade | Leitura |
|---|---|---|---|
| GD-04 ~ GD-10 | 745-50 / 745-50 | 0.9718 | CASO B — mesmo texto, AIT/velocidades/locais diferentes |
| GD-01 ~ GD-04 | 745-50 / 745-50 | 0.9688 | CASO B |
| GD-01 ~ GD-10 | 745-50 / 745-50 | 0.9657 | CASO B |
| GD-01 ~ GD-02 | 745-50 / 745-50 | 0.9567 | CASO B — GD-02 é "falta de R-19" e recebe as mesmas teses de GD-01 |
| GD-02 ~ GD-04 | 745-50 / 745-50 | 0.9565 | CASO B |
| GD-06 ~ GD-07 | 275-10 / 208-10 | ≈0.94 | **CASO C invertido** — alcool vs semáforo, mesma Analysis |
| GD-07 ~ GD-09 | 208-10 / 167-10 | idem (fingerprint `0dc88295`) | **CASO C invertido** |
| GD-06 ~ GD-08 ~ GD-09 | 275-10 / 252-10 / 167-10 | conjunto idêntico | **CASO C invertido** |

Classificação conforme a taxonomia pedida:

- **CASO A (fundamento compartilhado legítimo):** ARG-049 (devido processo) — justificável em 10/10.
  ARG-002 dentro do grupo de velocidade — justificável, **se** o dado `hasR19SignageProof` fosse
  verdadeiro; hoje é `false` herdado da fixture para os 10.
- **CASO B (texto reciclado apesar de fatos diferentes):** GD-01/02/04/10. GD-02 tem a tese
  central declarada (`r19SignageProof: false`) e recebe exatamente o mesmo documento que GD-01,
  que se supõe limpo.
- **CASO C (argumentação ausente quando deveria ser diferente):** GD-06 (Lei Seca, autuador PRF),
  GD-07 (semáforo), GD-08 (celular viva-voz), GD-09 (vaga PCD). Quatro infrações
  materialmente distintas, mesma Analysis e mesmos 2 argumentos. Nenhuma tese de
  etilômetro/psicomotores, de retenção de semáforo, de viva-voz (CONTRAN 985/2022) ou de
  credencial de estacionamento foi produzida.
- **CASO D (argumento que não deveria existir):** ARG-002 em GD-06/07/08/09.

## 11. Análise de diferenciação (resposta à pergunta central)

| Métrica | Valor | Leitura |
|---|---|---|
| Análises com id próprio | 10/10 |-trivial, id é UUID aleatório |
| **Análises com conteúdo próprio** | **6/10** | 4 pares colidem |
| **Conjuntos de argumentos próprios** | **4/10** | 2 grupos cobrem 8 de 10 casos |
| **Documentos textualmente próprios** | **0/10** | 16 pares > 90%; máx. 97,2% |
| Documentos com hash próprio | 10/10 | não é prova |
| Documentos com thesis de KB | 0/10 | ACHADO A-05 |
| Procedimentos distintos | 1/10 | `recurso_jari` para todos, inclusive Lei Seca (Art. 306) |
| Quality Gate PASS | **0/10** | ACHADO A-06 |

O sistema **não** é uma defesa genérica reciclada (o hash, o AIT, o local, o órgão e a data
mudam por caso, e o `IntegrityHash` detecta adulteração), mas também **não** é uma defesa
personalizada: ele generaliza por *tipificação de velocidade* e degenera em um único
argumento (R-19) + uma garantia constitucional para 4 infrações que nada têm entre si.

## 12. Contaminações, mismatches e falhas

### 12.1 Achados (todos reproduzidos pela suíte)

| ID | Tipo | Evidência | Origem | Impacto | Resultado |
|---|---|---|---|---|---|
| **A-01** | Analysis genérica | fingerprint `e1ceab26` em GD-01/02/04/10; `0dc88295` em GD-07/09 | `rag-adapter.ts:155-198` descarta `ruleResult`;Analysis depende só de `infractionCode.startsWith('74')` e de 3 flags da fixture | teses não refletem os fatos do caso | **FAIL** |
| **A-02** | Argumento indevido | ARG-002 (R-19) em 10/10, inclusive alcool/semáforo/celular/estacionamento | `rule-engine.ts:213-241` sem gate `isSpeed`, + `hasR19SignageProof:false` na fixture | peça com tese de sinalização sem relação com a infração | **FAIL** |
| **A-03** | Analysis não diferenciada | pares 275-10/208-10 e 208-10/167-10 com Analysis idêntica | idem A-01 | Lei Seca tratada como semáforo | **FAIL** |
| **A-04** | IntegrityHash não reproduzível | hash muda entre execuções do mesmo caso | `defense-integrity.ts:29-38` inclui `analysisId` (UUID) | hash não é fingerprint de conteúdo | **FAIL** (classificado `LEGITIMATELY_CHANGED`, por design) |
| **A-05** | Provenance ausente | 0 chunks / 0 sources / 0 URLs em 10/10; similaridade máx. 0.2134 < threshold 0.35 | `rag-adapter.ts:98,109,200-209` + `document-assembly-engine.ts:121-123` | KB de 66 docs não fundamenta nada | **FAIL** |
| **A-06** | Quality Gate reprova 10/10 | `ESTRUTURA` em 10/10; gate não invocado pelo runtime | `final-quality-gate.ts:435-445` vs template; `cloudflare/routes/cases.ts` sem import do gate | documento entregue reprovado pelo próprio gate | **FAIL** |
| **A-07** | Fato decisivo ausente do documento | código e gravidade ausentes em 10/10; limite/medida/considerada/radar/aferição ausentes em 4–6/10 | template `RECURSO_JARI_V2026` não interpola esses fatos | defesa de velocidade sem citar a velocidade | **FAIL** |
| **A-08** | Documento cópia | 16 pares > 0.90 de tokens; máx. 0.9718 | consequência de A-01/A-02 | personalização aparente | **FAIL** |
| **A-09** | Métrica fabricada | `overallSuccessRate: 75` constante em 10/10 | `rag-adapter.ts:179` | score de sucesso sem lastro | **FAIL** |
| **A-10** | Rastro causal apagado | `evaluatedRules`/`detectedFlaws`/`dataGaps` = 0 em 10/10 | `rag-adapter.ts:190-193` | impossível auditar por que a tese disparou | **FAIL** |
| **A-11** | Procedimento único | `recurso_jari` em 10/10, inclusive Art. 306 (Lei Seca) | `rag-adapter.ts:211-215` lê `evidenceFlags.hasPreviousInfractionsLast12Months`, chave inexistente; o `recommendedProcedure` do Rule Engine (que escolheria `conversao_advertencia`) é descartado | peça inadequada ao rito | **FAIL** |
| **A-12** | Campo vazio no documento | `portador(a) do RG nº ,` (RG opcional vazio) | `document-assembly-engine.ts:242-244` | frase malformada na peça | **FAIL** (cosmético-legal) |
| **A-13** | Campo fora do hash | `defense.factsNarrative = body.customFacts` ocorre **depois** do hash (`cases.ts:288-290`) e `factsNarrative` não entra no payload do hash | `cloudflare/defense-integrity.ts:29-38` | texto do cliente entra no artefato "assinado" sem detecção | pré-existente, não introduzido aqui |
| **A-14** | Gate de conhecimento | `cloudflare/` não consta da matriz de agentes do `AGENTS.md` | `AGENTS.md` | caminho de produção de geração de defesa sem owner declarado | lacuna de governança |

### 12.2 Mismatches factuais

Nenhum **MISMATCH** (fato presente no documento com valor divergente do input) foi detectado:
o problema é **MISSING**, não errado. Isso é consistente com §12.1/A-07 — o template interpola
poucos fatos, e o que interpola interpola certo.

### 12.3 NÃO foram encontrados (verificado, não presumido)

| Item | Veredito |
|---|---|
| fato inventado | nenhum |
| velocidade afirmada que não existe no Case | nenhum |
| fato de outro GD no documento (AIT alheio) | nenhum |
| documento reaproveitado (hash idêntico entre casos) | nenhum |
| Analysis stale (id ou fingerprint de execução anterior) | nenhum |
| argumento autorizado sem estar em `recommendedArguments` | nenhum |
| tese autorizada ausente do documento | nenhuma (10/10 presentes) |
| placeholder `{{...}}` no documento | nenhum |
| norma com número inventado (`art. 9999`, `lei nº 999999`) | nenhuma |
| falha de integridade com a Analysis que gerou o documento | nenhuma (após a correção §15) |

## 13. Matriz 1 — resultado por GD

| GD | Infração | Analysis ID | Analysis Hash (conteúdo) | Argumentos | RAG Sources | Chunks | Documento Hash | IntegrityHash | Quality Gate | Fatos OK | Argumentos OK | Diferenciado | Resultado |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| GD-01 | 745-50 excesso veloc. | `*f5e5d604` | `e1ceab26` (colide) | 4 | 0 | 0 | `770f1794` | válido | FAIL 86 | **NÃO** (7 campos) | **NÃO** (genérico) | **NÃO** (A-01/02/08) | **FAIL** |
| GD-02 | 745-50 sem R-19 | `*4679e070` | `e1ceab26` (colide) | 4 | 0 | 0 | `18e2c11b` | válido | FAIL 86 | **NÃO** (5) | **NÃO** | **NÃO** | **FAIL** |
| GD-03 | 745-70 grave | `*74d56bd5` | `4a77877c` | 3 | 0 | 0 | `a540bac5` | válido | FAIL 86 | **NÃO** (6) | parcial | parcial | **FAIL** |
| GD-04 | 745-50 sem veloc. | `*910a935c` | `e1ceab26` (colide) | 4 | 0 | 0 | `78c4a040` | válido | FAIL 86 | **NÃO** (4) | **NÃO** | **NÃO** | **FAIL** |
| GD-05 | 745-50 radar vencido | `*43469960` | `7c0e0500` | 5 (ARG-001) | 0 | 0 | `9687ec88` | válido | FAIL 86 | **NÃO** (7) | **SIM** (única tese própria) | parcial | **FAIL** |
| GD-06 | 275-10 Art. 306 (PRF) | `*48998220` | `ab6f4d21` | 2 | 0 | 0 | `d0939d51` | válido | FAIL 86 | **NÃO** (2) | **NÃO** | **NÃO** (A-02/03/08) | **FAIL** |
| GD-07 | 208-10 semáforo | `*edf13b25` | `0dc88295` (colide c/ GD-09) | 2 | 0 | 0 | `69925fa2` | válido | FAIL 86 | **NÃO** (3) | **NÃO** | **NÃO** | **FAIL** |
| GD-08 | 252-10 celular | `*8d26711c` | `1d73a01b` | 2 | 0 | 0 | `f858beb4` | válido | FAIL 86 | **NÃO** (3) | **NÃO** | **NÃO** | **FAIL** |
| GD-09 | 167-10 estacionamento | `*fe219ce5` | `0dc88295` (colide c/ GD-07) | 2 | 0 | 0 | `0e3dff84` | válido | FAIL 86 | **NÃO** (2) | **NÃO** | **NÃO** | **FAIL** |
| GD-10 | 745-50 em obra | `*444faa24` | `e1ceab26` (colide) | 4 | 0 | 0 | `7ef19426` | válido | FAIL 86 | **NÃO** (7) | **NÃO** | **NÃO** | **FAIL** |

## 14. Matriz 2 — diferenciação e contaminação

| GD | Argumentos exclusivos | Argumentos compartilhados | Fatos específicos preservados | Fontes específicas | Documento individualizado | Contaminação | Resultado |
|---|---|---|---|---|---|---|---|
| GD-01 | — | ARG-002/006/049/051 | AIT, local, data, órgão | **nenhuma** | não (0.957–0.972 vs pares) | não | **FAIL** |
| GD-02 | — | idem GD-01 | AIT, local, data | **nenhuma** | não | não | **FAIL** |
| GD-03 | — (ARG-051) | ARG-002/006/049 | AIT, local, data | **nenhuma** | parcial | não | **FAIL** |
| GD-04 | — | idem GD-01 | AIT, local, data | **nenhuma** | não | não | **FAIL** |
| GD-05 | **ARG-001** | ARG-002/006/049/051 | AIT, local, data | **nenhuma** | parcial | não | **FAIL** |
| GD-06 | — | ARG-002/049 | AIT, local, data, PRF | **nenhuma** | não | não | **FAIL** |
| GD-07 | — | ARG-002/049 | AIT, local, CET-SP | **nenhuma** | não | não | **FAIL** |
| GD-08 | — | ARG-002/049 | AIT, local, DETRAN-SP | **nenhuma** | não | não | **FAIL** |
| GD-09 | — | ARG-002/049 | AIT, local, CET-SP | **nenhuma** | não | não | **FAIL** |
| GD-10 | — | ARG-002/006/049/051 | AIT, local, data | **nenhuma** | não | não | **FAIL** |

**CONTAMINAÇÃO CRUZADA: 0** (nenhum AIT/fato de outro GD aparece em documento alheio).
**REAPROVEITAMENTO DE DOCUMENTO: 0** por hash; **16/45 pares são >90% idênticos** em texto.

## 15. Matriz 3 — input × analysis × document

| GD | Input | Analysis | Document | Mismatch | Missing | Invented | Provenance | Resultado |
|---|---|---|---|---|---|---|---|---|
| GD-01 | 745-50 / SP / 80-95-91 | coerente com código, genérica nos fatos | 12/19 campos presentes | 0 | 7 | 0 | **0/4** | **FAIL** |
| GD-02 | 745-50 / SP / 50-65 | idem | 14/19 | 0 | 5 | 0 | **0/4** | **FAIL** |
| GD-03 | 745-70 / SP / 100-143 | única sem ARG-051 | 13/19 | 0 | 6 | 0 | **0/4** | **FAIL** |
| GD-04 | 745-50 sem velocidade | idem GD-01 | 15/19 | 0 | 4 | 0 | **0/4** | **FAIL** |
| GD-05 | radar vencido | **ARG-001 derivada dos fatos** | 12/19 | 0 | 7 | 0 | **0/4** | **FAIL** |
| GD-06 | 275-10 / PRF | sem tese de álcool | 17/19 | 0 | 2 | 0 | **0/4** | **FAIL** |
| GD-07 | 208-10 / CET-SP | colide com GD-09 | 16/19 | 0 | 3 | 0 | **0/4** | **FAIL** |
| GD-08 | 252-10 / DETRAN-SP | colide com GD-06/07/09 | 16/19 | 0 | 3 | 0 | **0/4** | **FAIL** |
| GD-09 | 167-10 / CET-SP | colide com GD-07 | 17/19 | 0 | 2 | 0 | **0/4** | **FAIL** |
| GD-10 | 745-50 em obra | colide com GD-01 | 12/19 | 0 | 7 | 0 | **0/4** | **FAIL** |

## 16. Correções realizadas (uma, motivada por evidência reproduzida)

**BUG: Analysis↔Documento desvinculados.** `generateDefenseDraftCompat` recomputava a Analysis
internamente (`rag-adapter.ts:311`), gerando um `analysis_<uuid>` diferente do que a rota persiste
(`cases.ts:236`). Como `computeDefenseIntegrityHash` inclui `analysis.id`
(`cloudflare/defense-integrity.ts:29-38`), o hash persistido não validava contra a Analysis
persistida → `GET /api/cases/:id` respondia **HTTP 409** e o documento ficava ilegível.
Reproduzido antes da correção: `hasValidDefenseIntegrity(draft, analysisA) = false`.

Correção (2 arquivos, 14 linhas): `precomputedAnalysis` opcional como 8º argumento de
`generateDefenseDraftCompat`; `cases.ts` passa `domain.analysis`. A Analysis do chamador é a
autoridade **sempre** — inclusive quando `recommendedArguments` é vazio, caso em que o
documento sai **sem teses** (consequência correta do invariante "Analysis é a autoridade") em
vez de fabricar teses não autorizadas. Chamadores de 7 argumentos seguem idênticos.

| Verificação | Antes | Depois |
|---|---|---|
| `hasValidDefenseIntegrity(draft, analysisA)` | `false` | `true` |
| Round-trip `domainToRow` → `rowToDomain` → `hasValidDefenseIntegrity` | 409 | **200** |
| Analysis com `[]` → teses no documento | 4 (fabricadas) | **0** |
| `npx tsc --noEmit` | 12 erros | **12 erros** (idêntico; 0 em `cloudflare/`) |

**Nada mais foi corrigido.** A-01, A-02, A-05, A-06, A-07, A-08, A-09, A-10, A-11 são
correções de produto que mudam a fundamentação jurídica emitida ao cliente. Não cabem numa
auditoria e não devem ser aplicadas sem decisão jurídica explícita e ADR.

## 17. Testes executados

| Suíte | Resultado |
|---|---|
| `tests/integration/golden-document-accuracy.integration.test.ts` (nova) | **9 passed + 7 expected fail** |
| `tests/integration/` (2 arquivos) | 15 passed + 7 expected fail |
| Gate completo `npx vitest run` | 814 passed, 13 failed, 7 expected fail (85 arquivos) |
| Baseline dos 13 failures em `63699c3` (stash das alterações, reexecução) | **mesmos 6 arquivos, mesmos 13 testes** → pré-existentes, fora desta cadeia: `payments/gateway-manager`, `payments/payment-authz`, `payments/phase6-webhook-security`, `unit/auth-middleware-p0`, `unit/case-deletion-lgpd`, `unit/webhook-verification` (Documenso) |
| `npx tsc --noEmit` | 12 erros — 6 `usePushNotifications`, 1 `redis`, 3 `fase11-ingest`, 1 `http`, 1 `test/golden-document-test.ts` (mesmo do baseline; 0 em `cloudflare/`) |
| `test/golden-document-test.ts` (legado) | preservado e executável; roda o `RagPipeline` legado, fora do runtime canônico, por isso **não** é evidência de acurácia |

Revisão de arquitetura executada por `@qualidade` (read-only): reprovou a primeira versão da
correção por reintroduzir o bug no caminho degradado — corrigido e provado (§16). As observações
R1/R2 (asserção tautológica do `blocked`; validação só em memória) foram endereçadas na suíte:
o gate agora é testado por **comportamento** (documento com placeholder é reprovado) e há um
teste de **round-trip de persistência** real.

## 18. Métricas

```
GD executados pelo runtime canônico      10/10
Analysis com id próprio                   10/10
ANALYSES ÚNICAS (conteúdo)                 6/10
CONJUNTOS DE ARGUMENTOS ÚNICOS              4/10
DOCUMENTOS ÚNICOS (hash)                  10/10
DOCUMENTOS textualmente proprios (>90% de tokens)   0/10
INTEGRITYHASH únicos                       10/10  (não prova nada — A-04)
Provenance de KB (chunk/source/versão/URL) 0/40
QUALITY GATE PASS                          0/10
Fatos ausentes do documento               49 ocorrências em 10 GD
Contaminação cruzada                       0
Documento reaproveitado por hash           0
Fato inventado                              0
Argumento autorizado sem estar na Analysis 0
Testes: 9 pass + 7 expected fail (auditoria) | 13 failures pré-existentes no gate
```

## 19. Limitações jurídicas (herdadas da FASE 12.6 — não auditadas aqui)

Nada nesta auditoria certifica vigência, cobertura ou correção jurídica:

- **Vigência**: 66/66 documentos com `effective_from` NULL. Nenhuma norma comprovadamente vigente.
- **Cobertura**: 19/27 UFs presentes (70,4%); DF, MA, MT, PE, RN, RO, SE bloqueadas; BA fora de escopo.
- **13 documentos** `ACTIVE` com 0 chunks (OCR_REQUIRED), incluindo
  `SRC_GO_DETRAN_DEFESA_PREVIA_PF` (formulário de defesa prévia).
- **Embeddings** 58/58 `DETERMINISTIC_LOCAL` — e, como medido em §8, o limiar 0.35 é
  **inatingível** com esse vetorizador. A KB não recupera nada, em nenhuma configuração.
- **13 CETRANs** sem DNS — não revalidado.
- **Jurisdição** extraída por regex sobre `autuadorBody`; não há campo `uf` estruturado no Case.
- **Validação humana**: 66/66 sob `RAG_REQUIRES_HUMAN_VALIDATION`.

## 20. Conclusão e decisão

| Dimensão | Veredito |
|---|---|
| `TECHNICAL_ACCURACY` | **APROVADO** — cadeia executa ponta a ponta, determinística, sem fato inventado, integridade válida inclusive após round-trip de persistência |
| `FACTUAL_ACCURACY` | **REPROVADO** — 49 fatos ausentes do documento; código e gravidade ausentes em 10/10; nenhuma velocidade nos casos de velocidade |
| `ARGUMENT_ACCURACY` | **REPROVADO** — ARG-002 (sinalização R-19) em alcohol/semáforo/celular/estacionamento; sem tese de álcool, semáforo, viva-voz ou credencial; 4/10 conjuntos |
| `PROVENANCE_ACCURACY` | **REPROVADO** — 0 de 40 esperados chunk/source/version/URL; a KB de 66 documentos não fundamenta nenhuma tese |
| `DOCUMENT_ACCURACY` | **REPROVADO** — 0/10 passam no próprio Quality Gate; 16/45 pares com >90% de texto idêntico |
| `LEGAL_COVERAGE` | **NÃO AVALIÁVEL** — ver §19 |

### Decisão objetiva

```
ACURÁCIA REPROVADA
```

Motivo: dos 20 critérios de aceite, 6 falham por medição direta — argumentos jurídicos sem
provenance (6), incompatíveis com os fatos do caso (7, 8, 9), documento sem coerência com o
Case (4, 5, 6), Analysis não correspondente aos dados (1, 3) e Quality Gate reprovando 10/10 (15).
"10 hashes diferentes" e "10 testes pass" seriam insufficientemente: seriam. O que se provou é o
contrário — **10 hashes diferentes, 6 análises, 4 conjuntos de argumentos, 0 provenance e
0 aprovações no Quality Gate.**

O que está sólido e deve ser preservado: a cadeia executa pelo runtime canônico, é
determinística, não inventa fatos, não contamina entre casos, vincula Analysis↔Documento por
hash verificável, e detecta adulteração. GD-05 provou que o motor **sabe** derivar uma tese
correta dos fatos (ARG-001, aferição vencida) — o caminho existe, está subaproveitado.

## 21. HARD STOP

FASE 12 concluída. Nenhuma fase posterior iniciada. Nenhum dado de GD alterado.
Correções de produto para A-01/A-02/A-05/A-06/A-07/A-08/A-09/A-10/A-11/A-12 exigem decisão
jurídica e ADR — **não** foram aplicadas.
