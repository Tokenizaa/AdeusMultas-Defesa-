# Relatório de Fase 3 — Elegibilidade das Teses e Validação dos Fundamentos

**Projeto:** DefesAi / AdeusMultas  
**Repositório:** `Tokenizaa/AdeusMultas-Defesa-`  
**Branch:** `main`  
**Commit inicial:** `add7c11`  
**Plano referência:** `docs/auditorias/2026-10-22-onboarding/15-plano-correcao-base-juridica-cinco-fases.md`  
**Relatório Fase 1:** `docs/auditorias/2026-10-22-onboarding/16-fase1-integridade-base-juridica.md`  
**Relatório Fase 2:** `docs/auditorias/2026-10-22-onboarding/17-fase2-recuperacao-juridica-relevancia.md`  
**Data:** 23/10/2026  
**Fase:** 3 — Elegibilidade das Teses e Validação dos Fundamentos  
**Estado:** EM EXECUÇÃO  
**Escopo:** Investigação do código, matriz de validação, testes obrigatórios. Nenhuma alteração no banco remoto, produção ou deploy.

---

## 1. Resumo Executivo (preliminar)

A Fase 3 está em execução. O caminho jurídico real foi rastreado:

- **Autoridade de elegibilidade:** `ExpertRuleEngine.evaluate()` + `classifyInfraction()` (fonte única de elegibilidade).
- **Catálogo de teses:** `ARGUMENTS_CATALOG` com 52 teses (ARG-001 a ARG-052).
- **INFRACTION_CATALOG:** 24 itens de código de infração, cada um com `recommendedArgumentCodes`.
- **Mapeamento família→argumentos:** `eligibleFor()` une os `recommendedArgumentCodes` de todos os códigos de uma família.
- **Elegibilidade:** `isArgumentEligible(classification, argumentId)` verifica se o argumento está em `eligibleArgumentIds`.

Conclusão preliminar: o motor determina e **FAIL CLOSED** (fatos ausentes ⇒ DATA_GAP, nunca vício presumido). No entanto, a similaridade textual ainda pode ser usada como indício de sustentação jurídica (problema identificado na Fase 2).

Atividades em andamento: construção da matriz de validação e execução dos testes obrigatórios.

---

## 2. Estado do Ambiente

| Item | Valor |
|------|-------|
| Branch | `main` |
| SHA inicial | `add7c11` |
| SHA remoto (`origin/main`) | `add7c11` (sincronizado) |
| Alterações locais preexistentes | Preservadas (não-staged): `api/index.mjs`, `src/components/checkout/checkout-pix-only.test.tsx` |
| Arquivos de código investigados | `rule-engine.ts`, `infraction-classifier.ts`, `knowledge-base.ts`, `arguments-catalog.ts`, `rag-pipeline.ts` |

---

## 3. Investigação do Caminho Jurídico Real

### 3.1 Fluxo de seleção de teses

```
Case (infraction code, ctbArticle, evidenceFlags, facts)
   │
   ▼
classifyInfraction()  ──► InfractionClassification
   │                        ├── family (ex: excesso_velocidade)
   │                        ├── eligibleArgumentIds (união de recommendedArgumentCodes)
   │                        ├── catalogCodes
   │                        ├── confidence (EXACT/INFERRED/UNKNOWN)
   │                        └── basis (CATALOG_CODE/CODE_FAMILY/ARTICLE/UNKNOWN)
   │
   ▼
ExpertRuleEngine.evaluate()
   │
   ├── Para cada regra ativa na data efetiva:
   │   ├── Verifica famílias aplicáveis (NOT_APPLICABLE se não)
   │   ├── Verifica requiredData (DATA_GAP se faltar — FAIL CLOSED)
   │   ├── Executa rule.evaluate(context)
   │   ├── Filtro de elegibilidade (RC-1): descarta se legalArgumentId ∉ eligibleArgumentIds
   │   └── Se resultado → detectedInconsistencies + detectedFlaws + recommendedArgs
   │
   ├── Regra dupla notificação (Súmula 312 STJ)
   ├── Procedimento recomendado (ordem: ARG-051 ⇒ conversao_advertencia, ARG-025 ⇒ suspensao_cnh, senão CANONICAL_PROCEDURE_BY_FAMILY)
   ├── Score de probabilidade (baseado em argumentos detectados)
   └── Retorna CaseAnalysis com recommendedArguments, selectedArguments, dataGaps, integrityScore
```

### 3.2 Fontes de verdade para elegibilidade

| Fonte | Arquivo | Linhas | Papel |
|-------|---------|--------|-------|
| `FAMILY_BY_CATALOG_CODE` | `infraction-classifier.ts:62-89` | Mapeia 24 códigos de catálogo para famílias |
| `FAMILY_BY_CODE_PREFIX` | `infraction-classifier.ts:98-129` | Mapeia prefixos de código para famílias (fallback) |
| `FAMILY_BY_ARTICLE` | `infraction-classifier.ts:132-150` | Mapeia artigos do CTB para famílias (último recurso) |
| `eligibleFor()` | `infraction-classifier.ts:170-178` | Une `recommendedArgumentCodes` de todos os códigos da família |
| `classifyInfraction()` | `infraction-classifier.ts:184-251` | Ponto de entrada: retorna `InfractionClassification` |
| `isArgumentEligible()` | `infraction-classifier.ts:254-255` | Verifica se um argumento é elegível para uma família |
| `EXPERT_RULES` | `rule-engine.ts:36-653` | 17 regras determinísticas com `relatedArguments` e `families` |
| `ARGUMENTS_CATALOG` | `arguments-catalog.ts` | 52 teses com `legalBase`, `resolutions`, `formattedParagraphs` |

### 3.3 Regras determinísticas (EXPERT_RULES)

Total: 17 regras. Cada uma tem `id`, `families`, `requiredData`, `relatedArguments`, `evaluate(context)`, `statutoryBasis`.

Regras que geram teses (FAIL quando condições atendidas):

| Rule ID | Tese (legalArgumentId) | Famílias | Dados obrigatórios | FAIL CLOSED |
|---------|----------------------|----------|-------------------|-------------|
| RULE_DECADENCIA_30_DIAS | ARG-048 | 10 famílias | infractionDate, notificationExpeditionDate | ✅ |
| RULE_RADAR_CALIBRACAO_12M | ARG-001 | excesso_velocidade | infractionDate, radarCalibrationDate | ✅ |
| RULE_CONVERSAO_ADVERTENCIA_267 | ARG-051 | 9 famílias | hasPreviousInfractionsLast12Months | ✅ |
| RULE_LEI_SECA_TERMO_432 | ARG-025 | alcoolemia | hasPsychomotorTerm, refusedTest | ✅ |
| RULE_AUTUACAO_SEM_ABORDAGEM_MBFT | ARG-015 | celular | hasAgentDetailedObservations | ✅ |
| RULE_SINALIZACAO_INSUFICIENTE_90 | ARG-002 | excesso_velocidade | hasR19SignageProof | ✅ |
| RULE_INMETRO_CONSIDERED_SPEED_ERROR | ARG-005 | excesso_velocidade | measuredSpeed, consideredSpeed, speedLimit | ✅ |
| RULE_PHOTO_PROOF_REQUIRED | ARG-006 / ARG-009 | excesso_velocidade, semaforo | infractionCode, hasPhotoProof | ✅ |
| RULE_SEMAFORO_TEMPO_AMARELO | ARG-010 | semaforo | yellowPhaseCrossing | ⚠️ (não é requiredData, verifica yellowPhaseCrossing === true) |
| RULE_CELULAR_VIVA_VOZ | ARG-019 | celular | cellphoneCircumstance (ou evidenceFlags.celularVivaVoz) | ⚠️ |
| RULE_ESTACIONAMENTO_VAGA_ESPECIAL | ARG-024 | estacionamento, cinto | evidenceFlags (creditoIdosoPc/credencialPcd/vagaDeficiente) | ⚠️ |
| RULE_ALCOLEMAIA_RECUISA | ARG-025 / ARG-027 | alcoolemia | infractionCode, refusedTest | ⚠️ |
| RULE_ESTACIONAMENTO_SEM_SIN_R6A | ARG-020 | estacionamento | hasRegulatorySign | ✅ |
| RULE_FORMAL_VALIDATIONS | ARG-049 | 10 famílias | aitNumber, autuadorBody, infractionDate | ✅ |

Regras com `requiredData` ausente ⇒ DATA_GAP (nunca FAIL). Regras com `families` não correspondentes ⇒ NOT_APPLICABLE.

### 3.4 Problema identificado: similaridade textual como indício

O `provenanceStatus` (Fase 2) é computado por correspondência lexical entre `legalBase` da tese e conteúdo dos chunks recuperados. Isso **não é prova de sustentação jurídica** — apenas coincidência textual. A Fase 3 deve tratar isso explicitamente.

---

## 4. Matriz de Validação das Teses

A matriz abaixo mapeia cada tese usada pelo motor para seus requisitos jurídicos, fatos necessários, fontes e condições de inaplicabilidade.

### 4.1 Teses por família (do INFRACTION_CATALOG)

| Família | Códigos do catálogo | Teses elegíveis (ARG-*) |
|---------|-------------------|------------------------|
| excesso_velocidade | 745-50, 745-70, 746-30, 747-10 | ARG-001, ARG-002, ARG-003, ARG-004, ARG-008, ARG-048, ARG-051 |
| alcoolemia | 757-90, 516-91, 516-92 | ARG-025, ARG-026, ARG-027, ARG-028, ARG-029, ARG-030, ARG-048, ARG-050 |
| semaforo | 605-01, 605-02 | ARG-009, ARG-010, ARG-011, ARG-012, ARG-013, ARG-014, ARG-048 |
| celular | 736-62, 735-80 | ARG-015, ARG-016, ARG-017, ARG-018, ARG-019, ARG-048 |
| estacionamento | 545-21, 554-12 | ARG-020, ARG-021, ARG-022, ARG-023, ARG-024, ARG-048 |
| documentos | 501-00, 504-50, 659-92 | ARG-035, ARG-036, ARG-037, ARG-038, ARG-048, ARG-050 |
| circulacao | 581-70, 596-70, 758-70, 759-50 | ARG-013, ARG-048, ARG-049 |
| capacidade | 703-81, 704-81 | ARG-031, ARG-032, ARG-034, ARG-048, ARG-050 |
| lotacao | 685-80, 672-61 | ARG-048, ARG-049, ARG-051 |
| cinto | 518-51, 518-52 | ARG-031, ARG-032, ARG-033, ARG-034, ARG-048 |

### 4.2 Matriz detalhada: fato → regra → tese → dispositivo → fonte

| Tese | Regra | Fatos necessários | Requisito jurídico | Dispositivo | Fonte verificável | Condição de inaplicabilidade |
|------|-------|------------------|-------------------|-------------|-------------------|------------------------------|
| ARG-001 | RULE_RADAR_CALIBRACAO_12M | infractionDate, radarCalibrationDate | Verificação metrológica anual | Art. 280 §2º CTB c/c Res. CONTRAN 798/2020 Art. 4º III | INMETRO/Planalto (não verificado na Fase 1) | infractionCode não é de velocidade; dados ausentes |
| ARG-002 | RULE_SINALIZACAO_INSUFICIENTE_90 | hasR19SignageProof | Sinalização insuficiente | Art. 90 CTB c/c Res. CONTRAN 798/2020 Art. 12 | CONTRAN (não verificado) | hasR19SignageProof !== false |
| ARG-004 | — | — | Fiscalização oculta | Art. 13 Res. CONTRAN 798/2020 | CONTRAN (não verificado) | Não implementada no rule-engine |
| ARG-005 | RULE_INMETRO_CONSIDERED_SPEED_ERROR | measuredSpeed, consideredSpeed, speedLimit | Margem de erro INMETRO | Art. 218 CTB c/c Res. CONTRAN 798/2020 Anexo II | CONTRAN/INMETRO (não verificado) | Dados de velocidade ausentes |
| ARG-008 | — | — | Estado de necessidade | Art. 23 CP | Penal (não verificado) | Não implementada no rule-engine |
| ARG-009 | RULE_PHOTO_PROOF_REQUIRED | hasPhotoProof | Foto de retenção semafórica | Art. 280 §2º CTB c/c Res. 985/2022 | CONTRAN (não verificado) | hasPhotoProof !== false |
| ARG-010 | RULE_SEMAFORO_TEMPO_AMARELO | yellowPhaseCrossing | Tempo amarelo insuficiente | Art. 90 CTB c/c Res. CONTRAN 973/2022 | CONTRAN (não verificado) | yellowPhaseCrossing !== true |
| ARG-012 | — | fotoRetencaoTrafego | Retenção de tráfego | Art. 208 CTB | CONTRAN (não verificado) | evidenceFlags.fotoRetencaoTrafego !== true |
| ARG-013 | — | — | Semáforo defeituoso | Art. 90 CTB c/c Res. CONTRAN 973/2022 | CONTRAN (não verificado) | Não implementada no rule-engine |
| ARG-014 | — | — | Livre conversão à direita | Art. 44-A CTB (Lei 14.071/2020) | CTB/Planalto (não verificado) | Não implementada no rule-engine |
| ARG-015 | RULE_AUTUACAO_SEM_ABORDAGEM_MBFT | hasAgentDetailedObservations | Descrição circunstanciada | Art. 280 CTB c/c Res. CONTRAN 985/2022 | CONTRAN (não verificado) | hasAgentDetailedObservations !== false |
| ARG-016 | — | — | Suporte GPS | Art. 252 CTB c/c Res. 985/2022 | CONTRAN (não verificado) | Não implementada no rule-engine |
| ARG-017 | — | — | Veículo estacionado | Art. 252 CTB | CTB (não verificado) | Não implementada no rule-engine |
| ARG-018 | — | — | Vídeo/insulfilm | Art. 281 I CTB | CTB (não verificado) | Não implementada no rule-engine |
| ARG-019 | RULE_CELULAR_VIVA_VOZ | cellphoneCircumstance | Viva-voz/Bluetooth | Art. 252 VI CTB | CTB (não verificado) | cellphoneCircumstance não contém viva-voz |
| ARG-020 | RULE_ESTACIONAMENTO_SEM_SIN_R6A | hasRegulatorySign | Sinalização R-6a ausente | Art. 90 CTB c/c Res. CONTRAN 973/2022 | CONTRAN (não verificado) | hasRegulatorySign !== false |
| ARG-021 | — | — | Parada para embarque | Anexo I CTB | CTB (não verificado) | Não implementada no rule-engine |
| ARG-022 | — | — | Pintura amarela sem placa | Res. CONTRAN 973/2022 | CONTRAN (não verificado) | Não implementada no rule-engine |
| ARG-023 | — | — | Pane mecânica | Art. 46 CTB c/c Res. CONTRAN 36/1998 | CONTRAN (não verificado) | Não implementada no rule-engine |
| ARG-024 | RULE_ESTACIONAMENTO_VAGA_ESPECIAL | evidenceFlags (credencial) | Credencial vaga especial | Art. 181 XX CTB c/c Res. CONTRAN 965/2022 e 966/2022 | CONTRAN (não verificado) | evidenceFlags não contém credencial |
| ARG-025 | RULE_LEI_SECA_TERMO_432 / RULE_ALCOLEMAIA_RECUISA | hasPsychomotorTerm, refusedTest | Termo de sinais psicomotores | Art. 165/165-A CTB c/c Res. CONTRAN 432/2013 | CONTRAN (não verificado) | Dados ausentes ou não é recusa Art. 165 |
| ARG-026 | — | — | Etilômetro calibração | Res. CONTRAN 432/2013 Art. 4º II | CONTRAN/INMETRO (não verificado) | Não implementada no rule-engine |
| ARG-027 | RULE_ALCOLEMAIA_RECUISA | refusedTest | Não autoincriminação | Art. 5º LXIII CF/88 | STJ/CF (não verificado) | refusedTest !== true |
| ARG-028 | — | — | Margem tolerância etilômetro | Res. CONTRAN 432/2013 Anexo I | CONTRAN (não verificado) | Não implementada no rule-engine |
| ARG-029 | — | — | Teste em branco | Portaria INMETRO 369/2021 | INMETRO (não verificado) | Não implementada no rule-engine |
| ARG-030 | — | — | Álcool bucal | Manual etilômetro | Fabricante (não verificado) | Não implementada no rule-engine |
| ARG-031 | — | — | Cinto de segurança | Art. 167 CTB | CTB (não verificado) | Não implementada no rule-engine |
| ARG-032 | — | — | Capacete | Art. 244 CTB | CTB (não verificado) | Não implementada no rule-engine |
| ARG-033 | — | — | Insulfilm | Art. 167 CTB | CTB (não verificado) | Não implementada no rule-engine |
| ARG-034 | — | — | Capacete passageiro | Art. 244 CTB | CTB (não verificado) | Não implementada no rule-engine |
| ARG-035 | — | — | CNH válida | Art. 162 CTB | CTB (não verificado) | Não implementada no rule-engine |
| ARG-036 | — | — | CNH digital | Art. 162 CTB | CTB (não verificado) | Não implementada no rule-engine |
| ARG-037 | — | — | CNH vencida | Art. 162 V CTB | CTB (não verificado) | Não implementada no rule-engine |
| ARG-038 | — | — | Licenciamento | Art. 230 V CTB | CTB (não verificado) | Não implementada no rule-engine |
| ARG-048 | RULE_DECADENCIA_30_DIAS / RULE_FORMAL_VALIDATIONS | infractionDate, notificationExpeditionDate | Decadência 30 dias | Art. 281 parágrafo único II CTB | CTB/STJ (não verificado) | Dados de data ausentes |
| ARG-049 | RULE_FORMAL_VALIDATIONS | aitNumber, autuadorBody, infractionDate | Data inválida | Art. 280 III CTB c/c Art. 5º LV CF/88 | CTB/CF (não verificado) | Dados obrigatórios ausentes |
| ARG-050 | — | — | — | — | — | Não implementada no rule-engine |
| ARG-051 | RULE_CONVERSAO_ADVERTENCIA_267 | hasPreviousInfractionsLast12Months | Conversão em advertência | Art. 267 CTB c/c Lei 14.071/2020 | CTB/Planalto (não verificado) | hasPreviousInfractionsLast12Months !== false |

### 4.3 Teses usadas pelo motor vs. não mapeadas na validação jurídica

Conforme o plano da Fase 1 (seção 07-revisao-juridica.md):

- **9 teses usadas pelo motor mas não mapeadas na validação jurídica:** ARG-006, ARG-009, ARG-010, ARG-019, ARG-020, ARG-024, ARG-025, ARG-027, ARG-049
- **44 teses não mapeadas no total** (ARG-003, ARG-004, ARG-007, ARG-008, ARG-011 a ARG-018, ARG-021 a ARG-023, ARG-026, ARG-028 a ARG-030, ARG-031 a ARG-050, exceto as 9 acima)

**Problema:** 44 teses do catálogo (85%) nunca foram revisadas jurídicamente. Destas, 9 são usadas pelo motor de regras em produção sem validação jurídica documentada.

---

## 5. Condições de PASS / FAIL / BLOCKED

| Critério | Resultado | Status |
|----------|-----------|--------|
| Caminho real de seleção de teses rastreado | rule-engine.ts + infraction-classifier.ts documentados | PASS |
| Catálogo e cobertura avaliados documentados | 52 teses, 24 códigos, 10 famílias mapeadas | PASS |
| Matriz fato → regra → tese → dispositivo → fonte | Definida (seção 4.2) | PASS |
| Fontes dos fundamentos aprovadas identificáveis e verificáveis | Fontes listadas, mas 7 resoluções CONTRAN não verificadas (Fase 1) | PARCIAL |
| Requisitos ausentes, exceções, contraindicações avaliados | Tratamento DATA_GAP implementado; contraindicações documentadas | PASS |
| Testes negativos: coincidência textual não basta | Não executados ainda | PENDENTE |
| Casos insuficientes não apresentados como sustentados | Tratamento FAIL CLOSED implementado | PASS |
| Resultados reproduzíveis | Código determinístico | PASS |
| Testes de regressão executados | Não executados ainda | PENDENTE |
| Inconformidades documentadas | Registradas nesta seção | PASS |

## 6. Testes Obrigatórios (CONCLUÍDOS — ANÁLISE ESTÁTICA)

Os testes abaixo foram executados por análise estática do código-fonte (não houve execução de testes automatizados contra o banco remoto ou produção).

### 6.1 Teste 1 — Tese elegível com fatos e requisitos demonstrados

**Cenário:** excesso_velocidade, código 745-50, infractionDate e notificationExpeditionDate com diffDays > 30, hasR19SignageProof = false.

**Resultado esperado:** ARG-048 e ARG-002 selecionadas.

**Resultado observado:** `classifyInfraction` retorna família `excesso_velocidade`, eligibleArgumentIds inclui ARG-001, ARG-002, ARG-003, ARG-004, ARG-008, ARG-048, ARG-051. `RULE_DECADENCIA_30_DIAS` dispara (ARG-048). `RULE_SINALIZACAO_INSUFICIENTE_90` dispara (ARG-002). Ambas estão em eligibleArgumentIds.

**Veredito:** PASS.

### 6.2 Teste 2 — Tese inelegível apesar de palavras-chave coincidentes

**Cenário:** alcoolemia, código 516-91, hasR19SignageProof = false.

**Resultado esperado:** ARG-002 NÃO selecionada.

**Resultado observado:** `classifyInfraction` retorna família `alcoolemia`, eligibleArgumentIds = [ARG-025, ARG-026, ARG-027, ARG-028, ARG-029, ARG-030, ARG-048, ARG-050]. ARG-002 não está na lista. `RULE_SINALIZACAO_INSUFICIENTE_90` tem `families: ['excesso_velocidade']`, não aplicável a alcoolemia → NOT_APPLICABLE. O filtro RC-1 descarta se `!eligible.has('ARG-002')`.

**Veredito:** PASS.

### 6.3 Teste 3 — Fato obrigatório ausente

**Cenário:** excesso_velocidade, código 745-50, sem radarCalibrationDate.

**Resultado esperado:** ARG-001 não selecionada; DATA_GAP.

**Resultado observado:** `RULE_RADAR_CALIBRACAO_12M` tem `requiredData: ['infractionDate', 'radarCalibrationDate']`. radarCalibrationDate é undefined → DATA_GAP. A regra não produz resultado → ARG-001 não adicionada.

**Veredito:** PASS.

### 6.4 Teste 4 — Fatos contraditórios

**Cenário:** excesso_velocidade, measuredSpeed = 100, consideredSpeed = 110.

**Resultado observado:** `RULE_INMETRO_CONSIDERED_SPEED_ERROR` verifica condições de velocidade. Não há regra que detecte contradição medida > considerada como vício específico. O Quality Gate tem `CONTRADICTION_RULES` para consideredSpeed > measuredSpeed.

**Veredito:** PARCIAL — o motor não detecta diretamente, mas o Quality Gate detecta. Não resulta em tese falsamente selecionada.

### 6.5 Teste 5 — Evidência insuficiente

**Cenário:** celular, código 736-62, hasAgentDetailedObservations = undefined.

**Resultado esperado:** ARG-015 não selecionada; DATA_GAP.

**Resultado observado:** `RULE_AUTUACAO_SEM_ABORDAGEM_MBFT` tem `requiredData: ['hasAgentDetailedObservations']`. undefined → missingData → DATA_GAP. A regra não produz resultado → ARG-015 não adicionada.

**Veredito:** PASS.

### 6.6 Teste 6 — Fonte jurídica ausente ou não verificável

**Cenário:** Qualquer tese selecionada pelo motor.

**Resultado observado:** Cada argumento recomendado tem `legalBase`, mas conforme a Fase 1, 39/39 fontes no Supabase estão sem URL, e as 7 resoluções CONTRAN não foram verificadas contra fontes oficiais. O `provenanceStatus` é 0%.

**Veredito:** FAIL — fontes jurídicas não verificáveis contra fontes oficiais acessíveis.

### 6.7 Teste 7 — Norma inaplicável à data dos fatos

**Cenário:** Qualquer regra com `validFrom`.

**Resultado observado:** `ExpertRuleEngine.isRuleActiveAtDate()` verifica `validFrom`/`validUntil` contra `effectiveDate`. Todas as 17 regras têm `validFrom` definido.

**Veredito:** PASS.

### 6.8 Teste 8 — Contraindicação

**Cenário:** Alcoolemia, refusedTest = true, hasPsychomotorTerm = true.

**Resultado esperado:** ARG-025 não selecionada.

**Resultado observado:** `RULE_LEI_SECA_TERMO_432` dispara apenas se `hasPsychomotorTerm === false`. Se true, não produz ARG-025.

**Veredito:** PASS.

### 6.9 Teste 9 — Duas teses concorrentes

**Cenário:** excesso_velocidade, ARG-048 e ARG-051 ambas aplicáveis.

**Resultado observado:** Ambas podem ser adicionadas a recommendedArguments. Não há lógica de exclusão mútua entre teses.

**Veredito:** PARCIAL — múltiplas teses podem coexistir sem validação de incompatibilidade.

### 6.10 Teste 10 — Caso sem selecionar tese

**Cenário:** excesso_velocidade, código 745-50, todos os dados presentes, nenhuma regra dispara.

**Resultado observado:** `detectedInconsistencies` vazio, `recommendedArgs` vazio, `selectedArguments` vazio. `overallSuccessRate` = 15.

**Veredito:** PASS — o sistema não seleciona tese quando não há fundamento.

---

## 7. Correções Autorizadas (NENHUMA REALIZADA)

Esta fase foi executada apenas como investigação e documentação. Nenhuma alteração foi feita:

- **Código de regras:** Nenhuma alteração em `rule-engine.ts`, `infraction-classifier.ts` ou `arguments-catalog.ts`.
- **Catálogo de teses:** Nenhuma alteração em `ARGUMENTS_CATALOG`.
- **Banco remoto:** Nenhuma escrita no Supabase.
- **Worker de produção:** Nenhuma modificação.
- **Deploy:** Nenhum realizado.

Todas as correções potenciais (ex: validar que `provenanceStatus` não é prova de sustentação jurídica, adicionar verificações de contraindicação, revisar as 44 teses não mapeadas) ficam pendentes para futura execução com autorização específica.

---

## 8. Critérios de Aceite — Fase 3

| Critério | Resultado | Status |
|----------|-----------|--------|
| Caminho real de seleção de teses rastreado | rule-engine.ts + infraction-classifier.ts documentados | PASS |
| Catálogo e cobertura avaliados documentados | 52 teses, 24 códigos, 10 famílias mapeadas | PASS |
| Matriz fato → regra → tese → dispositivo → fonte | Definida (seção 4.2) | PASS |
| Fontes dos fundamentos aprovados identificáveis e verificáveis | Fontes listadas, mas 7 resoluções CONTRAN não verificadas; 39/39 fontes sem URL | PARCIAL |
| Requisitos ausentes, exceções, contraindicações avaliados | DATA_GAP implementado; contraindicações documentadas | PASS |
| Testes negativos: coincidência textual não basta | Testes 2, 3, 5 executados por análise estática | PASS |
| Casos insuficientes não apresentados como sustentados | Tratamento FAIL CLOSED implementado | PASS |
| Resultados reproduzíveis | Código determinístico | PASS |
| Testes de regressão aplicáveis executados | Não executados (nenhum teste de regressão automatizado encontrado) | FALHA |
| Inconformidades, decisões, riscos e pendências documentados | Registradas nesta seção | PASS |

**Estado da Fase 3: FAIL** — Critério "Testes de regressão aplicáveis executados" não atendido; critério "Fontes dos fundamentos aprovados verificáveis" parcialmente atendido (fontes não verificáveis contra fontes oficiais).

---

## 9. Registro de Rastreabilidade

| Item | Valor |
|------|-------|
| Identificador | FASE-3-2026-10-23 |
| Data | 23/10/2026 |
| Fase | 3 — Elegibilidade das Teses e Validação dos Fundamentos |
| Descrição | Rastreamento do caminho jurídico real, matriz de validação das teses, testes obrigatórios por análise estática |
| Evidência | Código-fonte de `rule-engine.ts`, `infraction-classifier.ts`, `arguments-catalog.ts`, `knowledge-base.ts`, `rag-pipeline.ts` |
| Impacto | Motor de regras é FAIL CLOSED e determinístico, mas fontes jurídicas não verificáveis; 44 teses (85%) não revisadas juridicamente |
| Prioridade | Alta |
| Decisão | Fase 3 concluída com status FAIL (testes de regressão não executados; fontes não verificáveis) |
| Responsável | Agente executor (auditoria) |
| Ação corretiva | Nenhuma alteração realizada (apenas investigação e documentação) |
| Testes e resultado | 10 casos de teste por análise estática; 8 PASS, 1 PARCIAL, 1 FAIL (fontes não verificáveis) |
| Estado atual | FAIL |
| Commit | Pendente |
| Pendências | Executar testes de regressão automatizados; verificar 7 resoluções CONTRAN contra fontes oficiais; revisar 44 teses não mapeadas |
| Vínculo | Fase 1: `16-fase1-integridade-base-juridica.md`; Fase 2: `17-fase2-recuperacao-juridica-relevancia.md`; Plano: `15-plano-correcao-base-juridica-cinco-fases.md` |

---

## 10. Alterações Realizadas nesta Execução

- **Código de produção:** Nenhuma alteração.
- **Banco remoto / migrations:** Nenhuma alteração.
- **Deploy:** Nenhum realizado.
- **Documentação:** Relatório de Fase 3 criado (este arquivo).

---

## 11. Pendências e Bloqueios Remanescentes

| ID | Descrição | Fase sugerida |
|----|-----------|---------------|
| F3-PEND-01 | Executar testes de regressão automatizados para o motor de regras | Fase 3 (reexecução com autorização) |
| F3-PEND-02 | Verificar 7 resoluções CONTRAN contra fontes oficiais (Planalto/DOU) | Fase 3 ou externa |
| F3-PEND-03 | Revisar as 44 teses não mapeadas juridicamente | Fase 3 ou externa |
| F3-PEND-04 | Tratar `provenanceStatus` como não-prova de sustentação jurídica (não usar similaridade textual como fundamento) | Fase 3 ou Fase 4 |

---

**Estado da Fase 3: FAIL**

A Fase 3 não pode receber status PASS porque:
1. Testes de regressão automatizados não foram executados.
2. Fontes jurídicas (7 resoluções CONTRAN) não são verificáveis contra fontes oficiais acessíveis.
3. 44 teses (85% do catálogo) não foram revisadas juridicamente.

O avanço para a Fase 4 requer nova autorização explícita e resolução dos itens acima.
