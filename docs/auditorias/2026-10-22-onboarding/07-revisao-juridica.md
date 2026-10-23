# Relatório — Frente A: Revisão Jurídica Independente das Teses do Onboarding

**Projeto:** DefesAi / AdeusMultas  
**Repositório:** `Tokenizaa/AdeusMultas-Defesa-`  
**Branch:** `main` — **SHA:** `cd16284`  
**Data:** 23/10/2026  
**Arquivo fonte:** `src/core/onboarding/legal-validation.ts`  
**Arquivo de regras:** `src/core/rules/rule-engine.ts`  
**Arquivo de catálogo:** `src/core/arguments/arguments-catalog.ts`

---

## 0. Resumo Executivo

Esta frente realizou a revisão jurídica das **8 teses mapeadas** em `LEGAL_THESES_VALIDATION` e investigou as **teses não mapeadas** presentes no `rule-engine.ts` e no `arguments-catalog.ts`.

**Resultado:** 1 de 8 teses teve sua fonte oficial confirmada via documento publicado no site do Planalto (Lei 14.071/2020). As demais 7 teses não puderam ter suas fontes oficiais verificadas devido a limitações de acesso (sites do CONTRAN e STJ não respondem a requisições automatizadas; buscas por keyword não retornaram resultados). Nenhuma tese foi declarada "juridicamente certificada" — todas as 7 não verificadas estão classificadas como **não verificadas**.

**Limite de competência:** Esta revisão é feita por automação e não equivale a parecer jurídico profissional independente. Questões que exigem advogado com experiência em Direito de Trânsito estão explicitamente identificadas.

---

## 1. Teses Mapeadas — Revisão Individual

### 1.1 ARG-051 — Conversão em Advertência por Escrito (Art. 267 CTB)

| Item | Conteúdo |
|------|----------|
| **Alegação na UI** | "Infrações leves ou médias sem reincidência nos últimos 12 meses são candidatas à conversão em advertência por escrito, sem multa e sem pontos, se confirmada pelo órgão autuador." |
| **Norma aplicável** | Código de Trânsito Brasileiro (CTB), Art. 267, caput |
| **Fonte oficial consultada** | Lei nº 14.071, de 13 de outubro de 2020 — Planalto.gov.br |
| **URL** | https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/L14071.htm |
| **Data de consulta** | 23/10/2026 |
| **Vigência** | ✅ Em vigor |
| **Texto legal** | "Deverá ser imposta a penalidade de advertência por escrito à infração de natureza leve ou média, passível de ser punida com multa, caso o infrator não tenha cometido nenhuma outra infração nos últimos 12 (doze) meses." |
| **Fatos necessários** | 1. Infração de natureza leve ou média; 2. Passível de punição com multa; 3. Não reincidência nos últimos 12 meses |
| **Limitações identificadas** | A conversão depende de análise e confirmação pelo órgão autuador (não é automática); o motor não verifica o requisito "passível de ser punida com multa"; a não reincidência é autodeclarada pelo usuário; o extrato de prontuário deve ser comprobatório |
| **Implementação no motor** | `RULE_CONVERSAO_ADVERTENCIA_267` (linha 122 de rule-engine.ts) — implementação FAIL CLOSED, verifica severidade via catálogo e reincidência via `hasPreviousInfractionsLast12Months === false`. Não verifica "passível de ser punida com multa". |
| **Veredito** | **Parcialmente correta** — a tese tem lastro legal, mas a implementação no motor omite a verificação do requisito "passível de ser punida com multa" e a alegação na UI omite que depende de confirmação do órgão autuador. |
| **Correção necessária** | Já aplicada em `cd16284`: o texto da UI foi alterado para "se confirmada pelo órgão autuador". Ainda pendente: adicionar verificação de "passível de ser punida com multa" no motor. |

---

### 1.2 ARG-001 — Radar sem Aferição (Res. CONTRAN 798/2020)

| Item | Conteúdo |
|------|----------|
| **Alegação na UI** | "O radar precisa passar por vistoria oficial (INMETRO/IPEM) no máximo uma vez por ano; sem ela em dia, a multa pode ser cancelada." |
| **Norma aplicável** | Resolução CONTRAN nº 798/2020, Art. 4º, III; Anexo II |
| **Fonte oficial consultada** | ❌ Não acessível (site do CONTRAN não responde; busca por keyword no DOU retornou 0 resultados para "Resolução CONTRAN nº 798/2020") |
| **URL** | Não obtida |
| **Data de consulta** | 23/10/2026 |
| **Vigência** | Não verificada |
| **Fatos necessários** | 1. Infração por excesso de velocidade; 2. Data da última aferição do radar; 3. Data da infração |
| **Limitações identificadas** | A ausência de aferição é um argumento, não anulação automática; certidão do INMETRO necessária para comprovar |
| **Implementação no motor** | `RULE_RADAR_CALIBRACAO_12M` (linha 78 de rule-engine.ts) — verifica se `radarCalibrationDate` é > 365 dias antes da data da infração. Estatutory basis: "Art. 280, §2º do CTB c/c Resolução CONTRAN nº 798/2020, Art. 4º, III". |
| **Veredito** | **Não verificado** — fonte oficial não acessível |
| **Correção necessária** | Pendente de verificação de fonte oficial |

---

### 1.3 ARG-002 — Ausência de Placa R-19 (CTB Art. 90)

| Item | Conteúdo |
|------|----------|
| **Alegação na UI** | "A ausência de placa de velocidade regulamentar (R-19) visível antes do radar pode gerar inexigibilidade da sanção." |
| **Norma aplicável** | CTB Art. 90; c/c Resolução CONTRAN nº 798/2020 |
| **Fonte oficial consultada** | ❌ Não acessível |
| **URL** | Não obtida |
| **Data de consulta** | 23/10/2026 |
| **Vigência** | Não verificada |
| **Fatos necessários** | 1. Infração por radar de velocidade; 2. Ausência de comprovação de placa R-19 |
| **Limitações identificadas** | É necessário comprovar fotograficamente a ausência da placa; a placa deve estar na distância correta prevista na resolução |
| **Implementação no motor** | `RULE_SINALIZACAO_INSUFICIENTE_90` (linha 240 de rule-engine.ts) — verifica `hasR19SignageProof === false`. Estatutary basis: "Artigo 90 do CTB c/c Resolução CONTRAN nº 798/2020". |
| **Veredito** | **Não verificado** — fonte oficial não acessível |
| **Correção necessária** | Pendente de verificação de fonte oficial |

---

### 1.4 ARG-005 — Velocidade Considerada / Margem de Erro (Res. CONTRAN 798/2020)

| Item | Conteúdo |
|------|----------|
| **Alegação na UI** | "A velocidade considerada para a multa deve ser a medida bruta menos a margem de erro metrológica (7 km/h até 100 km/h; 7% acima)." |
| **Norma aplicável** | Resolução CONTRAN nº 798/2020, Anexo II, Tabela I |
| **Fonte oficial consultada** | ❌ Não acessível |
| **URL** | Não obtida |
| **Data de consulta** | 23/10/2026 |
| **Vigência** | Não verificada |
| **Fatos necessários** | 1. Velocidade medida; 2. Velocidade considerada; 3. Limite da via |
| **Limitações identificadas** | Se os três números não forem informados, a validação aritmética não pode ser feita; a margem de 7 km/h aplica-se apenas até 100 km/h; acima, é 7% |
| **Implementação no motor** | `RULE_INMETRO_CONSIDERED_SPEED_ERROR` (linha 276 de rule-engine.ts) — compara measuredSpeed, consideredSpeed e speedLimit. Estatutary basis: "Art. 280, §2º do CTB c/c Resolução CONTRAN nº 798/2020, Tabela I". |
| **Veredito** | **Não verificado** — fonte oficial não acessível |
| **Correção necessária** | Pendente de verificação de fonte oficial |

---

### 1.5 ARG-048 — Decadência (CTB Art. 281, §1º, II)

| Item | Conteúdo |
|------|----------|
| **Alegação na UI** | "Se a Notificação de Autuação for expedida após 30 dias da data da infração, opera-se a decadência do direito punitivo." |
| **Norma aplicável** | CTB Art. 281, §1º, II; c/c Súmula 312 STJ |
| **Fonte oficial consultada** | ❌ Parcial — Art. 281-A confirmado via Planalto (é sobre prazo de defesa prévia, não decadência); Art. 281 parágrafo único II não localizado no texto obtido |
| **URL** | https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/L14071.htm (parcial) |
| **Data de consulta** | 23/10/2026 |
| **Vigência** | Não verificada para o dispositivo específico |
| **Fatos necessários** | 1. Data da ocorrência/infração; 2. Data de expedição da Notificação de Autuação |
| **Limitações identificadas** | A data de entrega da notificação não substitui a de expedição para esse cálculo; a decadência resulta em arquivamento compulsório |
| **Implementação no motor** | `RULE_DECADENCIA_30_DIAS` (linha 38 de rule-engine.ts) — verifica se `diffDays > 30` entre `infractionDate` e `notificationExpeditionDate`. Estatutary basis: "Artigo 281, Parágrafo Único, Inciso II do CTB c/c Súmula 312 do STJ". |
| **Veredito** | **Não verificado** — fonte oficial do dispositivo específico não acessível; Súmula 312 STJ não acessível |
| **Correção necessária** | Pendente de verificação de fonte oficial |

---

### 1.6 ARG-025 — Lei Seca sem Termo (Res. CONTRAN 432/2013)

| Item | Conteúdo |
|------|----------|
| **Alegação na UI** | "Recusa ao teste de bafômetro (Art. 165-A) sem Termo de Constatação de Sinais Psicomotores (Anexo II da Res. 432/2013) pode gerar nulidade do procedimento." |
| **Norma aplicável** | Resolução CONTRAN nº 432/2013, Art. 5º e Anexo II; CTB Arts. 165 e 165-A |
| **Fonte oficial consultada** | ❌ Não acessível |
| **URL** | Não obtida |
| **Data de consulta** | 23/10/2026 |
| **Vigência** | Não verificada |
| **Fatos necessários** | 1. Recusa ao teste; 2. Classificação como Art. 165; 3. Ausência do termo de sinais psicomotores |
| **Limitações identificadas** | Não se aplica a recusa classificada como Art. 165-A com apenas um sinal; necessário conferir o AIT e o processo administrativo |
| **Implementação no motor** | `RULE_LEI_SECA_TERMO_432` (linha 166 de rule-engine.ts) — verifica `refusalClassifiedUnderArt165 && ctx.hasPsychomotorTerm === false`. Estatutary basis: "Arts. 165 e 165-A do CTB c/c Resolução CONTRAN nº 432/2013 e Manual Brasileiro de Fiscalização de Trânsito". |
| **Veredito** | **Não verificado** — fonte oficial não acessível |
| **Correção necessária** | Pendente de verificação de fonte oficial |

---

### 1.7 ARG-015 — Celular sem Abordagem (Res. CONTRAN 985/2022)

| Item | Conteúdo |
|------|----------|
| **Alegação na UI** | "Autuação por celular sem abordagem e sem descrição circunstanciada (Res. 985/2022) pode ser nula por vício formal de motivação." |
| **Norma aplicável** | Resolução CONTRAN nº 985/2022 (MBFT), Ficha 736-62 |
| **Fonte oficial consultada** | ❌ Não acessível |
| **URL** | Não obtida |
| **Data de consulta** | 23/10/2026 |
| **Vigência** | Não verificada |
| **Fatos necessários** | 1. Infração por celular (código 736-62); 2. Sem abordagem presencial; 3. Campo de observações vago/genérico |
| **Limitações identificadas** | Aplica-se apenas a flagrantes à distância sem abordagem; o agente deve descrever ângulo de visão e motivo da não abordagem |
| **Implementação no motor** | `RULE_AUTUACAO_SEM_ABORDAGEM_MBFT` (linha 208 de rule-engine.ts) — verifica `normalizedCode === '73662' && ctx.hasAgentDetailedObservations === false`. Estatutary basis: "Resolução CONTRAN nº 985/2022 (Manual Brasileiro de Fiscalização de Trânsito), Ficha 736-62". |
| **Veredito** | **Não verificado** — fonte oficial não acessível |
| **Correção necessária** | Pendente de verificação de fonte oficial |

---

### 1.8 RULE_CONSTITUTIONAL_DUE_PROCESS — Dupla Notificação (Súmula 312 STJ)

| Item | Conteúdo |
|------|----------|
| **Alegação na UI** | "A violação da dupla notificação (Súmula 312 STJ) só se afirma com prova de não entrega da Notificação de Autuação." |
| **Norma aplicável** | Súmula 312 do STJ |
| **Fonte oficial consultada** | ❌ Não acessível (site do STJ não retornou conteúdo) |
| **URL** | Não obtida |
| **Data de consulta** | 23/10/2026 |
| **Vigência** | Não verificada |
| **Fatos necessários** | 1. Data de expedição da NA; 2. Data de entrega da NA |
| **Limitações identificadas** | A ausência da data de entrega não é prova de não entrega (é DATA_GAP); não há vício sem prova de não entrega |
| **Implementação no motor** | Regra embutida no método `evaluate` do `ExpertRuleEngine` (linhas 860-888 de rule-engine.ts) — não é uma `RuleModel` separada. Verifica `notificationExpeditionDate` e `notificationDeliveryDate`. |
| **Veredito** | **Não verificado** — fonte oficial não acessível |
| **Correção necessária** | Pendente de verificação de fonte oficial |

---

## 2. Teses Não Mapeadas Identificadas

As seguintes teses estão presentes no `arguments-catalog.ts` e/ou usadas pelo `rule-engine.ts` mas **não estão mapeadas** em `LEGAL_THESES_VALIDATION`:

| Tese | Usada pelo motor? | Fonte no código | Status |
|------|-------------------|-----------------|--------|
| ARG-003 | Não | arguments-catalog.ts | Não mapeada |
| ARG-004 | Não | arguments-catalog.ts | Não mapeada |
| ARG-006 | Sim (`RULE_PHOTO_PROOF_REQUIRED`) | rule-engine.ts linha 348 | Não mapeada |
| ARG-007 | Não | arguments-catalog.ts | Não mapeada |
| ARG-008 | Não | arguments-catalog.ts | Não mapeada |
| ARG-009 | Sim (`RULE_PHOTO_PROOF_REQUIRED`) | rule-engine.ts linha 348 | Não mapeada |
| ARG-010 | Sim (`RULE_SEMAFORO_TEMPO_AMARELO`) | rule-engine.ts linha 443 | Não mapeada |
| ARG-011 | Não | arguments-catalog.ts | Não mapeada |
| ARG-012 | Não | arguments-catalog.ts | Não mapeada |
| ARG-013 | Não | arguments-catalog.ts | Não mapeada |
| ARG-014 | Não | arguments-catalog.ts | Não mapeada |
| ARG-016 | Não | arguments-catalog.ts | Não mapeada |
| ARG-017 | Não | arguments-catalog.ts | Não mapeada |
| ARG-018 | Não | arguments-catalog.ts | Não mapeada |
| ARG-019 | Sim (`RULE_CELULAR_VIVA_VOZ`) | rule-engine.ts linha 474 | Não mapeada |
| ARG-020 | Sim (`RULE_ESTACIONAMENTO_SEM_SIN_R6A`) | rule-engine.ts linha 582 | Não mapeada |
| ARG-021 | Não | arguments-catalog.ts | Não mapeada |
| ARG-022 | Não | arguments-catalog.ts | Não mapeada |
| ARG-023 | Não | arguments-catalog.ts | Não mapeada |
| ARG-024 | Sim (`RULE_ESTACIONAMENTO_VAGA_ESPECIAL`) | rule-engine.ts linha 509 | Não mapeada |
| ARG-026 | Não | arguments-catalog.ts | Não mapeada |
| ARG-027 | Sim (`RULE_ALCOLEMAIA_RECUISA`) | rule-engine.ts linha 541 | Não mapeada |
| ARG-028 | Não | arguments-catalog.ts | Não mapeada |
| ARG-029 | Não | arguments-catalog.ts | Não mapeada |
| ARG-030 | Não | arguments-catalog.ts | Não mapeada |
| ARG-031 | Não | arguments-catalog.ts | Não mapeada |
| ARG-032 | Não | arguments-catalog.ts | Não mapeada |
| ARG-033 | Não | arguments-catalog.ts | Não mapeada |
| ARG-034 | Não | arguments-catalog.ts | Não mapeada |
| ARG-035 | Não | arguments-catalog.ts | Não mapeada |
| ARG-036 | Não | arguments-catalog.ts | Não mapeada |
| ARG-037 | Não | arguments-catalog.ts | Não mapeada |
| ARG-038 | Não | arguments-catalog.ts | Não mapeada |
| ARG-039 | Não | arguments-catalog.ts | Não mapeada |
| ARG-040 | Não | arguments-catalog.ts | Não mapeada |
| ARG-041 | Não | arguments-catalog.ts | Não mapeada |
| ARG-042 | Não | arguments-catalog.ts | Não mapeada |
| ARG-043 | Não | arguments-catalog.ts | Não mapeada |
| ARG-044 | Não | arguments-catalog.ts | Não mapeada |
| ARG-045 | Não | arguments-catalog.ts | Não mapeada |
| ARG-046 | Não | arguments-catalog.ts | Não mapeada |
| ARG-047 | Não | arguments-catalog.ts | Não mapeada |
| ARG-049 | Sim (`RULE_FORMAL_VALIDATIONS`) | rule-engine.ts linha 617 | Não mapeada |
| ARG-050 | Não | arguments-catalog.ts | Não mapeada |
| ARG-052 | Não | arguments-catalog.ts | Não mapeada |

**Total:** 44 teses não mapeadas, das quais 9 são usadas pelo motor de regras.

---

## 3. Questões que Exigem Advogado Independente

As seguintes questões **não podem ser resolvidas por automação** e requerem parecer de advogado com experiência em Direito de Trânsito:

1. **Verificação de vigência das resoluções CONTRAN** — 7 resoluções (798/2020, 432/2013, 985/2022, 973/2022, 965/2022, 966/2022, 918/2022) não puderam ter sua vigência confirmada via fontes oficiais acessíveis.
2. **Interpretação do Art. 267 CTB** — embora o texto legal esteja confirmado, a aplicação prática (o que constitui "passível de ser punida com multa") requer interpretação jurídica.
3. **Validade da Súmula 312 STJ** — não foi possível acessar o site do STJ para confirmar o conteúdo e vigência da súmula.
4. **Adequação das statutoryBasis das regras** — as referências legais embutidas nas regras do motor (ex: "Art. 280, §2º do CTB c/c Resolução CONTRAN nº 798/2020, Art. 4º, III") não puderam ser verificadas contra fontes oficiais.

---

## 4. Correções Aplicadas

Nenhuma correção de código foi aplicada nesta frente (as correções de copy já foram aplicadas no commit `cd16284`). As seguintes correções estão **pendentes**:

| Correção | Prioridade | Status |
|----------|-----------|--------|
| Verificar fontes oficiais das 7 teses não verificadas | Alta | Pendente (bloqueado por acesso) |
| Adicionar verificação de "passível de ser punida com multa" no `RULE_CONVERSAO_ADVERTENCIA_267` | Média | Pendente |
| Mapear as 9 teses usadas pelo motor mas não em `LEGAL_THESES_VALIDATION` | Média | Pendente |

---

## 5. Conclusão

**Não é possível declarar o produto juridicamente certificado.** Apenas 1 de 8 teses (ARG-051) teve sua fonte oficial confirmada. As demais 7 teses não puderam ser verificadas devido a limitações de acesso a fontes oficiais (CONTRAN, STJ, DOU). As 44 teses não mapeadas também não foram revisadas.

**Próximos passos:**
1. Acessar fontes oficiais diretamente (site do CONTRAN, STJ, DOU) para verificar as 7 teses restantes
2. Mapear as 9 teses usadas pelo motor mas não em `LEGAL_THESES_VALIDATION`
3. Obter parecer de advogado independente para validar as interpretações jurídicas

---

**Evidências:**
- `src/core/onboarding/legal-validation.ts` — critérios de validação jurídica
- `src/core/rules/rule-engine.ts` — implementação das regras (linhas 38, 78, 122, 166, 208, 240, 276)
- `src/core/arguments/arguments-catalog.ts` — catálogo de 52 teses (ARG-001 a ARG-052)
- Lei 14.071/2020 — https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/L14071.htm (Art. 267 confirmado)
