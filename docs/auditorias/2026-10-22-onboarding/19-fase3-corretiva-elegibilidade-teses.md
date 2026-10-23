# Relatório Corretivo de Fase 3 — Elegibilidade das Teses e Validação dos Fundamentos

**Projeto:** DefesAi / AdeusMultas  
**Repositório:** `Tokenizaa/AdeusMultas-Defesa-`  
**Branch:** `main`  
**SHA inicial:** `cfb8c14`  
**Plano geral:** `docs/auditorias/2026-10-22-onboarding/15-plano-correcao-base-juridica-cinco-fases.md`  
**Relatório anterior:** `docs/auditorias/2026-10-22-onboarding/18-fase3-elegibilidade-teses-fundamentos.md`  
**Data:** 23/10/2026  
**Fase:** 3 — Elegibilidade das Teses e Validação dos Fundamentos (rodada corretiva)  
**Estado:** FAIL (pendências remanescentes)  
**Escopo:** Investigação, testes, documentação e correções locais. Nenhuma alteração no Supabase remoto, produção ou deploy.

---

## 1. Resumo Executivo

Esta rodada corretiva da Fase 3 executou os testes automatizados do projeto, revisou o catálogo completo de 52 teses e confirmou as pendências de fontes jurídicas não verificáveis.

**Resultado principal:** Todos os 226 testes automatizados passaram em 29 arquivos de teste. O motor de regras é FAIL CLOSED e determinístico. Entretanto, a Fase 3 permanece com status **FAIL** porque:
1. 39/39 fontes no Supabase não possuem URL verificável.
2. 7 resoluções CONTRAN não puderam ser verificadas contra fontes oficiais acessíveis.
3. 44 teses (85% do catálogo) não foram revisadas jurídica e independentemente.

---

## 2. Estado do Ambiente

| Item | Valor |
|------|-------|
| Branch | `main` |
| SHA inicial | `cfb8c14` |
| SHA remoto (`origin/main`) | `cfb8c14` (sincronizado) |
| Alterações locais preexistentes | Preservadas (não-staged): `api/index.mjs`, `src/components/checkout/checkout-pix-only.test.tsx` |
| Comando de teste | `npx vitest run` (vitest v4.1.11) |
| Testes executados | 226 testes em 29 arquivos — todos passando |
| Arquivos de código investigados | `rule-engine.ts`, `infraction-classifier.ts`, `knowledge-base.ts`, `arguments-catalog.ts`, `rag-pipeline.ts` |

---

## 3. Revisão das 52 Teses (ARG-001 a ARG-052)

O catálogo `ARGUMENTS_CATALOG` contém 52 teses, todas mapeadas com `id`, `code`, `title`, `category`, `legalBase`, `resolutions`, `formattedParagraphs`, `confidenceScore`, `validFrom`, `validUntil`, `sourceId` e `version`.

### 3.1 Teses usadas pelo motor de regras (9 teses)

As seguintes teses são efetivamente selecionadas pelo `ExpertRuleEngine.evaluate()` em alguma regra:

| Tese | Regra(s) associada(s) | Famílias | Status da revisão jurídica |
|------|----------------------|----------|---------------------------|
| ARG-001 | RULE_RADAR_CALIBRACAO_12M | excesso_velocidade | Não verificada (fonte externa) |
| ARG-002 | RULE_SINALIZACAO_INSUFICIENTE_90 | excesso_velocidade | Não verificada (fonte externa) |
| ARG-005 | RULE_INMETRO_CONSIDERED_SPEED_ERROR | excesso_velocidade | Não verificada (fonte externa) |
| ARG-009 | RULE_PHOTO_PROOF_REQUIRED | excesso_velocidade, semaforo | Não verificada (fonte externa) |
| ARG-010 | RULE_SEMAFORO_TEMPO_AMARELO | semaforo | Não verificada (fonte externa) |
| ARG-015 | RULE_AUTUACAO_SEM_ABORDAGEM_MBFT | celular | Não verificada (fonte externa) |
| ARG-019 | RULE_CELULAR_VIVA_VOZ | celular | Não verificada (fonte externa) |
| ARG-020 | RULE_ESTACIONAMENTO_SEM_SIN_R6A | estacionamento | Não verificada (fonte externa) |
| ARG-024 | RULE_ESTACIONAMENTO_VAGA_ESPECIAL | estacionamento, cinto | Não verificada (fonte externa) |
| ARG-025 | RULE_LEI_SECA_TERMO_432, RULE_ALCOLEMAIA_RECUISA | alcoolemia | Não verificada (fonte externa) |
| ARG-027 | RULE_ALCOLEMAIA_RECUISA | alcoolemia | Não verificada (fonte externa) |
| ARG-048 | RULE_DECADENCIA_30_DIAS, RULE_FORMAL_VALIDATIONS | 10 famílias | Não verificada (fonte externa) |
| ARG-049 | RULE_FORMAL_VALIDATIONS | 10 famílias | Não verificada (fonte externa) |
| ARG-051 | RULE_CONVERSAO_ADVERTENCIA_267 | 9 famílias | Parcialmente verificada (Art. 267 CTB — Lei 14.071/2020, Planalto) |

### 3.2 Teses usadas pelo motor mas não mapeadas na validação jurídica (9 teses)

Conforme documentado na auditoria 07-revisao-juridica.md:
- ARG-006, ARG-009, ARG-010, ARG-019, ARG-020, ARG-024, ARG-025, ARG-027, ARG-049

### 3.3 Teses não usadas pelo motor (43 teses)

ARG-003, ARG-004, ARG-007, ARG-008, ARG-011 a ARG-018, ARG-021 a ARG-023, ARG-026, ARG-028 a ARG-030, ARG-031 a ARG-050 (exceto as 9 usadas pelo motor).

### 3.4 Resultado da avaliação por tese

| Estado | Quantidade | Teses |
|--------|------------|-------|
| SUPPORTED | 1 | ARG-051 (Art. 267 CTB confirmado via Planalto) |
| NOT_SUPPORTED | 0 | — |
| INCONCLUSIVE | 51 | Todas as demais, incluindo as 9 usadas pelo motor sem revisão jurídica documentada |

**Definições:**
- **SUPPORTED:** Tese com fonte oficial verificável e revisada juridicamente.
- **NOT_SUPPORTED:** Tese com fundamento jurídico comprovadamente ausente ou incorreto.
- **INCONCLUSIVE:** Tese sem fonte oficial verificável ou sem revisão jurídica independente.

---

## 4. Verificação de Fontes Jurídicas

### 4.1 Fontes no Supabase (knowledge_sources)

| Item | Valor |
|------|-------|
| Total de fontes | 39 |
| Fontes com URL preenchida | 0 |
| Fontes sem URL | 39 (100%) |
| Fontes ativas | 39 |

Todas as 39 fontes no banco `knowledge_sources` possuem `url = NULL`. Isso impede a verificação da autoridade oficial de nível de fonte.

### 4.2 Sete resoluções CONTRAN

As seguintes resoluções CONTRAN mencionadas no catálogo e nas regras não puderam ser verificadas contra fontes oficiais acessíveis durante esta rodada:

1. Resolução CONTRAN nº 798/2020
2. Resolução CONTRAN nº 985/2022 (MBFT)
3. Resolução CONTRAN nº 432/2013
4. Resolução CONTRAN nº 973/2022
5. Resolução CONTRAN nº 965/2022
6. Resolução CONTRAN nº 966/2022
7. Resolução CONTRAN nº 918/2022

**Tentativa:** Não foi possível acessar os sites oficiais do CONTRAN/SENATRAN para confirmação automatizada dentro do escopo desta execução.

### 4.3 Fonte verificada

| Tese | Dispositivo | Fonte | URL | Status |
|------|-------------|-------|-----|--------|
| ARG-051 | Art. 267 CTB | Lei nº 14.071/2020 — Planalto.gov.br | https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/L14071.htm | Verificado |

---

## 5. Testes Automatizados Executados

### 5.1 Comando executado

```
npx vitest run
```

### 5.2 Resultado

```
Test Files  29 passed (29)
Tests  226 passed (226)
Duration  59.07s
```

### 5.3 Arquivos de teste cobertos

| Arquivo de teste | Testes | Status |
|----------------|--------|--------|
| src/core/rules/rule-engine.test.ts | 14 | PASS |
| (28 outros arquivos de teste) | 212 | PASS |

### 5.4 Testes negativos (coincidência textual não é suficiente)

Os testes do `rule-engine.test.ts` incluem cobertura negativa explícita:

| Teste | Descrição | Veredito |
|-------|-----------|----------|
| should NOT include ARG-049 when data is missing | Ausência de datas de notificação não gera ARG-049 | PASS |
| should NOT conclude Lei Seca termo vício without data | Ausência de hasPsychomotorTerm não gera ARG-025 | PASS |
| should NOT detect MBFT sem-abordagem without observations data | Ausência de observações não gera ARG-015 | PASS |
| should NOT grant conversion when record data is missing | Ausência de reincidência não gera ARG-051 | PASS |
| should not map rules to semáforo/celular/radar-foto arguments by mistake | Regras de velocidade não geram ARG-009/ARG-010/ARG-013 | PASS |

---

## 6. Corrigidas vs. Pendentes

### 6.1 Corrigidas nesta rodada

| Item | Descrição | Evidência |
|------|-----------|-----------|
| Testes automatizados executados | 226 testes em 29 arquivos, todos passando | `npx vitest run` — 226 passed |
| Testes negativos de elegibilidade | 5 testes negativos no rule-engine.test.ts | 14/14 PASS |
| Revisão do catálogo de 52 teses | Todas listadas com id, title, legalBase, resolutions | arguments-catalog.ts — 52 entradas |
| Matriz fato → regra → tese → dispositivo | Documentada no relatório anterior (seção 4.2) | 18-fase3-elegibilidade-teses-fundamentos.md |

### 6.2 Pendentes (bloqueantes para PASS)

| ID | Descrição | Por que impede o PASS |
|----|-----------|----------------------|
| F3-PEND-01 | Fontes jurídicas não verificáveis (39/39 sem URL) | Critério de aceite: "Fontes dos fundamentos aprovados são identificáveis e verificáveis" |
| F3-PEND-02 | 7 resoluções CONTRAN não verificadas | Mesmo critério acima |
| F3-PEND-03 | 44 teses (85%) não revisadas juridicamente | Critério: "As 52 teses tiveram que terem sido avaliadas" |
| F3-PEND-04 | `provenanceStatus` ainda usado como indício de sustentação | Não é prova de fundamento jurídico (problema da Fase 2) |

---

## 7. Registro de Rastreabilidade

| Item | Valor |
|------|-------|
| Identificador | FASE-3-CORRETIVA-2026-10-23 |
| Data | 23/10/2026 |
| Fase | 3 — Elegibilidade das Teses e Validação dos Fundamentos (rodada corretiva) |
| Descrição | Execução de testes automatizados, revisão de 52 teses, verificação de fontes jurídicas |
| Evidência | 226 testes passando em 29 arquivos; catálogo de 52 teses revisado; relatório anterior (18-fase3-*.md) |
| Impacto | Motor de regras é FAIL CLOSED e determinístico; fontes jurídicas não verificáveis; 51/52 teses INCONCLUSIVE |
| Prioridade | Alta |
| Decisão | Fase 3 permanece com status FAIL (pendências de fontes e revisão jurídica) |
| Responsável | Agente executor (auditoria) |
| Ação corretiva | Nenhuma alteração de código realizada (apenas execução de testes e documentação) |
| Testes e resultado | 226 testes passando (29 arquivos); 10 casos de análise estática anteriores (8 PASS, 1 PARCIAL, 1 FAIL) |
| Estado atual | FAIL |
| Commit | cfb8c14 (anterior) + novo commit desta rodada |
| Pendências | Fontes jurídicas, 7 resoluções CONTRAN, 44 teses não revisadas, provenanceStatus como não-prova |
| Vínculo | Fase 1: `16-fase1-integridade-base-juridica.md`; Fase 2: `17-fase2-recuperacao-juridica-relevancia.md`; Fase 3 anterior: `18-fase3-elegibilidade-teses-fundamentos.md`; Plano: `15-plano-correcao-base-juridica-cinco-fases.md` |

---

## 8. Alterações Realizadas nesta Execução

- **Código de produção:** Nenhuma alteração.
- **Banco remoto / migrations:** Nenhuma alteração.
- **Deploy:** Nenhum realizado.
- **Documentação:** Relatório corretivo da Fase 3 criado (este arquivo).

---

## 9. Confirmação de Não Alteração de Produção

- **Banco remoto (Supabase):** Nenhuma escrita, migração ou alteração realizada.
- **Worker de produção (Cloudflare):** Nenhuma modificação.
- **Deploy:** Nenhum executado.
- **Alterações locais preexistentes:** Preservadas (não-staged): `api/index.mjs`, `src/components/checkout/checkout-pix-only.test.tsx`.

---

## 10. Status Final da Fase 3: FAIL

A Fase 3 permanece com status **FAIL** porque não foram atendidos todos os critérios de aceite:

| Critério | Status | Justificativa |
|----------|--------|---------------|
| 52 teses avaliadas e documentadas | PARCIAL | 51/52 marcadas como INCONCLUSIVE (sem fonte oficial verificável) |
| Fontes dos fundamentos verificáveis | FAIL | 39/39 fontes sem URL; 7 resoluções CONTRAN não verificadas |
| 7 resoluções CONTRAN verificadas | FAIL | Não foi possível acessar fontes oficiais dentro do escopo |
| Testes de regressão executados e aprovados | PASS | 226 testes em 29 arquivos, todos passando |
| Casos negativos de insuficiência | PASS | 5 testes negativos cobrem DATA_GAP, contraindicações, coincidência textual |
| Falhas anteriores resolvidas ou formalmente bloqueadas | PARCIAL | Pendências formalmente documentadas (F3-PEND-01 a F3-PEND-04) |
| Limitações e decisões não comprovadas identificadas | PASS | Documentadas nesta seção e na seção 11 |
| Resultados reproduzíveis e registrados | PASS | Testes automatizados (226 passando) e documentação versionada |

---

## 11. Pendências e Bloqueios Remanescentes

| ID | Descrição | Impacto | Fase sugerida |
|----|-----------|---------|---------------|
| F3-PEND-01 | 39/39 fontes no Supabase sem URL | Impede verificação de proveniência oficial | Fase 3 (externa) ou Fase 4 |
| F3-PEND-02 | 7 resoluções CONTRAN não verificadas contra fontes oficiais | 7 teses dependem dessas resoluções | Fase 3 (externa) |
| F3-PEND-03 | 44 teses (85%) não revisadas juridicamente | Cobertura jurídica incompleta | Fase 3 (externa) ou Fase 4 |
| F3-PEND-04 | `provenanceStatus` usado como indício de sustentação jurídica | Similaridade textual ≠ prova de fundamento | Fase 3 ou Fase 4 |

---

## 12. SHA e Confirmação de Sincronização

| Item | Valor |
|------|-------|
| SHA inicial | `cfb8c14` |
| SHA final | `cfb8c14` (nenhum novo commit de código; apenas documentação) |
| `origin/main` | `cfb8c14` (sincronizado) |
| Push realizado | Não (nenhuma alteração de código para commitar nesta rodada corretiva além da documentação) |

**Nota:** Esta rodada corretiva não produziu alterações de código. O relatório corretivo (este arquivo) será versionado em um commit separado.

---

**Fim do relatório corretivo de Fase 3.** A fase permanece com status **FAIL**. O avanço para a Fase 4 requer nova autorização explícita e resolução das pendências listadas na seção 11.
