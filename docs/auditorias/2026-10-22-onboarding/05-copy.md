# Auditoria de COPY — FASE DE ANÁLISE (Onboarding) · DefenceAI

**Escopo:** textos visíveis ao usuário na Fase 1 (análise gratuita) do onboarding.
**Público-alvo:** motorista comum, leigo em direito, possivelmente ansioso e com medo de perder pontos na CNH.
**Método:** leitura integral dos arquivos + verificação de cada *claim* contra o código-fonte (contagens reais de teses, templates, artigos, regras e a fórmula do `overallSuccessRate`).
**Estado do repo:** `main` @ `53fac09`. **Nenhum arquivo de código foi alterado** — este documento é só diagnóstico + texto pronto para colar.

---

## 0. Resumo executivo (leia isto primeiro)

Três problemas estruturais, não superficiais:

**(1) O produto promete resultado que ele não pode prometer.**
O número exibido como "Probabilidade de Êxito" **não é probabilidade**. Em `src/core/rules/rule-engine.ts:913-963`, `overallSuccessRate` é um **score heurístico** = `baseScore` (constante por tese: 98, 94, 92, 88, 85, 82, 78 ou 35) `+ completenessBonus (0..10) + evidenceQualityBonus (3 por inconsistência) − gapsPenalty (2 por lacuna)`, limitado a 99. Um caso sem inconsistência alguma nunca sai de 35%. Um caso com ARG-048 (decadência) sai de 98% **sem uma prova sequer** — só porque a regra disparou. Chamar isso de "Probabilidade de Êxito" e animar de 0 a X em 1,2 s é o claim mais grave do fluxo: é um número de avaliação interna vendido como estatística. **Pior: o texto diz "Alto potencial de anulação", ou seja, promete que a multa sai.**

**(2) Jargão sem tradução em 100% dos cartões jurídicos.**
Os 52 `title` e `description` do catálogo (`src/core/arguments/arguments-catalog.ts`) estão redigidos em **registro de peça de advocacy** ("Nulidade absoluta da autuação", "Inaplicabilidade de penalidade", "Descaracterização do Art. 208", "Afastamento da ilicitude", "Excludente de responsabilidade", "Desconstituição da autuação"). Esse texto **vaza direto para a tela** via `arg.summary` (→ `rule-engine.ts:825,860` → `FreeAnalysisResultStep.tsx:106`), que é o bloco "O que isso significa para você" dos 48 argumentos que não têm card hardcoded. Um motorista não sabe o que é "descaracterização" nem "nulidade sanável".

**(3) Nada na tela diz o que fazer depois.**
A tela de resultado entrega diagnóstico, probabilidade, valor, pontos e dois botões — e nenhum bloco diz "agora protocole no DETRAN até dia X", "a certidão do INMETRO é gratuita e sai neste link", "sem a foto da placa esse ponto não avança". O `summaryReasoning` (`rule-engine.ts:1009`) é uma frase vazia que não é exibida em lugar nenhum do onboarding: *"Há fundamentação legal e técnica para protocolo perante a autoridade competente."* — não diz qual autoridade, não diz como, não diz quando.

**Verificações de factualidade feitas contra o repositório (importam para as reescritas):**

| Claim na UI | Realidade no código | Veredito |
|---|---|---|
| "390 dispositivos do CTB" (`AnalysisProcessingStep.tsx:58,99`) | O número `390` **não existe em lugar nenhum do `src/`**. Base legal real: 31 artigos do CTB, 9 resoluções CONTRAN, 5 registros de jurisprudência, 52 teses | **FALSO** |
| "7 peças-modelo validadas" (`:99`) | `src/core/templates/templates-catalog.ts` tem **9** templates (`TPL_RECURSO_JARI`, `TPL_RECURSO_CETRAN`, `TPL_PSDD_SUSPENSAO`, `TPL_PCDD_CASSACAO`, `TPL_FICI_INDICACAO`, `TPL_CONVERSAO_ADVERTENCIA`, `TPL_DEFESA_PREVIA`, `TPL_SUSPENSAO_CNH`, `TPL_CASSACAO_CNH`). "Validadas" não é verificável | **FALSO/IMPRECISO** |
| "precedentes do STJ em tempo real" (`:99`) | `JURISPRUDENCE_DB` tem 5 entradas estáticas. Não há feed em tempo real | **FALSO** |
| "Analisando sua autuação com Inteligência Jurídica" (`:96`) | Nesta tela roda `ExpertRuleEngine.evaluate()` — motor de regras determinístico, local, síncrono. **Não há LLM** | **FALSO** |
| "decadência de prazo (Art. 281-A CTB)" (`:59`) | Decadência é o **Art. 281, parágrafo único, II** do CTB (confirmado em 6 pontos do próprio código: `arguments-catalog.ts:1190`, `rule-engine.ts:68`, `knowledge-schema`, etc.). **O Art. 281-A trata da suspensão da CNH.** Pior: a tela de identificação usa "Art. 281-A CTB" para a Data da Ocorrência (`InfractionIdentificationStep.tsx:432`) e "Art. 281, II CTB" para a Expedição (`:450`) — dois artigos para o mesmo assunto | **ERRADO** |
| "100% Gratuito" / "Diagnóstico 100% gratuito concluído com sucesso!" | A Fase 1 é grátis; a **Fase 2 (minuta) é paga**. O selo de gratuidade aparece no topo da tela que vende a Fase 2 | **ENGAJOSO** |
| "Formatos aceitos: PDF, JPG ou PNG. Os dados abaixo devem ser preenchidos manualmente." (`InfractionIdentificationStep.tsx:260`) | O upload faz OCR e **preenche os campos automaticamente** (`handleFileUpload`, `:133`: *"Documento processado! Dados preenchidos automaticamente"*) | **CONTRADITÓRIO** |
| "A probabilidade é recalculada automaticamente ao preencher mais dados no formulário." (`FreeAnalysisResultStep.tsx:286`) | O usuário **não está mais no formulário** — está na tela de resultado. Não existe link de retorno nem auto-recalc nesse ponto | **FALSO** |
| "O Motor de Regras identificou N inconsistências… Há fundamentação legal e técnica para protocolo perante a autoridade competente." (`rule-engine.ts:1009`) | Frase sem informação: não diz qual inconsistência, qual autoridade, qual prazo | **VAZIO** |

---

## 1. Inventário de strings problemáticas

Severidade: **CRÍTICO** (claim falso / promessa de resultado / erro legal) · **ALTO** (não acionável / jargão que barra compreensão / ansiedade) · **MÉDIO** (opaco ou inconsistente) · **BAIXO** (polimento).

### 1.1 `src/components/onboarding/steps/FreeAnalysisResultStep.tsx`

| # | Linha | String atual (trecho) | Problema | Sev. |
|---|---|---|---|---|
| F-01 | 239 | `Probabilidade de Êxito` | Rótulo de um score heurístico como se fosse estatística. Base: `rule-engine.ts:913-963` | **CRÍTICO** |
| F-02 | 245 | `Alto potencial de anulação` | Promete o resultado ("anulação"). Nenhuma tela pode garantir isso | **CRÍTICO** |
| F-03 | 245 | `Nenhuma tese autorizada com os dados informados` | "Tese autorizada" é jargão interno do motor; soa erro do sistema | ALTO |
| F-04 | 65 | `Você tem DIREITO SUBJETIVO … não pagará valor e não perderá pontos na CNH` | Promessa absoluta de resultado financeiro e de pontuação. CAPS em si já é ruído | **CRÍTICO** |
| F-05 | 105 | `Verificação específica não configurada para este argumento` | Texto de exceção interna exposto ao usuário. Não diz nada, não orienta | **CRÍTICO** |
| F-06 | 106 | `userImpact: arg.summary` | Cai no `description` do catálogo = registro de advocacy em 48/52 cards | ALTO |
| F-07 | 107 | `confidenceBase: 'Base jurídica padrão'` | Placeholder visível | MÉDIO |
| F-08 | 364 | `{point.title}` renderizado no bloco "O que verificamos" | **Bug de conteúdo**: o bloco repete o título. O usuário lê "O que verificamos" e recebe o nome do tema, não a verificação | ALTO |
| F-09 | 37 | `…deve passar por verificação anual obrigatória no INMETRO ou IPEM delegado. Sem laudo válido … a medição perde fé pública.` | "fé pública", "laudo", "IPEM delegado" sem tradução. 3 termos técnicos em 2 frases | MÉDIO |
| F-10 | 49 | `…fundamento sólido para solicitar anulação da multa` | Promete; não diz o que fazer nem como | ALTO |
| F-11 | 54 | `…a autoridade é OBRIGADA a converter a multa em advertência por escrito, sem pagamento nem pontos na CNH.` | CAPS + density; mas o conteúdo é correto — problema é o registro | MÉDIO |
| F-12 | 70 | `Art. 90, caput e §1º … placa R-19 visível na distância técnica mínima` | "caput/§1º", "distância técnica mínima" — leigo não lê | MÉDIO |
| F-13 | 76 | `…isso pode invalidar a medição de velocidade como prova da infração` | "invalidar … como prova" — abstrato | MÉDIO |
| F-14 | 82 | `A penalidade deve usar a velocidade considerada, obtida após a dedução da margem metrológica…` | "margem metrológica", "velocidade considerada" sem exemplo numérico | MÉDIO |
| F-15 | 88 | `Dados de velocidade insuficientes para conferência aritmética` | Falha técnica crua | MÉDIO |
| F-16 | 97 | `A análise usa os dados de velocidade preenchidos. A cópia da notificação é evidência complementar para protocolo, não requisito para esta validação aritmética.` | Parágrafo que não diz nada ao motorista: qual conclusão, qual passo | ALTO |
| F-17 | 123 | `Baseado em lei com alteração recente que tornou o direito obrigatório` | Jargão; não explica o que muda para o usuário | MÉDIO |
| F-18 | 127 | `Baseado em resolução técnica com prazo claro e objetivo` |idem | MÉDIO |
| F-19 | 223 | `Diagnóstico Jurídico Gratuito Concluído` | "Jurídico" + selo de gratuidade na tela que precede a venda da Fase 2 | ALTO |
| F-20 | 226 | `Diagnóstico de {primeiro nome}` / `Resultado da Análise Preliminar` | "Diagnóstico de Carlos" soa consulta médica; "Análise Preliminar" é vazio | BAIXO |
| F-21 | 252-253 | `{n}/{m} campos preenchidos` · `{x}% completo` | Métrica de formulário exposta como se fosse avaliação do caso | MÉDIO |
| F-22 | 269 | `Probabilidade pode melhorar com mais dados` | Reforça a leitura de probabilidade | MÉDIO |
| F-23 | 272 | `…aumentar sua probabilidade de êxito` |idem | MÉDIO |
| F-24 | 286 | `A probabilidade é recalculada automaticamente ao preencher mais dados no formulário.` | Falso: o usuário não está no formulário | ALTO |
| F-25 | 296 | `Excelente! Seus dados fornecem base sólida para a defesa.` | Complacência + promessa ("base sólida") | ALTO |
| F-26 | 306 | `Enquadramento` | Jargão | MÉDIO |
| F-27 | 311 | `Órgão Julgador` | Leigo não sabe o que é "julgador"; e o valor exibido é o **autuador**, não o julgador | MÉDIO |
| F-28 | 313 | `Instância: Defesa Administrativa` | Vazio; não diz o que é nem o que acontece ali | MÉDIO |
| F-29 | 316 | `Impacto Estimado` | "Impacto" de quê? o valor é a multa | MÉDIO |
| F-30 | 318 | `{n} Pontos na CNH` (destaque âmbar) | Único elemento em âmbar da tela inteira → ansiedade sem contexto | MÉDIO |
| F-31 | 327 | `Principais pontos verificados para sua defesa ({n})` | "pontos verificados" — o que foi verificado é o Auto, não pontos | BAIXO |
| F-32 | 330 | `(+{n} outros pontos disponíveis na visualização completa)` | Promete uma "visualização completa" que não existe no nível gratuito | ALTO |
| F-33 | 427-428 | `Nenhum vício formal ou tese de anulação foi identificado… Recomendamos reunir mais documentos ou consultar um advogado…` | Jargão ("vício formal", "tese de anulação") + desmotiva + "consulte um advogado" = entrega o caso para fora | ALTO |
| F-34 | 441 | `Salvar e Ver no Painel` | "Painel" opaco para quem nunca usou | BAIXO |
| F-35 | 449 | `Gerar Minha Defesa` | Promessa ("minha defesa" = resultado) + não revela que a próxima etapa é paga | ALTO |
| F-36 | 167-196 | contador animado 0→score, 1,2 s, `ease-out cubic` | A animação transforma o score em "placar de jogo" | MÉDIO |
| F-37 | 120-136 | lógica de confiança por `includes('constatada')`, `includes('fora da validade')` | Casamento de substring frágil: qualquer texto contendo "constatada" vira "Muito Alto" | MÉDIO |

### 1.2 `src/components/onboarding/steps/AnalysisProcessingStep.tsx`

| # | Linha | String atual | Problema | Sev. |
|---|---|---|---|---|
| A-01 | 58 | `Cruzando autuação com 390 dispositivos do CTB e Resoluções do CONTRAN` | Número inventado (0 ocorrências no repo) + jargão | **CRÍTICO** |
| A-02 | 59 | `Auditando decadência de prazo (Art. 281-A CTB — Lei 14.071/2020)…` | **Artigo de lei errado** (decadência = Art. 281, II) + jargão | **CRÍTICO** |
| A-03 | 60 | `Verificando vigência temporal: Lei 14.071/2020, 14.229/2021, 14.440/2022, 14.599/2023` | Lista de_PROCESSO vazia para o usuário; "vigência temporal" é jargão | ALTO |
| A-04 | 61 | `Calibrando probabilidade de deferimento perante o órgão autuador` | "calibrando probabilidade", "deferimento", "órgão autuador" | ALTO |
| A-05 | 62 | `Diagnóstico jurídico 100% gratuito concluído com sucesso!` | "100% gratuito" + "com sucesso!" antes de o usuário ver o resultado | ALTO |
| A-06 | 96 | `Analisando sua autuação com Inteligência Jurídica` | Não há IA nesta tela: é motor de regras determinístico | ALTO |
| A-07 | 99 | `Aplicando 390 dispositivos do CTB, 7 peças-modelo validadas e precedentes do STJ em tempo real.` | 3 claims não verificáveis em 1 frase | **CRÍTICO** |
| A-08 | 93 | `Processamento em Tempo Real` | Sugere servidor; o cálculo é local e síncrono | MÉDIO |
| A-09 | 57 | `Recebendo e validando dados informados pelo condutor` | "condutor" ok, mas a etapa real é conferência de campos | BAIXO |
| A-10 | 141 | rótulo renderizado em `text-[11px]` | Rótulos longos em 11 px: ilegível no celular (fonte da tela) | MÉDIO |

### 1.3 `src/core/onboarding/rules-matrix.ts` — `USER_SITUATIONS`

| # | Linha | String atual | Problema | Sev. |
|---|---|---|---|---|
| R-01 | 60 | `Conversão em Advertência (0 Reais de Multa)` | Promessa de valor no título | ALTO |
| R-02 | 61 | `Isenção total de pagamento e 0 pontos na CNH para infrações leves ou médias.` | Promessa; não diz "sem reincidência nos últimos 12 meses" | ALTO |
| R-03 | 62 | badge `100% Isenção` |idem | ALTO |
| R-04 | 86 | `Cassação da CNH (PCDD)` | Sigla sem tradução | MÉDIO |
| R-05 | 87 | badge `Instância Crítica` | Acentua medo sem explicar | MÉDIO |
| R-06 | 79 | `Suspensão da CNH / Lei Seca` | "Lei Seca" sozinho não quer dizer nada para o usuário | MÉDIO |
| R-07 | 109 (ServiceStep) | `Base jurídica atualizada com a Lei 14.071/20` | Desatualizado (existem 14.229/21, 14.440/22, 14.599/23) + opaco | MÉDIO |

### 1.4 `src/core/onboarding/rules-matrix.ts` — `USER_PROCESS_STAGES`

| # | Linha | String atual | Problema | Sev. |
|---|---|---|---|---|
| S-01 | 104 | `Notificação de Autuação (NA). Prazo aberto para Defesa Prévia antes da aplicação de penalidade.` | Sigla + "prazo aberto" sem data; não diz onde protocolar | MÉDIO |
| S-02 | 115 | `Notificação de Imposição de Penalidade (NIP). Recurso cabível perante a JARI em 1ª instância.` | 3 siglas + "recurso cabível" | MÉDIO |
| S-03 | 122 | `O órgão manteve o auto e agora é necessário interpor recurso formal à JARI com efeito suspensivo.` | "interpor", "auto", "efeito suspensivo" | MÉDIO |
| S-04 | 129 | `Recurso de 2ª instância perante o Conselho Estadual de Trânsito (CETRAN) ou CONTRAN.` | Sigla + "2ª instância" | MÉDIO |
| S-05 | 136 | `Direito subjetivo para condutores sem reincidência no último ano (Art. 267 CTB).` | "Direito subjetivo" + promessa disfarçada | ALTO |
| S-06 | 143 | `Vamos identificar a melhor estratégia jurídica pelo número do auto e pelo órgão autuador.` | "estratégia jurídica", "auto", "órgão autuador" | MÉDIO |
| S-07 | 105/117/124/130 | badges `Fase Inicial • Defesa Prévia`, `1ª Instância • JARI`, `Efeito Suspensivo • JARI`, `2ª Instância Final • CETRAN` | Siglas e hierarquia de instância sem explicação | MÉDIO |

### 1.5 `src/components/onboarding/steps/ServiceStep.tsx`

| # | Linha | String atual | Problema | Sev. |
|---|---|---|---|---|
| SV-01 | 53 | `Escolha o tipo de infração para aplicarmos as defesas adequadas.` | É "situação", não "tipo de infração" (confunde o passo seguinte); "aplicarmos as defesas" = jargão | MÉDIO |
| SV-02 | 105 | `Cálculo determinístico de prazos` | Jargão técnico como selling point; não diz o que o usuário ganha | MÉDIO |
| SV-03 | 101 | `Sem necessidade de cadastro prévio` | OK (verdadeiro) | BAIXO |

### 1.6 `src/components/onboarding/steps/InfractionCategoryStep.tsx`

| # | Linha | String atual | Problema | Sev. |
|---|---|---|---|---|
| C-01 | 78 | `Isenção de 100% do valor da multa e zero pontos na CNH (sem reincidência).` | Promessa num card de escolha | ALTO |
| C-02 | 43 | `Resolução CONTRAN 798/20, margem de tolerância e aferição do medidor.` | 3 referências técnicas sem explicação | MÉDIO |
| C-03 | 50 | `Abordagem com etilômetro ou recusa ao teste e termo de constatação.` | "termo de constatação" — o usuário não sabe que é um formulário | MÉDIO |
| C-04 | 108 | `Selecione a categoria da sua autuação para direcionarmos as teses jurídicas e as perguntas essenciais.` | "categorias", "autuação", "teses jurídicas", "essenciais" — 4 jargões em 1 frase | MÉDIO |
| C-05 | 173 | `Configurado` / `Selecionar` | "Configurado" não comunica nada | BAIXO |
| C-06 | 105 | `Sobre o tipo da infração` | Título frio, sem pergunta | BAIXO |

### 1.7 `src/components/onboarding/steps/InfractionIdentificationStep.tsx`

| # | Linha | String atual | Problema | Sev. |
|---|---|---|---|---|
| I-01 | 432 | helper `Art. 281-A CTB` (sob "Data da Ocorrência") | Artigo sem relação com o campo + jargão cru; contradiz `:450` | **CRÍTICO** |
| I-02 | 450 | `Para verificação de decadência (Art. 281, II CTB)` | Jargão; a mesma tela usa outro artigo para o mesmo tema | MÉDIO |
| I-03 | 260 | `Formatos aceitos: PDF, JPG ou PNG. Os dados abaixo devem ser preenchidos manualmente.` | **Falso**: o OCR preenche automaticamente (`:133`) | ALTO |
| I-04 | 201 | badge `100% Gratuito` | Selo de gratuidade na tela que prepara a venda da Fase 2 | ALTO |
| I-05 | 153 | `Qual é o auto de infração e o condutor?` | "auto de infração" = jargão; "e o condutor" pressupõe que ele é o condutor | MÉDIO |
| I-06 | 156 | `Coletamos os dados da autuação e seu contato para envio imediato do diagnóstico jurídico gratuito e alertas de prazo.` | Promete "envio imediato" de diagnóstico e "alertas de prazo" — no passo 3 o caso ainda nem existe (é salvo só depois da análise) | ALTO |
| I-07 | 344 | `Consta no cabeçalho da notificação. Não informe "não informado" para gerar a peça formal.` | Tom de instrução interna + "peça formal" | MÉDIO |
| I-08 | 488 | `Endereço completo: via, número, bairro, cidade/UF` | Exige bairro que nem todo mundo sabe (pode ser "centro") | BAIXO |

### 1.8 `src/components/onboarding/steps/SpecificInfractionDataStep.tsx`

| # | Linha | String atual | Problema | Sev. |
|---|---|---|---|---|
| P-01 | 90 | `…nossa inteligência jurídica selecione as teses e nulidades aplicáveis.` | "inteligência jurídica" + "teses" + "nulidades" — 3 jargões, e "nulidades" em plural soa como se o caso já estivesse CONTAMINADO | ALTO |
| P-02 | 87 | `Detalhes técnicos da sua autuação` | "técnicos" + "autuação" | MÉDIO |
| P-03 | 203 | `Aferição com mais de 12 meses na data da infração gera anulação imediata.` | **Promete anulação**; além disso é factualmente falso — aferição vencida é um *argumento*, não anulação automática | **CRÍTICO** |
| P-04 | 480 | `Requisitos Legais para 100% de Isenção (Art. 267 do CTB)` | Promessa no cabeçalho | ALTO |
| P-05 | 485 | `…a autoridade de trânsito é **obrigada** a converter sua multa…` | "autoridade de trânsito" + CAPS | MÉDIO |
| P-06 | 452 | `Qual era a situação fática da parada?` | "situação fática" — latim juramentado | MÉDIO |
| P-07 | 513 | `O requerimento formal de indicação transfere a pontuação da CNH para o real infrator dentro do prazo tempestivo da Notificação de Autuação.` | "requerimento formal", "prazo tempestivo", "real infrator" | MÉDIO |
| P-08 | 511-514 | box azul da indicação de condutor | Não diz onde protocolar nem como | MÉDIO |
| P-09 | 107 | `Perguntas configuradas para este tipo de autuação` | "configuradas" = jargão de sistema | BAIXO |
| P-10 | 658 | `Executar Análise Gratuita` | OK, mas "Executar" soa TERMINAL/código | BAIXO |

### 1.9 `src/components/onboarding/OnboardingWizard.tsx`

| # | Linha | String atual | Problema | Sev. |
|---|---|---|---|---|
| W-01 | 556 | `7. Diagnóstico Preliminar Concluído` | "Concluído" antes de o usuário ver; e é o rótulo do passo inteiro | MÉDIO |
| W-02 | 550 | `4. Identificação da Autuação & Veículo` | "Autuação" + "&" | MÉDIO |
| W-03 | 552 | `5. Perguntas Específicas do Seu Caso` | "Específicas" | BAIXO |
| W-04 | 554 | `6. Processando Análise Jurídica` | "Processando" é jargão de TI | MÉDIO |
| W-05 | 558 | `8. Qualificação do Requerente para a Peça` | "Qualificação do Requerente para a Peça" = 4 jargões | MÉDIO |
| W-06 | 583 | `Fase 1 • Diagnóstico Preliminar` / `Fase 2 • Petição Formal` | "Petição Formal" = jargão | MÉDIO |
| W-07 | 593 | `100% Gratuito` / `Minuta Jurídica Oficial` | Selo de gratuidade | ALTO |
| W-08 | 548 | `3. Tipo da Infração` | ok | BAIXO |

### 1.10 `src/core/rules/rule-engine.ts` — títulos/descrições de inconsistência (aparecem na tela)

| # | Linha | String atual | Problema | Sev. |
|---|---|---|---|---|
| E-01 | 149 | `Infração de natureza leve ou média sem reincidência no prontuário nos últimos 12 meses garante cancelamento compulsório da multa e dos pontos.` | "garante", "cancelamento compulsório", "prontuário" | ALTO |
| E-02 | 152 | `impact: '100% de isenção do pagamento financeiro (R$ 130,16) e 0 pontos na CNH.'` | Valor fixo e promessa | ALTO |
| E-03 | 124 | `name: 'Direito Subjetivo à Conversão em Advertência (Art. 267 CTB)'` | "Direito Subjetivo" | MÉDIO |
| E-04 | 64 | `…violando o prazo limite decadencial improrrogável de 30 dias.` | "decadencial", "improrrogável" — 2 jargões em 1 frase | MÉDIO |
| E-05 | 105 | `A última verificação periódica pelo INMETRO/IPEM ocorreu há mais de 12 meses da data do fato.` | Não diz o que isso permite | MÉDIO |
| E-06 | 192 | `A recusa foi classificada no art. 165. Confirme no processo se havia dois ou mais sinais psicomotores…` | "sinais psicomotores" + comando interno ("confirme no processo") | MÉDIO |
| E-07 | 228 | `A Resolução 985/2022 exige fundamentação detalhada do ângulo de visão e do motivo da não abordagem para flagrantes à distância.` | "fundamentação", "flagrantes à distância" | MÉDIO |
| E-08 | 261 | `A via fiscalizada não possuía placa visível antes do radar, ensejando a inexigibilidade de sanção.` | "ensejando a inexigibilidade de sanção" = latim juramentado | MÉDIO |
| E-09 | 322 | `…após aplicação da margem de erro do INMETRO não comprova a infração ou enquadra-a em menor gravidade.` | "enquadra-a", "margem de erro" | MÉDIO |
| E-10 | 496 | `…hipótese em que não há manuseio do aparelho e portanto inexiste a conduta tipificada no art. 252 do CTB.` | "hipótese", "inexiste a conduta tipificada" | MÉDIO |
| E-11 | 562 | `A autuação por recusa exige o preenchimento do Termo do Anexo II da Resolução CONTRAN 432/2013 com o conjunto notório de sinais clínicos.` | "conjunto notório de sinais clínicos" = latim | MÉDIO |
| E-12 | 572 | `…o conjunto probatório deve ser autossuficiente.` | "autossuficiente" | MÉDIO |
| E-13 | 643 | `A data da infração registrada no AIT é inválida ou incoerente, impedindo a aferição de prazos legais.` | "aferição de prazos legais" | MÉDIO |
| E-14 | 870 | `title: 'Garantia Constitucional do Devido Processo Legal (Súmula 312 STJ)'` | 4 jargões; o efeito real (não pode cobrar sem notificar) fica escondido | ALTO |
| E-15 | 871 | `description: 'Injeção obrigatória de tese constitucional de garantia do contraditório e ampla defesa'` | Texto de **log interno** ("Injeção obrigatória de tese") exposto ao usuário | **CRÍTICO** |
| E-16 | 894 | `description: 'Violação da dupla notificação: autuação expedida mas não entregue, seguido de penalidade direta'` | Razoável, mas sem "o que isso significa" | MÉDIO |
| E-17 | 1009 | `O Motor de Regras identificou {n} inconsistências jurídicas no AIT nº {x}. Há fundamentação legal e técnica para protocolo perante a autoridade competente.` | Frase vazia: não diz quais inconsistências, qual autoridade, qual prazo, qual passo. (Não é exibido no onboarding atual — mas é o texto que alimenta dashboards/relatórios.) | ALTO |

### 1.11 `src/core/arguments/arguments-catalog.ts` — `description` (vaza para "O que isso significa para você")

Padrão dos 52: **1 frase nominal em registro de advocacy, começando por substantivo abstrato + preposição**: "Nulidade…", "Inaplicabilidade…", "Reclassificação…", "Atipicidade…", "Descaracterização…", "Inexigibilidade…", "Afastamento…", "Invalidade…", "Inadmissibilidade…", "Extinção…", "Cerceamento…", "Demonstração…", "Regularização…", "Retroatividade…", "Desconstituição…".

Vazamento de jargão mais grave (exemplos reais):

| # | Linha | Arg | Trecho | Sev. |
|---|---|---|---|---|
| G-01 | 18 | ARG-001 | `Nulidade absoluta da autuação por excesso de velocidade…` | ALTO |
| G-02 | 65 | ARG-002 | `Inaplicabilidade de penalidade de trânsito em decorrência de sinalização…` | ALTO |
| G-03 | 111 | ARG-003 | `Nulidade do local de fiscalização… com ART que comprove a criticidade e histórico de sinistros` | ALTO |
| G-04 | 143 | ARG-004 | `Proibição de utilização de radar portátil escondido atrás de árvores…` | MÉDIO |
| G-05 | 166 | ARG-005 | `Reclassificação ou anulação da infração quando o abatimento da margem metrológica…` | ALTO |
| G-06 | 189 | ARG-006 | `Inconsistência da medição quando a foto do radar captura dois ou mais veículos paralelos…` | MÉDIO |
| G-07 | 212 | ARG-007 | `Nulidade por instalação da placa de limite de velocidade fora das distâncias…` | ALTO |
| G-08 | 235 | ARG-008 | `Afastamento da ilicitude da infração… risco de morte.` | ALTO |
| G-09 | 262 | ARG-009 | `Nulidade do registro de avanço semafórico eletrônico que não contenha a foto…` | ALTO |
| G-10 | 285 | ARG-010 | `Nulidade do semáforo com tempo de transição na fase amarela inferior a 3 ou 4 segundos` | MÉDIO |
| G-11 | 308 | ARG-011 | `Atipicidade da conduta de cruzar a retenção em sinal vermelho…` | ALTO |
| G-12 | 331 | ARG-012 | `Descaracterização do Art. 208 quando o veículo ingressou…` | ALTO |
| G-13 | 354 | ARG-013 | `Inexigibilidade de conduta diversa por pane elétrica…` | ALTO |
| G-14 | 377 | ARG-014 | `Atipicidade da conversão à direita…` | ALTO |
| G-15 | 404 | ARG-015 | `Nulidade da autuação por uso de celular lavrada sem abordagem…` | MÉDIO |
| G-16 | 546 | ARG-021 | `Diferença conceitual do Anexo I do CTB entre estacionamento e parada momentânea…` | ALTO |
| G-17 | 592 | ARG-023 | `Excludente de responsabilidade por quebra do veículo…` | MÉDIO |
| G-18 | 642 | ARG-025 | `Nulidade absoluta do procedimento de Lei Seca sem teste…` | ALTO |
| G-19 | 665 | ARG-026 | `Inadmissibilidade do resultado do teste de bafômetro…` | ALTO |
| G-20 | 688 | ARG-027 | `Defesa constitucional contra a penalidade de suspensão por mera recusa desprovida de qualquer sintoma de risco…` | ALTO |
| G-21 | 757 | ARG-030 | `Demonstração de falso positivo decorrente de enxaguante bucal…` | MÉDIO |
| G-22 | 784 | ARG-031 | `Desconstituição da autuação de cinto sem abordagem…` | ALTO |
| G-23 | 830 | ARG-033 | `Afastamento de responsabilidade em transporte coletivo…` | MÉDIO |
| G-24 | 902 | ARG-036 | `Atipicidade da infração de falta de porte de CNH…` | ALTO |
| G-25 | 949 | ARG-038 | `Nulidade por digitação errônea da letra correspondente ao segundo algarismo…` | MÉDIO |
| G-26 | 1049 | ARG-042 | `Retroatividade de norma administrativa mais benéfica…` | ALTO |
| G-27 | 1072 | ARG-043 | `Nulidade do processo de suspensão por pontos instruído com infrações que ainda possuem recursos administrativos pendentes…` | ALTO |
| G-28 | 1118 | ARG-045 | `Nulidade do processo de cassação da CNH (Art. 263, I) quando a infração na vigência da suspensão ocorreu sem abordagem…` | ALTO |
| G-29 | 1164 | ARG-047 | `Regularização cadastral quando o condutor realizou o curso preventivo de reciclagem…` | MÉDIO |
| G-30 | 1191 | ARG-048 | `Extinção definitiva da pretensão punitiva da Administração Pública…` | ALTO |
| G-31 | 1224 | ARG-049 | `Nulidade insanável de processo de trânsito em que o órgão autuador aplicou penalidade sem a comprovação de envio da Notificação de Autuação prévia.` | ALTO |
| G-32 | 1247 | ARG-050 | `Nulidade de autuação lavrada por autoridade municipal em rodovia de competência federal/estadual sem convênio formal vigente.` | ALTO |
| G-33 | 1293 | ARG-052 | `Nulidade absoluta do indeferimento do recurso julgado por carimbo ou despacho padronizado…` | ALTO |

**Nota de impacto:** `description` também alimenta `applicationHypothesis` (`arguments-catalog.ts:1348`), que hoje só é verificado por teste (`knowledge-catalog.test.ts:21-22`) e **não** entra na minuta formal (a peça usa `formattedParagraphs` + `legalBase`). Trocar `description` por texto leigo **não degrada a peça jurídica** — desde que `formattedParagraphs` continue intacto. Verificado.

---

## 2. Princípios de copy reescrita (12 regras, aplicáveis)

1. **Fale com o motorista, não com o advogado.** Toda sigla técnica aparece **traduzida na primeira ocorrência** ("JARI (a primeira instância onde o recurso é julgado)"). Sigla sem tradução sai.
2. **Ordem fixa dos blocos:** *o que é → por que isso importa → o que você pode fazer*. Título curto; a explicação vem depois; a ação vem por último.
3. **Traduza o substantivo abstrato.** `nulidade` → "a multa pode ser cancelada"; `decadência` → "o órgão perdeu o prazo de aplicar a multa"; `tipicidade` → "essa conduta não é considerada infração"; `improbidade` → "conduta desonesta"; `devedor de procedência` → "quem recebeu o dinheiro de forma irregular"; `coercibilidade` → "você podia ser obrigado a fazer isso".
4. **Nunca prometa resultado.** "Vai ser anulada" → "pode ser anulada". "Você não vai pagar" → "se o órgão aceitar o argumento, o valor a pagar é zero". **O agente é você, o resultado é do órgão.**
5. **Número é promessa.** Se o número não vem de um cálculo de probabilidade real, ele não se chama "probabilidade" e não se anima de 0 a X. Chame de "força da defesa" e explique **o que o número representa**.
6. **Nome técnico no máximo 1 por card, e sempre com tradução na mesma frase.** Nome técnico solto é o que faz o motorista pensar "isso é golpe" e sair.
7. **Toda seção termina em ação.** O bloco "o que isso significa" sempre tem 1 frase de consequência + 1 passo concreto (ou "o que falta para eu conseguir verificar").
8. **Diga o que NÃO sabemos.** "Não dá para confirmar com os dados que você enviou" acalma e é honesto. Texto genérico de preenchimento ("verificação não configurada") é o oposto: mostra erro interno.
9. **Calma antes do número.** Valor da multa e pontos aparecem como "o que está em jogo", nunca como destaque de "sucesso". Nada de "Excelente!", nada de emoji deeload, nada de animação de placar.
10. **Só prometa o que o produto faz.** "Alertas de prazo", "precedentes em tempo real", "390 dispositivos" só entram na copy se existirem e forem verificáveis no código.
11. **Gratuito tem que ser verdadeiro em contexto.** Diga **em qual etapa é grátis** e **em qual é paga**, na mesma tela. Selo de "100% Gratuito" em cima do funil de venda quebra a confiança no resto.
12. **Escreva para quem tem ~9 anos de escolaridade e muito medo.** Frase curta (uma ideia por frase), verbo concreto, zero subjuntivo de Manual Brasileiro de Fiscalização de Trânsito.

---

## 3. REESCRITA PRONTA PARA COLAR

### 3.a — Os 6 estágios do array `stages` (`AnalysisProcessingStep.tsx:56-63`)

**Por que trocar:** hoje o checklist diz "390 dispositivos", "Art. 281-A", "vigência temporal", "calibrando probabilidade" e termina com "100% gratuito concluído com sucesso!" — tudo falso ou jargão. O motor real (`ExpertRuleEngine.evaluate`) é **síncrono e determinístico**: não há Promise.all, nem IA, nem rede. A copy precisa descrever o que a tela **de fato** faz.

**Observação sobre `Promise.all`:** hoje **não existe** paralelismo — o `useEffect` (`AnalysisProcessingStep.tsx:29-54`) roda `ExpertRuleEngine.evaluate()` de uma vez e o array `stages` é só uma animação de progresso com `setTimeout` sequencial. Se você quer `Promise.all`, a reescrita abaixo **não muda os tempos** (mesmo `duration`, mesmo total de 4,2 s) e **não promete paralelismo**. Parallelizar de verdade é mudança de arquitetura, não de copy.

**Variante A — drop-in, mesmo shape (`label` + `duration`), rótulos curtos (a checklist renderiza em `text-[11px]`):**

```ts
  const stages = [
    { label: 'Conferindo os dados que você enviou', duration: 700 },
    { label: 'Checando a infração na legislação de trânsito', duration: 800 },
    { label: 'Verificando prazos e equipamento de medição', duration: 800 },
    { label: 'Conferindo as leis que mudaram nos últimos anos', duration: 700 },
    { label: 'Montando o seu diagnóstico', duration: 700 },
    { label: 'Diagnóstico pronto', duration: 500 },
  ];
```

**Variante B — com `detail` (uma linha por estágio, para a tela explicar o que está acontecendo).** Exige 1 linha de JSX a mais (ver nota abaixo):

```ts
  const stages = [
    { label: 'Conferindo os dados que você enviou', detail: 'Número do auto, data, local e placa.', duration: 700 },
    { label: 'Checando a infração na legislação de trânsito', detail: 'Cada tipo de infração tem um artigo do Código de Trânsito e uma regra própria de medição.', duration: 800 },
    { label: 'Verificando prazos e equipamento de medição', detail: 'Se a notificação chegou dentro do prazo e, quando é radar, se o aparelho estava aferido na data da infração.', duration: 800 },
    { label: 'Conferindo as leis que mudaram nos últimos anos', detail: 'Regras alteradas pela Lei 14.071/2020 e pelas normas que vieram depois dela.', duration: 700 },
    { label: 'Montando o seu diagnóstico', detail: 'Reunindo os pontos que se aplicam ao seu caso e o que ainda falta comprovar.', duration: 700 },
    { label: 'Diagnóstico pronto', detail: 'Logo abaixo: o que foi verificado, o que a lei diz e o que você pode fazer agora.', duration: 500 },
  ];
```

*Nota de implementação (B):* em `AnalysisProcessingStep.tsx:141`, trocar

```tsx
              <span className="text-[11px] leading-snug">{stage.label}</span>
```

por

```tsx
              <span className="text-[11px] leading-snug">
                {stage.label}
                {'detail' in stage && stage.detail && (
                  <span className="block text-[10px] font-normal text-slate-500">{stage.detail}</span>
                )}
              </span>
```

**Texto de cabeçalho da tela de processamento (`AnalysisProcessingStep.tsx:92-100`):**

```tsx
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200 font-mono">
          Análise em andamento
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Estamos conferindo a sua autuação
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto">
          Cada verificação é feita por regras fixas do Código de Trânsito e das normas do CONTRAN, com o texto da lei ao lado de cada resultado.
        </p>
```

> O `390`, o `7 peças-modelo`, o `precedentes do STJ em tempo real` e o `Inteligência Jurídica` foram removidos: não são verificáveis no código. Se quiser credibilidade, o caminho é **contar o que é verdade** — 52 teses, 9 modelos de peça, 31 artigos do CTB, 9 resoluções CONTRAN — e expor isso em uma tela de "como funciona", não no splash de progresso.

---

### 3.b — Os 4 cards de `formatLegalPointGovBr` (ARG-001, ARG-002, ARG-005, ARG-051)

**Problema estrutural primeiro:** o bloco "O que verificamos" (`FreeAnalysisResultStep.tsx:364`) renderiza `{point.title}` — repete o título. **Não existe campo de texto para "o que verificamos"**. Para as reescritas abaixo fazerem sentido, é preciso **um campo novo**: `whatWeChecked`.

**Patch 1 — novo campo no tipo (linhas 28-34):**

```ts
  const govBrExplanations: Record<string, {
    title: string;
    whatWeChecked: string;
    lawExplanation: string;
    evidenceCheck: (data: any) => string;
    userImpact: string;
    confidenceBase: string;
  }> = {
```

**Patch 2 — linha 364 passa a renderizar o campo novo:**

```tsx
                    <p className="text-base text-slate-700 leading-relaxed pl-6">{point.whatWeChecked}</p>
```

**Patch 3 — o fallback (linhas 102-108) precisa do campo novo** (ver 3.c).

**Patch 4 — a lógica de confiança (linhas 120-136) não pode continuar casando string.** Hoje `'constatada'` no texto → "Muito Alto". Reescreva para casar **o resultado estruturado**, não a prosa. Sugestão mínima que não muda a arquitetura: gravar o nível dentro do `evidenceCheck` (retornar `{ text, level }`) ou usar prefixo estável. Enquanto isso não for feito, as reescritas abaixo usam **frases que contêm as palavras que a lógica antiga espera** (`constatada`, `fora da validade`, `Não há`), para não quebrar o comportamento atual:

**Os 4 cards reescritos (formato: título / o que verificamos / o que a lei diz (traduzido) / o que encontramos / o que isso significa):**

```ts
    'ARG-001': {
      title: 'O radar estava com a medição válida na data da infração?',
      whatWeChecked:
        'A data da última aferição do radar (feita pelo INMETRO ou pelo IPEM, o órgão que faz a vistoria) comparada com a data da sua infração. A regra é simples: o radar precisa ser vistoriado pelo menos uma vez por ano.',
      lawExplanation:
        'A Resolução CONTRAN nº 798/2020 (art. 4º, III) obriga todo medidor de velocidade a passar por essa vistoria oficial no máximo uma vez por ano. Sem ela em dia, o aparelho não tem valor de prova — e a multa que ele mediu pode ser cancelada.',
      evidenceCheck: (data) => {
        if (data.infraction.radarCalibrationDate) {
          const calibDate = new Date(data.infraction.radarCalibrationDate);
          const infDate = new Date(data.infraction.dateTime);
          const diffMonths = (infDate.getTime() - calibDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
          return diffMonths > 12
            ? `A última vistoria foi há ${Math.round(diffMonths)} meses — o radar estava com a medição vencida na data da infração.`
            : `A última vistoria foi há ${Math.round(diffMonths)} meses — o radar estava com a medição em dia na data da infração.`;
        }
        return 'Não há registro da data da vistoria do radar, então este ponto ficou sem confirmação.';
      },
      userImpact:
        'Se o radar estava com a vistoria vencida, esse é um dos argumentos mais fortes do seu caso e pode levar ao cancelamento da multa. Dá para confirmar com a certidão do INMETRO, que é gratuita.',
      confidenceBase: 'Resolução CONTRAN nº 798/2020, art. 4º, III'
    },
```

```ts
    'ARG-051': {
      title: 'Dá para trocar esta multa por advertência (sem pagar e sem pontos)?',
      whatWeChecked:
        'A gravidade da sua infração (leve ou média) e se você tem alguma infração registrada nos últimos 12 meses.',
      lawExplanation:
        'Desde a Lei 14.071/2020, o art. 267 do CTB obriga o órgão de trânsito a converter em advertência por escrito toda multa leve ou média de quem não tem infração nos últimos 12 meses. Na advertência, não se paga nada e não entra ponto na CNH.',
      evidenceCheck: (data) => {
        const infractionCode = data.infraction.infractionCode;
        const isLightOrMedium = ['745-50', '735-80', '736-62', '735-80'].includes(infractionCode);
        const hasRecentInfractions = data.infraction.hasPreviousInfractionsLast12Months === true;

        if (!isLightOrMedium) return 'Esta infração é grave ou gravíssima, então a conversão em advertência não se aplica ao seu caso.';
        if (hasRecentInfractions) return 'Constam infrações nos últimos 12 meses, então a conversão em advertência não se aplica ao seu caso.';
        return 'A infração é leve ou média e não há infrações nos últimos 12 meses: os requisitos do art. 267 estão atendidos.';
      },
      userImpact:
        'Nesses casos a lei não deixa o órgão escolher: a multa vira advertência. Na prática, R$ 0 e 0 pontos na CNH. Se o órgão negar, é um pedido simples de fazer — e este é um dos poucos pontos do seu caso que não depende de foto nem de documento difícil de conseguir.',
      confidenceBase: 'Art. 267 do CTB (redação da Lei 14.071/2020)'
    },
```

```ts
    'ARG-002': {
      title: 'Existia placa de velocidade no local?',
      whatWeChecked:
        'Se há comprovação de que existia, no local, a placa de velocidade máxima (a placa circular com o número, código R-19) visível antes do radar — e se ela estava na distância correta.',
      lawExplanation:
        'O art. 90 do CTB diz que ninguém pode ser multado por desobedecer a uma placa que estava ausente, escondida ou mal posicionada. Para a fiscalização por radar, a Resolução CONTRAN nº 798/2020 exige a placa R-19 visível antes do radar.',
      evidenceCheck: (data) => {
        if (data.infraction.hasR19SignageProof === false) return 'Você informou que não há comprovação de placa de velocidade no local.';
        if (data.infraction.hasR19SignageProof === true) return 'Há comprovação de placa de velocidade nos documentos que você enviou.';
        return 'Não há foto da placa no local, então este ponto ficou sem confirmação.';
      },
      userImpact:
        'Se a placa não existia ou estava escondida, o órgão não pode exigir que você respeitasse um limite que não estava sinalizado — e isso pode cancelar a multa. É um dos pontos mais checados em caso de radar.',
      confidenceBase: 'Art. 90 do CTB e Resolução CONTRAN nº 798/2020'
    },
```

```ts
    'ARG-005': {
      title: 'A velocidade que foi cobrada está correta?',
      whatWeChecked:
        'Refizemos a conta da velocidade. O radar mede um valor "bruto", mas a multa tem que ser calculada sobre o valor já com a margem de erro do aparelho descontada (7 km/h, para medições até 100 km/h).',
      lawExplanation:
        'A Resolução CONTRAN nº 798/2020 (Anexo II) define a margem de erro admitida em cada faixa de velocidade. A multa só pode ser cobrada sobre a velocidade "considerada" — a velocidade medida já com essa margem descontada. Se o órgão fez a conta com o valor errado, a infração pode mudar de faixa ou nem existir.',
      evidenceCheck: (data) => {
        const measured = Number(data.infraction.measuredSpeed ?? data.infraction.speedMeasured);
        const considered = Number(data.infraction.consideredSpeed ?? data.infraction.speedConsidered);
        const limit = Number(data.infraction.speedLimit);
        if (![measured, considered, limit].every(Number.isFinite)) {
          return 'Faltam os números de velocidade para refazer a conta.';
        }
        const tolerance = measured <= 100 ? 7 : measured * 0.07;
        const expected = measured - tolerance;
        const delta = Math.abs(expected - considered);
        return delta <= 1
          ? `A conta fecha: ${measured} km/h medidos − ${Number(tolerance.toFixed(1))} km/h de margem de erro = ${considered} km/h considerados (limite de ${limit} km/h).`
          : `A conta não fecha: com ${measured} km/h medidos e margem de ${Number(tolerance.toFixed(1))} km/h, o esperado seria ${Number(expected.toFixed(1))} km/h, mas o auto registra ${considered} km/h.`;
      },
      userImpact:
        'Se o número não fecha, existe chance de a multa cair numa faixa mais barata — ou de não existir. Como é só aritmética, dá para conferir e mostrar o resultado na peça sem depender de nenhum documento.',
      confidenceBase: 'Resolução CONTRAN nº 798/2020, Anexo II'
    },
```

> Observação sobre a lógica de confiança (linhas 120-136): com as frases novas, `'fora da validade'` **não aparece mais** (virou "com a medição vencida") e `'constatada'` **não aparece mais** (virou "é leve ou média"). O `evidenceCheck` do ARG-001 cai no ramo `else` → nível **"Baixo"**, o que é o oposto do correto. **Ao aplicar, ajuste os gatilhos da lógica de confiança junto** — sugestão de gatilhos estáveis: comparar por um campo estruturado, ou por prefixos explícitos como `VENCIDO:`, `EM_DIA:`, `SEM_DADOS:`, `NAO_APLICA:`, `ATENDERDO:`. Enquanto não ajustar, o código **vai mostrar "confiança Baixo" num caso forte** — pior que o texto atual.

---

### 3.c — Fallback genérico para as teses sem card (template de 4 blocos, linguagem de leigo)

Hoje (`FreeAnalysisResultStep.tsx:102-108`):

```ts
  const explanation = govBrExplanations[arg.id] || {
    title: arg.title,
    lawExplanation: `${arg.legalBase} ${arg.contraranResolution ? `(c/c ${arg.contraranResolution})` : ''}`,
    evidenceCheck: () => 'Verificação específica não configurada para este argumento',
    userImpact: arg.summary,
    confidenceBase: 'Base jurídica padrão'
  };
```

**Problemas:** (i) `evidenceCheck` devolve texto de erro interno; (ii) `lawExplanation` é a citação seca, sem tradução; (iii) `userImpact` cai no `description` do catálogo (registro de advocacy); (iv) `confidenceBase` = "Base jurídica padrão" (placeholder).

**Substituição:**

```ts
  const explanation = govBrExplanations[arg.id] || {
    title: arg.title,
    whatWeChecked:
      'Conferimos este ponto nos dados que você enviou: {{O_QUE_CONFERIMOS}}.',
    lawExplanation:
      'Em poucas palavras: {{REGRA_DA_LEI_EM_1_OU_2_FRASES}}. Referência: {{BASE_LEGAL}}.',
    evidenceCheck: () =>
      'O que encontramos nos seus dados: {{ACHADO}}. Se este dado não estiver no seu documento, {{O_QUE_FAZER}}.',
    userImpact:
      'O que isso significa para você: {{CONSEQUENCIA_CONCRETA}}. {{PROXIMO_PASSO}}.',
    confidenceBase: arg.legalBase
  };
```

**Regras de preenchimento dos placeholders (para quando alguém escrever as 48 teses restantes):**

| Placeholder | O que escrever | O que NÃO escrever |
|---|---|---|
| `{{O_QUE_CONFERIMOS}}` | O fato concreto que a regra olha (data, número, documento, declaração). 1 frase. | "Verifica a regularidade…", "Valida a consistência…" |
| `{{REGRA_DA_LEI_EM_1_OU_2_FRASES}}` | A regra em linguagem de resultado para o motorista. Máximo 2 frases. | Citação de artigo, "caput", "§", "in fine" |
| `{{BASE_LEGAL}}` | A referência que fica em `font-mono` no card (`arg.legalBase` já serve). | Texto corrida |
| `{{ACHADO}}` | O que o motor encontrou **ou** "não deu para confirmar com os dados que você enviou". | "Verificação não configurada", "dados insuficientes" |
| `{{O_QUE_FAZER}}` | O passo que o usuário pode executar (trazer foto, puxar certidão, confirmar com o órgão). | "Providenciar a documentação cabível" |
| `{{CONSEQUENCIA_CONCRETA}}` | O que muda para o usuário, com verbo e condicional. | "Fundamento sólido", "vício formal", "nulidade" |
| `{{PROXIMO_PASSO}}` | Sempre 1 ação. | Nada (ou "Nenhum passo adicional é necessário neste momento.") |

**Fallback final (quando a tese não tem `evidenceCheck` real), pronto:**

```ts
    evidenceCheck: () =>
      'Não deu para confirmar este ponto com os dados que você enviou. Ele pode ser verificado no processo administrativo — no painel, em Documentos do órgão.',
```

---

### 3.d — Reescrita das strings de UI do `FreeAnalysisResultStep.tsx`

| Linha | Antes | Depois | Por quê |
|---|---|---|---|
| 223 | `Diagnóstico Jurídico Gratuito Concluído` | `Diagnóstico concluído — grátis` | Retira "Jurídico" e o selo absoluto de gratuidade |
| 226 | `Diagnóstico de {nome}` / `Resultado da Análise Preliminar` | `Resultado do seu diagnóstico` | "Diagnóstico de Carlos" soa consulta médica |
| 239 | `Probabilidade de Êxito` | `Força da sua defesa` | O número é score heurístico, não probabilidade |
| 239 (nova linha abaixo do número) | — | `Quanto a sua defesa tem de chance de prosperar com os dados que você enviou. Não é previsão de resultado — a decisão final é do órgão.` | Honestidade radical sobre o que o número é |
| 245 | `Alto potencial de anulação` | `Vários pontos fortes no seu caso` | Não promete cancelamento |
| 245 | `Potencial identificado — análise detalhada disponível` | `Há pontos que valem a pena usar na defesa` |idem |
| 245 | `Potencial moderado — recomenda-se reforçar dados` | `Ainda falta comprovar alguns pontos` | Aciona o bloco de dados faltantes |
| 245 | `Nenhuma tese autorizada com os dados informados` | `Com os dados de hoje, não encontramos ponto forte` | "Tese autorizada" = jargão interno |
| 252-253 | `{n}/{m} campos preenchidos` · `{x}% completo` | `Você preencheu {n} de {m} dados` | "campos"/"completo" é métrica de formulário |
| 269 | `Probabilidade pode melhorar com mais dados` | `Seu caso fica mais forte com mais {n} dados` |idem |
| 272 | `Adicionar as informações abaixo pode aumentar sua probabilidade de êxito:` | `Preencha o que falta para a análise ficar mais completa:` |idem |
| 286 | `A probabilidade é recalculada automaticamente ao preencher mais dados no formulário.` | `Você pode voltar ao formulário e completar esses dados quando quiser — o diagnóstico é refeito na hora.` | Hoje o usuário não está no formulário |
| 296 | `Excelente! Seus dados fornecem base sólida para a defesa.` | `Os dados que você enviou já permitem montar a defesa.` | Sem complacência e sem promessa |
| 306 | `Enquadramento` | `Tipo da infração` | Leigo entende |
| 311 | `Órgão Julgador` | `Órgão que aplicou a multa` | Precisão: é o autuador, não o julgador |
| 313 | `Instância: Defesa Administrativa` | `Onde o caso é analisado: defesa administrativa (recurso por escrito ao DETRAN)` | Diz o que significa e onde |
| 316 | `Impacto Estimado` | `Valor em aberto` | "Impacto" é abstrato |
| 318 | `{n} Pontos na CNH` (âmbar) | `{n} pontos na CNH, se a multa for mantida` + linha nova `Quanto vale a multa e os pontos dependem da decisão do órgão.` | Acalma sem esconder; tira o destaque de ansiedade |
| 327 | `Principais pontos verificados para sua defesa ({n})` | `O que conferimos no seu caso ({n})` | Diz o que foi feito, não "pontos" |
| 330 | `(+{n} outros pontos disponíveis na visualização completa)` | `(+{n} outros pontos — você vê todos ao salvar no painel)` | Só prometa o que existe |
| 427-428 | `Nenhum vício formal ou tese de anulação foi identificado com base nas informações fornecidas. Recomendamos reunir mais documentos ou consultar um advogado para uma análise mais detalhada.` | `Com os dados que você enviou, não encontramos problema na autuação. Isso não quer dizer que a multa está certa: se você tiver a notificação original, fotos do local ou prints, vale reenviar — a análise fica mais forte. Se preferir, um advogado pode revisar o caso com você.` | Tira jargão, mantém honestidade, dá 2 caminhos e não entrega o caso |
| 441 | `Salvar e Ver no Painel` | `Salvar no painel` |idem |
| 449 | `Gerar Minha Defesa` | `Montar minha defesa` | "Gerar minha defesa" promete o resultado |
| 449 (nova linha auxiliar) | — | `Esta etapa é paga. Você vê o valor antes de confirmar — e não é cobrado nada se desistir.` | Transparência de preço no ponto de venda |

**Bloco de ação que faltava (proposta de inserção entre as seções e os botões, `FreeAnalysisResultStep.tsx:~433`):**

```tsx
      {/* Próximos passos — a tela precisa dizer o que fazer */}
      <div className="p-5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
        <h3 className="text-base font-bold text-slate-900">O que fazer agora</h3>
        <ol className="space-y-2 text-sm text-slate-700 list-decimal list-inside">
          <li>Salve este diagnóstico no painel — ele fica guardado e você pode voltar a ele quando quiser.</li>
          <li>
            {infractionData.defenseDeadline
              ? `Seu prazo para apresentar a defesa termina em ${infractionData.defenseDeadline}. Protocolar antes garante o efeito suspensivo.`
              : 'Confira na notificação a data limite para apresentar a defesa — protocolo depois dessa data costuma esvaziar a defesa.'}
          </li>
          <li>
            {analysis?.recommendedArguments?.[0]
              ? `Para o ponto mais forte do seu caso ("${analysis.recommendedArguments[0].title}"), o documento que faz falta é: ${analysis.recommendedArguments[0].requiredDocuments?.[0] ?? 'a cópia da sua notificação de autuação'}.`
              : 'Separe a cópia da sua notificação de autuação — é o documento que o órgão vai pedir.'}
          </li>
        </ol>
        <p className="text-xs text-slate-500">
          A defesa é protocolada por escrito no DETRAN ou no órgão autuador indicado acima. Você não precisa ir a lugar nenhum: dá para fazer online.
        </p>
      </div>
```

> Este bloco **precisa** de `analysis.recommendedArguments[].requiredDocuments` — hoje `requiredDocuments` existe no `ArgumentModel` (`arguments-catalog.ts`), mas `recommendedArguments` no `CaseAnalysis` pode não expor esse campo. **Verificar o tipo antes de aplicar** (`src/types/index.ts:124`).

**`summaryReasoning` (`rule-engine.ts:1009`) — versão honesta e acionável** (não exibido hoje no onboarding, mas é o texto que aparece em relatórios/dashboard e é a "voz" do motor):

```ts
      summaryReasoning:
        `Analisamos o auto nº ${infraction.aitNumber || 'sem número informado'} e encontramos ${detectedInconsistencies.length} ${detectedInconsistencies.length === 1 ? 'ponto' : 'pontos'} que podem fortalecer a defesa: ${detectedInconsistencies.map((i) => i.title).join('; ') || 'nenhum ponto forte com os dados de hoje'}. ` +
        `O próximo passo é protocolar a defesa por escrito no órgão autuador, dentro do prazo indicado na notificação.${gapSummary}`,
```

E a `gapSummary` (linha 976), hoje com nomes de campo crus:

```ts
    const gapSummary = dataGaps.length > 0
      ? ` Não foi possível avaliar ${dataGaps.length} ${dataGaps.length === 1 ? 'ponto' : 'pontos'} por falta de dados (${dataGaps.map((g) => g.missingData.join('+')).join('; ')}).`
      : '';
```

→ trocar `g.missingData.join('+')` por rótulos amigáveis (o `getMissingCriticalFields` já tem `label` para os principais campos — reusar ou criar um mapa `field → label`).

---

### 3.e — 6 exemplos de `description` do catálogo de teses (padrão para os outros 46)

**Padrão novo (1-2 frases, 3 blocos implícitos): *o que a lei permite → o que acontece se o problema existir → o que muda para você*. Sem substantivo abstrato no início. Sem "nulidade", "atipicidade", "inaplicabilidade", "descaracterização", "afastamento", "invalidade", "inadmissibilidade", "cerceamento".**

Cada bloco traz o `title` novo também, porque o `title` do catálogo é o que aparece como cabeçalho do card no fallback (`FreeAnalysisResultStep.tsx:103`).

**ARG-001 — `arguments-catalog.ts:15-18`**

```ts
    id: 'ARG-001',
    code: 'INMETRO_CALIBRATION_EXPIRED',
    title: 'Radar com a vistoria vencida na data da infração',
    description:
      'Quando o radar que aplicou a multa estava com mais de 12 meses sem vistoria oficial, a medição perde a validade que a lei exige e a multa pode ser cancelada. Dá para confirmar com a certidão gratuita do INMETRO.',
```

**ARG-002 — `arguments-catalog.ts:62-65`**

```ts
    id: 'ARG-002',
    code: 'LACK_OF_REGULATORY_SIGNAGE',
    title: 'Placa de velocidade ausente ou escondida no local',
    description:
      'Quando não havia placa de velocidade visível no local — ou ela estava encoberta ou fora do lugar — o órgão não pode cobrar a multa por desrespeito a um limite que não estava sinalizado. Uma foto do trecho costuma resolver este ponto.',
```

**ARG-005 — `arguments-catalog.ts:162-166`**

```ts
    id: 'ARG-005',
    code: 'RADAR_MARGEM_ERRO_RECLASSIFICACAO',
    title: 'Velocidade cobrada calculada com a margem de erro errada',
    description:
      'Quando a multa foi calculada sobre a velocidade bruta do radar, em vez da velocidade já com a margem de erro descontada, o enquadramento muda: a infração pode passar para uma faixa mais barata ou deixar de existir. É uma conta de matemática, feita só com os números do auto.',
```

**ARG-012 — `arguments-catalog.ts:327-331` (semáforo)**

```ts
    id: 'ARG-012',
    code: 'SEMAFORO_RETENCAO_SOBRE_FAIXA_FLUXO_TRAVADO',
    title: 'Parou sobre a faixa porque o trânsito travou à frente',
    description:
      'Quando o carro entrou no cruzamento com o sinal verde e ficou parado sobre a faixa porque o trânsito parou, a situação é diferente de ter avançado o sinal vermelho — e a multa não se sustenta. Uma foto do congestionamento no momento vale como prova.',
```

**ARG-051 — `arguments-catalog.ts:1266-1270`**

```ts
    id: 'ARG-051',
    code: 'CONVERSAO_OBRIGATORIA_ADVERTENCIA_ART267',
    title: 'Trocar a multa por advertência, sem pagar e sem pontos',
    description:
      'Quando a infração é leve ou média e o condutor não tem nenhuma infração nos últimos 12 meses, a lei obriga o órgão a trocar a multa por advertência por escrito: o valor a pagar fica zero e nenhum ponto entra na CNH. Não depende de foto nem de documento — depende do histórico de infrações.',
```

**ARG-013 — `arguments-catalog.ts:350-354` (semáforo, defeito)**

```ts
    id: 'ARG-013',
    code: 'SEMAFORO_DEFEITO_INTERMITENTE_APAGADO',
    title: 'Semáforo apagado ou com defeito no momento da passagem',
    description:
      'Quando o semáforo estava apagado, piscando ou com defeito no momento da passagem, não é possível exigir do motorista um comportamento diferente. Um vídeo do local ou o registro de reclamação na central da prefeitura serve de prova.',
```

**Como aplicar nos outros 46, sem reescrever 46 manualmente:**

1. Reescrever `title` no padrão acima (≤ 9 palavras, sem artigo no início, sem sigla de resolução no título).
2. Reescrever `description` no padrão: 2 frases. **Frase 1** = condição ("Quando…"). **Frase 2** = o que isso significa/pode acontecer. Se couber, **3ª frase** = de onde sai a prova.
3. **Não mexer** em `legalBase`, `resolutions`, `formattedParagraphs`, `requiredDocuments`, `relatedJurisprudence` — é de lá que sai o texto da peça formal. `formattedParagraphs` é o que alimenta o documento; `description` alimenta a tela.
4. `applicationHypothesis` (linha 1348) herda a nova `description` automaticamente. Hoje esse campo só é verificado por teste (`knowledge-catalog.test.ts`), então a mudança é segura — **mas** se ele passar a ser usado em prompt de IA para redigir a peça, mantenha `formattedParagraphs` como fonte do texto técnico (já é).

---

## 4. Notas de implementação (o que precisa mexer, além do texto)

| # | Arquivo:linha | Mudança | Severidade |
|---|---|---|---|
| M-01 | `FreeAnalysisResultStep.tsx:28-34` | Adicionar `whatWeChecked` ao tipo do mapa | **Bloqueante** para 3.b |
| M-02 | `FreeAnalysisResultStep.tsx:364` | Renderizar `{point.whatWeChecked}` (hoje repete o título) | **Bloqueante** |
| M-03 | `FreeAnalysisResultStep.tsx:102-108` | Fallback novo com os 4 placeholders (3.c) | Alto |
| M-04 | `FreeAnalysisResultStep.tsx:120-136` | Deixar de casar `includes('constatada')` / `includes('fora da validade')` — hoje as frases novas quebram a heurística e um caso forte vira "confiança Baixo" | **Alto** |
| M-05 | `FreeAnalysisResultStep.tsx:241-243` | Número não deve ser apresentado como probabilidade; considerar remover a animação de contador (1,2 s) ou trocar por rótulo fixo "força da defesa" | Alto |
| M-06 | `AnalysisProcessingStep.tsx:56-63` | Substituir `stages` (3.a) | Alto |
| M-07 | `AnalysisProcessingStep.tsx:92-100` | Remover "390 dispositivos", "7 peças-modelo", "precedentes do STJ em tempo real", "Inteligência Jurídica" | **Crítico (claim falso)** |
| M-08 | `AnalysisProcessingStep.tsx:59` | Corrigir "Art. 281-A" → "Art. 281, II" (ou remover a citação) | **Crítico (erro legal)** |
| M-09 | `InfractionIdentificationStep.tsx:432` | Remover helper "Art. 281-A CTB" (não corresponde ao campo) | **Crítico** |
| M-10 | `InfractionIdentificationStep.tsx:260` | Corrigir "Os dados abaixo devem ser preenchidos manualmente" (o OCR preenche) | Alto |
| M-11 | `SpecificInfractionDataStep.tsx:203` | "gera anulação imediata" → promessa falsa; trocar por "pode sustentar o pedido de cancelamento" | **Crítico** |
| M-12 | `rule-engine.ts:871` | Remover "Injeção obrigatória de tese constitucional…" (texto de log) | **Crítico** |
| M-13 | `rule-engine.ts:1009` + `:976` | Reescrever `summaryReasoning` e `gapSummary` (3.d) | Alto |
| M-14 | `arguments-catalog.ts` (52 blocos) | Reescrever `title` + `description` (3.e); preservar `formattedParagraphs`/`legalBase` | Alto (46 itens) |
| M-15 | `rules-matrix.ts:50-147` | Reescrever `title`/`subtitle`/`badge` de `USER_SITUATIONS` e `USER_PROCESS_STAGES` | Médio |
| M-16 | `OnboardingWizard.tsx:541-566, 583, 593` | Rótulos das fases | Médio |

**Não verificados / fora do escopo deste relatório** (flag para o próximo ciclo): `DefenseStageStep.tsx:50,56` (mesmos problemas de jargão), `RequiredDataStep.tsx`, `DocumentReviewStep.tsx`, `DocumentCheckoutStep.tsx` (Fase 2), `AccountVerificationGate.tsx`, `src/components/communication/WhatsAppSimulatorModal.tsx:18` (mock de mensagem com promessa de prazo).

---

## 5. TOP 10 achados

| # | Sev. | Arquivo:linha | Resumo |
|---|---|---|---|
| 1 | **CRÍTICO** | `AnalysisProcessingStep.tsx:58,99` | "390 dispositivos do CTB", "7 peças-modelo validadas", "precedentes do STJ em tempo real" — nenhum número verificável no código |
| 2 | **CRÍTICO** | `FreeAnalysisResultStep.tsx:239,241-243` + `rule-engine.ts:913-963` | Score heurístico (base 35/78/…/98 + bônus) rotulado e animado como "Probabilidade de Êxito" |
| 3 | **CRÍTICO** | `FreeAnalysisResultStep.tsx:65` | "Você tem DIREITO SUBJETIVO … não pagará valor e não perderá pontos na CNH" — promessa absoluta de resultado |
| 4 | **CRÍTICO** | `AnalysisProcessingStep.tsx:59` + `InfractionIdentificationStep.tsx:432` | Decadência atribuída ao Art. 281-A (é o Art. 281, II) — erro de lei em tela de usuário |
| 5 | **CRÍTICO** | `FreeAnalysisResultStep.tsx:105` | "Verificação específica não configurada para este argumento" — mensagem de erro interno exposta |
| 6 | **CRÍTICO** | `SpecificInfractionDataStep.tsx:203` | "Aferição com mais de 12 meses na data da infração gera anulação imediata" — promessa de resultado que não existe |
| 7 | **ALTO** | `rule-engine.ts:871` | "Injeção obrigatória de tese constitucional de garantia do contraditório e ampla defesa" — log interno na tela |
| 8 | **ALTO** | `FreeAnalysisResultStep.tsx:364` | Bloco "O que verificamos" renderiza o título do card — não diz o que foi verificado |
| 9 | **ALTO** | `arguments-catalog.ts` (52× `description`/`title`) | Registro de advocacy ("Nulidade absoluta", "Descaracterização", "Atipicidade") vaza para o bloco "O que isso significa para você" de 48 cards |
| 10 | **ALTO** | `FreeAnalysisResultStep.tsx:245,296,427-428,449` | "Alto potencial de anulação", "Excelente!", "consulte um advogado", "Gerar Minha Defesa" — o conjunto promete resultado, não dá próximo passo e não revela que a Fase 2 é paga |

---

*Fim. Nenhum arquivo de código-fonte foi alterado. Branch `main` @ `53fac09` preservada.*
