# Auditoria de Claims — Onboarding + Fase de Análise (Free)

**Projeto:** `/home/lg/workspace/projects/AdeusMultas-Defesa-`
**Branch:** `main` — **SHA:** `53fac09` (working tree limpo, exceto `tests/e2e-reconstruction/admin-pricing-edit.spec.ts` untracked)
**Data:** 2026-10-22
**Escopo:** SOMENTE LEITURA. Nenhum arquivo editado, nenhuma branch/PR/commit criado.
**Método:** grep/read direto no código. Cada afirmação de marketing foi rastreada até a linha que a produz e, depois, até o lastro computacional real.

---

## 0. Inventário do lastro real (numeros concretos, medidos no código)

| Recurso | Quantidade real | Onde | Origem da medição |
|---|---|---|---|
| Regras determinísticas do motor | **15** | `src/core/rules/rule-engine.ts` | `grep -c "^    id: 'RULE_"` → 15 (ids em L39, 79, 123, 166, 208, 241, 276, 349, 400, 443, 475, 509, 542, 583, 617) |
| Teses (`ARGUMENTS_CATALOG`) | **52** (`ARG-001`..`ARG-052`) | `src/core/arguments/arguments-catalog.ts` | `grep -oP "id: 'ARG-\d+'"` → 52 únicas |
| Artigos do CTB estruturados | **31** | `src/core/legal-base/ctb-articles.ts` | `grep -c "^    article: "` → 31 |
| Resoluções do CONTRAN | **9** | `src/core/legal-base/resolutions.ts` | `grep -c "^    number: "` → 9 |
| Precedentes em `JURISPRUDENCE_DB` | **5** | `src/core/legal-base/jurisprudence.ts` | 5 entradas — **código morto: nunca importado** (ver §2) |
| Jurisprudência real por tese | 52 teses com `relatedJurisprudence` | `src/core/arguments/arguments-catalog.ts` | 53 ocorrências (strings estáticas, **não consultadas em runtime**) |
| Peças-modelo (templates `TPL_*`) | **9** | `src/core/templates/templates-catalog.ts` | `grep -oP "id: 'TPL_[^']+'"` → 9 |
| Catálogo de infrações | **33** códigos (26 CTB + 7 rodado) | `src/data/knowledge-base.ts` | `grep -c "code: '"` → 33 |
| Severidades no catálogo | grave 8, gravíssima 14, **média 4, leve 0** | `src/data/knowledge-base.ts` | `grep -oP "severity: '[^']+'" \| sort \| uniq -c` |
| Códigos `media` (únicos que atendem Art. 267) | **4**: `745-50`, `736-62`, `735-80`, `685-80` | `src/data/knowledge-base.ts` | L35, 133, 147, 287 |
| Órgãos (registro nacional) | `NATIONAL_ORGANS_DB` | `src/core/knowledge/national-registry.ts` (1605 linhas) | — |
| Ocorrências de `"390"` em `src/` | **2 — ambas as duas são o texto de marketing** | `AnalysisProcessingStep.tsx:58, 99` | `grep -rn "390" src/` |

**Nenhum número de marketing bate com o lastro real.** "390 dispositivos" não existe em lugar nenhum do código. "7 peças-modelo" — existem 9. "precedentes do STJ em tempo real" — o DB de jurisprudência é código morto.

---

## 1. Semântica real do `overallSuccessRate` (base do claim de "Probabilidade de Êxito")

Fonte: `src/core/rules/rule-engine.ts`, L913–963.

```
baseScore = 35                                  // L915 — baseline SEM nenhuma nulidade detectada
  98  se ARG-048 (decadência 30 dias)          // L917-918
  94  se ARG-051 (Art. 267 advertência)         // L919-920
  92  se ARG-001 (radar sem aferição)           // L921-922
  88  se ARG-025 (Lei Seca sem termo)            // L923-924
  85  se ARG-005 (velocidade considerada)        // L925-926
  82  se ARG-015 (manual sem abordagem/MBFT)    // L927-928
  78  se ARG-002 (ausência R-19)                // L929-930
  min(90, 50 + n_inconsistencias * 15)           // L931-933
adjustedScore = baseScore + completenessBonus(0..10) + evidenceQualityBonus(+3/tes e forte) − gapsPenalty(2/lacuna)
minScore = 30 (se houver ≥1 inconsistência) | 15 (se nenhuma)     // L962
overallSuccessRate = Math.min(99, Math.max(minScore, adjustedScore))  // L963
```

Consequências verificadas:

1. **Não é probabilidade.** É uma heurística manual (tabela de inteiros + bônus). **Não existe** base histórica, calibração, modelo estatístico ou taxa de deferimento por órgão. `grep -rn "calibrat\|deferimento\|winRate\|historico" src/core/` → apenas comentários e `procedures-catalog.ts`, nenhum dataset.
2. **Piso de 30%** (com teses) e **15%** (sem teses). O número **nunca é 0%** — um caso sem qualquer tese ainda mostra "Probabilidade de Êxito 45%" (35 + completeness).
3. **Clamp em 99%** — o número **nunca é 100%**, o que dá aparência falsa de modéstia ("somos honestos, nunca prometemos 100%") enquanto o piso oculta casos sem lastro.
4. A **animação de 1200 ms** ease-out (`FreeAnalysisResultStep.tsx:176-196`) anima de 0 até o valor, criando a percepção de medição ao vivo de um número que é uma constante de tabela.
5. O servidor (`POST /api/cases` → `RagPipeline.analyzeInfraction` → `ExpertRuleEngine.evaluate`) usa **o mesmo motor**, então o valor exibido no dashboard é o mesmo número.

---

## 2. Achado estrutural transversal: `JURISPRUDENCE_DB` é código morto

`src/core/legal-base/jurisprudence.ts` exporta `JURISPRUDENCE_DB` (5 entradas: `SUM_312_STJ`, `SUM_127_STJ`, `TEMA_1097_STJ`, `TJSP_RADAR_CALIB`, `TRF3_LEI_SECA_TERMO`).

```
grep -rn "jurisprudence" src/ --include="*.ts" --include="*.tsx"
→ apenas: a própria definição do arquivo (L2, L8),
  src/knowledge/index.ts:206  (mapeia arg.relatedJurisprudence),
  src/components/knowledge/ArgumentsView.tsx:213 (exibe a string),
  src/server/knowledge/ingestion-service.ts:355 (grava em texto de ingestão)
```

**Nenhum import de `JURISPRUDENCE_DB` em nenhum arquivo.** O motor de regras não consulta jurisprudência. O que existe é a string estática `relatedJurisprudence` em cada uma das 52 teses — usada para exibição e indexação, não para decisão.

→ Logo, "precedentes do STJ" **não é aplicado em tempo real**. É citação estática.

---

## 3. Achado estrutural transversal: `POST /api/cases/anonymous` não existe

```
grep -rn "router\.(post|get|put|patch|delete)('[^']*cases" src/server/routes/*.ts
→ src/server/routes/cases.ts:51  GET    /cases              (authenticateToken)
  src/server/routes/cases.ts:73  GET    /cases/:id          (authenticateToken)
  src/server/routes/cases.ts:114 POST   /cases              (authenticateToken)
  src/server/routes/cases.ts:196 PUT    /cases/:id          (authenticateToken)
  src/server/routes/cases.ts:229 DELETE /cases/:id
  src/server/routes/cases.ts:285 POST   /cases/:id/claim    (authenticateToken)
  src/server/routes/cases.ts:337 POST   /cases/:id/generate-defense
```

O frontend chama `POST /api/cases/anonymous` (`src/components/onboarding/OnboardingWizard.tsx:416`) **quando o usuário NÃO está autenticado** — exatamente o público do diagnóstico gratuito. A rota não existe → 404 → `catch` engole o erro (L452-454) → `savedCaseId` permanece `undefined` → em `handleAuthSuccess` (L501) o bloco `if (savedCaseId)` é **pulado**, ou seja, o caso **nunca é vinculado ao usuário**.

`src/server/routes/cases.ts:131-133` mostra que o backend já sabe gerar `claimToken` para casos anônimos — mas está atrás de `authenticateToken` e o caminho anônimo nunca chega lá.

O próprio repositório registra isso como pendência: `docs/checkpoint-certificacao-e2e.md` L55-56 lista `POST /api/cases/anonymous` como endpoint **a confirmar** ("Passo 1 — Consolidar e validar a matriz de 70 cenários contra o código (PENDENTE)"), e L122/L135 confirma que **nenhum dos 70 cenários foi executado** ("Mapeado, não executado", bloqueio `E2E-B-01`).

→ **Novo bloqueio:** `E2E-B-05 — POST /api/cases/anonymous inexistente; persistência anônima da Fase 1 quebrada`.

---

## 4. Veredito por claim

### C1 — "Cruzando autuação com 390 dispositivos do CTB e Resoluções do CONTRAN"
- **Onde:** `src/components/onboarding/steps/AnalysisProcessingStep.tsx:58`
- **Lastro:** **NENHUM.** `"390"` não existe em nenhum outro lugar de `src/`. Real: 31 artigos CTB + 9 resoluções CONTRAN + 15 regras. O motor cruza a autuação com **15 regras**, não 390 dispositivos.
- **Veredito:** **UNSUPPORTED** — número inventado
- **Risco:** **ALTO** — false advertising de capacidade (CDC art. 37); o número é verificável por qualquer usuário e por auditoria do bundle.
- **Texto corrigido:** `Cruzando autuação com 31 artigos do CTB, 9 Resoluções do CONTRAN e 15 regras de decisão`

### C2 — "Aplicando 390 dispositivos do CTB, 7 peças-modelo validadas e precedentes do STJ em tempo real."
- **Onde:** `src/components/onboarding/steps/AnalysisProcessingStep.tsx:99`
- **Lastro:** **NENHUM (composto).** Três erros numéricos/fatuais:
  - "390 dispositivos" → NENHUM (idem C1).
  - "7 peças-modelo" → existem **9** templates `TPL_*` (`templates-catalog.ts`); não há campo de "validação" de template — o que existe é `integrity-validator.ts` / `final-quality-gate.ts`, que validam **minutas**, não peças-modelo.
  - "precedentes do STJ em tempo real" → `JURISPRUDENCE_DB` é **código morto** (§2). Só há strings estáticas em `relatedJurisprudence`.
  - "em tempo real" → verdadeiro no sentido técnico (§C13): a avaliação é local e síncrona, sem fila.
- **Veredito:** **UNSUPPORTED**
- **Risco:** **ALTO**
- **Texto corrigido:** `Aplicando 15 regras determinísticas, 52 teses jurídicas fundamentadas e 9 peças-modelo estruturadas — sem chamada a modelos de linguagem.`

### C3 — "Diagnóstico jurídico 100% gratuito concluído com sucesso!"
- **Onde:** `AnalysisProcessingStep.tsx:62` (item da lista de estágios)
- **Lastro:** **SUPPORTED.** Fase 1 = passos 1–7 (`OnboardingWizard.tsx:271` `isPhase1 = step <= 7`); o checkout só existe na Fase 2 (`DocumentCheckoutStep`, passo 10). O motor roda local, sem custo de API na Fase 1.
- **Veredito:** **SUPPORTED**
- **Risco:** **BAIXO**
- **Ressalva a registrar:** "gratuito" refere-se **só ao diagnóstico**. Exportar/salvar exige cadastro; a peça final é paga. Não precisa de correção, mas convém qualificar: `Diagnóstico jurídico gratuito concluído` (sem "100%").
- **Nota:** o texto é exibido como *estágio* do checklist e aparece junto de etapas que são teatro (§C13). Ao lado delas, o "100%" perde credibilidade.

### C4 — "100% Gratuito" (badge de fase)
- **Onde:** `OnboardingWizard.tsx:593` (`isPhase1 ? '100% Gratuito' : 'Minuta Jurídica Oficial'`) e `InfractionIdentificationStep.tsx:201`
- **Lastro:** **SUPPORTED** para a Fase 1 — nenhum passo de pagamento antes do resultado.
- **Veredito:** **SUPPORTED**
- **Risco:** **BAIXO**
- **Texto corrigido (opcional):** `Fase 1 • Diagnóstico Preliminar — sem custo` (evita confundir "100%" com promessa numérica)

### C5 — "Diagnóstico Jurídico Gratuito Concluído"
- **Onde:** `FreeAnalysisResultStep.tsx:223`
- **Lastro:** **SUPPORTED** — rótulo de estado da Fase 1.
- **Veredito:** **SUPPORTED**
- **Risco:** **BAIXO**

### C6 — "100% dos Dados Coletados Preservados"
- **Onde:** `src/components/onboarding/AccountVerificationGate.tsx:137`
- **Lastro:** **PARCIAL, e contraditório no ponto exato em que a promessa é feita.** O badge aparece no modal de verificação de conta. Há duas，问题 separadas:
  1. A persistência **existe**, mas só para usuário **autenticado**: `OnboardingWizard.tsx:416` faz `POST /api/cases` (rota real, `cases.ts:114`) quando `isAuthenticated`.
  2. Para usuário **anônimo** (público-alvo do diagnóstico gratuito), a rota chamada é `POST /api/cases/anonymous` — **inexistente** (§3). A falha é engolida em L452; `savedCaseId` fica `undefined`; o `claim` pós-login (L501-516) **nunca executa**. **Os dados coletados (placa, AIT, dados do condutor) são perdidos** — apesar do badge afirmar o contrário.
  - O que **realmente** é preservado: `sessionStorage` guarda **apenas** `step`, `savedCaseId`, `savedClaimToken` (L41-47), sem PII, com TTL de 24 h. O comentário do código (L36-37) é explícito: *"Never persist PII, vehicle/infraction data, analysis results… Case data is persisted server-side."* — o que, para o anônimo, não ocorre.
- **Veredito:** **MISLEADING**
- **Risco:** **ALTO** — (a) perda real de dados do consumidor após a etapa de autenticação; (b) alegação de segurança/preservação não verdadeira, exibida com ícone de escudo (Lock/ShieldCheck), o que agrava a perceptiva de engano; (c) exposição LGPD.
- **Texto corrigido:** `Seus dados de contato serão salvos. O diagnóstico completo fica disponível após a confirmação do e-mail.` — **e** corrigir o backend: criar `POST /api/cases/anonymous` (sem `authenticateToken`, emitindo `claimToken` server-side) ou router a chamada anônima para `POST /api/cases` com autorização própria. Enquanto o endpoint não existir, o badge **não pode** ser exibido.

### C7 — "Isenção de 100% do valor da multa e zero pontos na CNH (sem reincidência)"
- **Onde:** `src/components/onboarding/steps/InfractionCategoryStep.tsx:78` (subtitle do cartão de categoria `conversao_advertencia`, L76-81)
- **Lastro:** **PARCIAL.** O kernel jurídico **existe e está bem implementado**: `RULE_CONVERSAO_ADVERTENCIA_267` (`rule-engine.ts:123-158`) com FAIL CLOSED (`hasPreviousInfractionsLast12Months === false`; `undefined` nunca é tratado como ficha limpa, L143). Mas a frase na UI é apresentada **antes de qualquer coleta de dados**, e há 5 lacunas:
  1. **Escopo real restrito:** o catálogo tem **0 infrações `leve`** e 4 `media` (`745-50`, `736-62`, `735-80`, `685-80`). A "100% de isenção" só é sequer plausível para 4 dos 26 códigos CTB — e só para o usuário que **ainda vai** declarar a não-reincidência.
  2. **Requisito legal omitido:** o Art. 267 (redação Lei 14.071/2020) exige infração "de natureza leve ou média, **passível de ser punida com multa**". O motor testa apenas `severity` do catálogo (`rule-engine.ts:140`), nunca o requisito "passível de ser punida com multa".
  3. **Evidência não coletada:** a própria regra declara `evidenceRequired: ['Extrato de prontuário e histórico de CNH sem infrações nos últimos 12 meses']` (`rule-engine.ts:133`) — mas a UI só coleta um **checkbox de autodeclaração** (`SpecificInfractionDataStep.tsx:488-497`). O "requisito" que sustenta a tese é a palavra do usuário.
  4. **Valor fixo errado:** o `impact` do motor fixa `"100% de isenção do pagamento financeiro (R$ 130,16) e 0 pontos na CNH"` (`rule-engine.ts:152`) independentemente da multa real — que no catálogo chega a R$ 293,47 (605-01) e R$ 2.934,70 (757-90).
  5. **Natureza jurídica distorcida:** desde a Lei 14.071/2020 a conversão é **de ofício** pelo órgão ("sem a necessidade de solicitação do cidadão", PRF). Não é um "serviço" a ser adquirido — é direito administrativo de ofício cujo descumprimento se combate por recurso. Vender isso como produto é, no mínimo, impreciso.
- **Veredito:** **MISLEADING**
- **Risco:** **ALTO** — promessa de resultado financeiro (100% do valor) e de pontuação (0 pontos) antes da verificação de requisitos, com base em autodeclaração. Se a declaração for falsa, a peça assinada pelo usuário afirmará ao órgão um fato inexistente → responsabilização do consumidor, e o app foi o que marketed a certeza.
- **Texto corrigido:** `Conversão em advertência por escrito (Art. 267 do CTB) — quando a infração for leve ou média punível com multa e não houver outra infração nos últimos 12 meses. A conversão é de ofício pelo órgão de trânsito; a análise indica os requisitos a comprovar.`

### C8 — Badge "100% Isenção"
- **Onde:** `src/core/onboarding/rules-matrix.ts:62` (`USER_SITUTIONS`, `id: 'conversao_advertencia'`); o texto vizinho L60-61 ("Conversão em Advertência (0 Reais de Multa)" / "Isenção total de pagamento e 0 pontos na CNH para infrações leves ou médias") é renderizado em `ServiceStep.tsx:80, 86` — a **primeira tela** do wizard.
- **Lastro:** **NENHUM** no sentido do rótulo. "100% Isenção" é um badge de marketing de serviço, não um estado do sistema; o outcome depende de requisitos que ainda nem foram coletados. Nenhuma linha de código produz ou garante "100%".
- **Veredito:** **MISLEADING**
- **Risco:** **ALTO** — badge na tela de seleção de serviço, antes de qualquer informação do usuário, prometendo resultado financeiro e de pontuação.
- **Texto corrigido:** badge → `Art. 267 CTB`; título → `Conversão em Advertência por Escrito`; subtitle → `Quando a infração for leve ou média punível com multa e não houver reincidência em 12 meses, o órgão deve converter de ofício (Lei 14.071/2020). Requisitos verificados na análise.`

### C9 — "Requisitos Legais para 100% de Isenção (Art. 267 do CTB)"
- **Onde:** `src/components/onboarding/steps/SpecificInfractionDataStep.tsx:480`
- **Lastro:** **PARCIAL.** O cabeçalho anuncia "requisitos legais" e o bloco abaixo (L483-499) contém: (a) copy legal resumida que **omite** o requisito "passível de ser punida com multa"; (b) um único checkbox de autodeclaração "Confirmo que não cometi nenhuma infração nos últimos 12 meses" (L488-497). O requisito de **evidência** (extrato de prontuário) exigido pela regra **não é coletado** e **não é exigido**.
- **Veredito:** **MISLEADING**
- **Risco:** **ALTO**
- **Texto corrigido:** `Requisitos do Art. 267 do CTB (conversão em advertência por escrito)` + checklist real dos três requisitos legais, com o checkbox rotulado `Declaro que não cometi nenhuma outra infração nos últimos 12 meses (o extrato de prontuário será solicitado para comprovar)` e marca de "requisito ainda não comprovado" no resultado.

### C10 — "Você tem DIREITO SUBJETIVO de converter esta multa em advertência por escrito - não pagará valor e não perderá pontos na CNH"
- **Onde:** `src/components/onboarding/steps/FreeAnalysisResultStep.tsx:65` (campo `userImpact` do bloco `ARG-051`)
- **Lastro:** **PARCIAL, com contradição interna comprovável.** O texto é **hardcoded** e independe do resultado da verificação:
  - O `evidenceCheck` da mesma entrada (L55-64) decide aplicabilidade com uma **lista hardcoded de 3 códigos**: `['745-50', '735-80', '736-62', '735-80']` (com `'735-80'` duplicado), com o comentário do próprio autor: *"Simplificação para demonstração - na prática usaria o catálogo completo"* (L57).
  - O motor usa o `INFRACTION_CATALOG` e reconhece **4** códigos `media`. O código `685-80` (lotação excedente, Art. 231 VII) satisfaz o Art. 267 no motor, mas **não** está na lista do front.
  - **Resultado:** para `685-80`, a tela exibe simultaneamente *"O que encontramos nos seus dados: Infração classificada como grave/gravíssima (não se aplica Art. 267)"* **e** *"Você tem DIREITO SUBJETIVO… não pagará valor e não perderá pontos na CNH"* — no mesmo card, lado a lado.
  - Omitidos: "passível de ser punida com multa"; risco de reconversão em multa se nova infração em 12 meses; ausência de comprovação documental.
- **Veredito:** **MISLEADING**
- **Risco:** **ALTO** — afirmação de direito subjetivo com certeza absoluta sobre resultado financeiro e pontuação, com contradição textual interna e base probatória inexistente.
- **Texto corrigido:** `Com base nos dados que você informou, a infração **atende** aos requisitos do Art. 267 do CTB: não há tese de nulidade e o pedido de conversão em advertência por escrito é juridicamente cabível. A conversão depende da análise do órgão autuador e da comprovação do prontuário.`
- **Correção de código associada:** trocar a lista hardcoded por `INFRACTION_CATALOG.find(i => i.code === code)?.severity` (mesma fonte do motor).

### C11 — "Alto potencial de anulação" / "Potencial identificado — análise detalhada disponível"
- **Onde:** `src/components/onboarding/steps/FreeAnalysisResultStep.tsx:245` (rótulo abaixo do número), com `isHighProbability = successRate >= 80` (L168) e `isMediumProbability = successRate >= 60 && < 80` (L201)
- **Lastro:** **PARCIAL, semanticamente deformado.** O rótulo é função direta do `overallSuccessRate`, que é heurística manual (§1), não "potencial de anulação". Três problemas concretos:
  1. O **número grande é exibido mesmo com zero teses**: a condição do rótulo exige `defensePoints.length > 0`, mas o `{displayedRate}%` (L242) é renderizado incondicionalmente. Um caso sem nenhuma tese mostra, lado a lado, **"Probabilidade de Êxito 45%"** e *"Nenhuma tese autorizada com os dados informados"* (L245).
  2. O score mede **força da tese + completude do formulário**, não probabilidade de êxito: `+10` se todos os campos relevantes preenchidos, `−2` por lacuna de dado. Preencher mais campos **eleva** o número — o que é incoerente com "probabilidade de êxito".
  3. **Piso de 30%** significa que uma inconsistência fraca ainda anuncia 30% "de êxito"; **clamp 99%** impede o valor máximo honesto.
- **Veredito:** **MISLEADING**
- **Risco:** **ALTO** — número de grande destaque com semântica de probabilidade sem qualquer base estatística; induz o consumidor a crer em um prognóstico quantitativo.
- **Texto corrigido:** substituir o rótulo por um que descreva o que o número **é**: `Força da fundamentação identificada` / `Fundamentação robusta (15 regras avaliadas)` e, abaixo, `Estimativa heurística interna — não é probabilidade estatística de deferimento.` Quando não houver teses, **ocultar o número** e mostrar só a mensagem de dados faltantes.

### C12 — "Probabilidade de Êxito" exibida como porcentagem animada
- **Onde:** `FreeAnalysisResultStep.tsx:239` (título), `:242` (o número), `:176-196` (animação 1200 ms ease-out); replicado em `AccountVerificationGate.tsx:142` (`Diagnóstico Preliminar Concluído ({analysis.overallSuccessRate ?? 0}% de êxito)`)
- **Lastro:** **NENHUM para "probabilidade".** Semântica real = §1. A animação de 0→valor em 1,2 s é teatro de "medição ao vivo" sobre uma constante de tabela.
- **Veredito:** **MISLEADING**
- **Risco:** **ALTO**
- **Texto corrigido:** `Índice de fundamentação` + legenda `Pontuação interna (0–100) derivada de regras aplicadas e completude dos dados. Não representa probabilidade estatística de deferimento.` Alternativa: remover o número da tela e listar "N teses detectadas / N regras avaliadas / N campos faltantes" — dados verificáveis.

### C13 — "Inteligência Jurídica" / "Processamento em Tempo Real"
- **Onde:** `AnalysisProcessingStep.tsx:93` e `:96`; etapas do checklist em `:56-63`
- **Lastro:** **PARCIAL — a parte técnica é verdadeira, o encobrimento não é.**
  - **Verdadeiro:** a análise é **local, determinística e síncrona**. `AnalysisProcessingStep.tsx:49` chama `ExpertRuleEngine.evaluate(...)` no `useEffect` de mount. O componente **não faz nenhum `fetch`/`axios`/`supabase`** (grep: zero ocorrências). O `ai-orchestrator` **não participa da Fase 1** — `registerRefinementProvider` só é chamado em rotas de servidor (`src/server/routes/{ai,cases,defense}.ts`), usadas na Fase 2 para polir a minuta. Logo: **sem LLM na análise gratuita** (isto é um ponto forte e deve ser declarado).
  - **Encoberto:** o checklist de 6 estágios é uma simulação de `setTimeout` (L65-81) com durações 700+800+800+700+700+500 = **4 200 ms**, e roda **depois** de a análise real já ter terminado (L49-50). As etapas **não correspondem a operações distintas executadas**: "Cruzando… 390 dispositivos" (falso), "Calibrando probabilidade de deferimento perante o órgão autuador" (**sem lastro nenhum** — não há calibração, histórico nem dado por órgão), "Verificando vigência temporal: Lei 14.071/2020, 14.229/2021, **14.440/2022**, 14.599/2023" — o motor checa `validFrom/validUntil` **das regras** (`rule-engine.ts:659-669`), não das leis, e **"14.440/2022" não aparece em nenhum outro lugar do código**.
  - **Citação errada:** a etapa L59 diz *"Auditando decadência de prazo (**Art. 281-A** CTB — Lei 14.071/2020)"*. O Art. 281-A (incluído pela Lei 14.071/2020) trata do **prazo mínimo de 30 dias para defesa prévia**; a **decadência** é o **Art. 281, §1º, II**. O motor implementa corretamente Art. 281, II (`RULE_DECADENCIA_30_DIAS`).
- **Veredito:** **PARTIAL** (com encobrimento material e uma citação legal incorreta)
- **Risco:** **MÉDIO** (o claim de "tempo real" é tecnicamente defensável; o risco está nas etapas falsas + citação errada, e na impressão residual de "IA" onde há regra determinística)
- **Texto corrigido:** badge → `Análise determinística local`; título → `Analisando sua autuação com 15 regras jurídicas`; etapas → reescrever para descrever o que **realmente** acontece: `Validando dados`, `Aplicando 15 regras`, `Verificando vigência de cada regra na data da infração`, `Checando decadência (Art. 281, §1º, II, CTB)`, `Apurando requisitos do Art. 267`, `Consolidando teses` — e **remover** a etapa de "calibração de deferimento" e a referência a 390/14.440.

---

## 5. Tabela-resumo

| # | Claim | Onde | Lastro real | Veredito | Risco |
|---|---|---|---|---|---|
| C1 | "390 dispositivos do CTB" | `AnalysisProcessingStep.tsx:58` | NENHUM (real: 31 arts + 9 res + 15 regras) | **UNSUPPORTED** | ALTO |
| C2 | "390 … 7 peças-modelo … precedentes do STJ em tempo real" | `AnalysisProcessingStep.tsx:99` | NENHUM (9 templates; `JURISPRUDENCE_DB` é código morto) | **UNSUPPORTED** | ALTO |
| C3 | "Diagnóstico jurídico 100% gratuito concluído com sucesso!" | `AnalysisProcessingStep.tsx:62` | Fase 1 sem checkout | **SUPPORTED** | BAIXO |
| C4 | "100% Gratuito" | `OnboardingWizard.tsx:593`, `InfractionIdentificationStep.tsx:201` | `isPhase1 = step <= 7` | **SUPPORTED** | BAIXO |
| C5 | "Diagnóstico Jurídico Gratuito Concluído" | `FreeAnalysisResultStep.tsx:223` | rótulo de estado da Fase 1 | **SUPPORTED** | BAIXO |
| C6 | "100% dos Dados Coletados Preservados" | `AccountVerificationGate.tsx:137` | PARCIAL — persistência só p/ autenticado; `POST /api/cases/anonymous` **não existe** ⇒ anônimo perde tudo | **MISLEADING** | ALTO |
| C7 | "Isenção de 100% … zero pontos (sem reincidência)" | `InfractionCategoryStep.tsx:78` | PARCIAL — regra real FAIL CLOSED, mas 0 leves no catálogo, requisito "punível com multa" omitido, evidência não coletada, valor fixo R$130,16 | **MISLEADING** | ALTO |
| C8 | Badge "100% Isenção" | `rules-matrix.ts:62` (+ L60-61, render em `ServiceStep.tsx:80,86`) | NENHUM — outcome de marketing, não estado do sistema | **MISLEADING** | ALTO |
| C9 | "Requisitos Legais para 100% de Isenção (Art. 267)" | `SpecificInfractionDataStep.tsx:480` | PARCIAL — 1 checkbox de autodeclaração; extrato exigido pela regra não coletado | **MISLEADING** | ALTO |
| C10 | "Você tem DIREITO SUBJETIVO … não pagará valor e não perderá pontos" | `FreeAnalysisResultStep.tsx:65` | PARCIAL — hardcoded; contradição interna para `685-80` (lista hardcoded de 3 vs 4 `media` do catálogo) | **MISLEADING** | ALTO |
| C11 | "Alto potencial de anulação" / "Potencial identificado" | `FreeAnalysisResultStep.tsx:245` | PARCIAL — rótulo derivado do score heurístico; número exibido mesmo com 0 teses | **MISLEADING** | ALTO |
| C12 | "Probabilidade de Êxito" animada | `FreeAnalysisResultStep.tsx:239,242,176-196`; `AccountVerificationGate.tsx:142` | NENHUM para "probabilidade" — heurística manual (base 35, piso 15/30, clamp 99) | **MISLEADING** | ALTO |
| C13 | "Inteligência Jurídica" / "Processamento em Tempo Real" | `AnalysisProcessingStep.tsx:93,96,56-63` | PARCIAL — análise local determinística real; checklist de 4,2 s é teatro; "calibração de deferimento" sem lastro; **"Art. 281-A" citado errado** | **PARTIAL** | MÉDIO |

---

## 6. Correções sugeridas (texto pronto, por arquivo/linha)

| Arquivo:linha | Antes | Depois |
|---|---|---|
| `AnalysisProcessingStep.tsx:58` | `Cruzando autuação com 390 dispositivos do CTB e Resoluções do CONTRAN` | `Cruzando autuação com 31 artigos do CTB, 9 Resoluções do CONTRAN e 15 regras de decisão` |
| `AnalysisProcessingStep.tsx:59` | `…decadência de prazo (Art. 281-A CTB — Lei 14.071/2020) e aferição de radar` | `Auditando decadência de prazo (Art. 281, §1º, II, CTB) e aferição de radar` |
| `AnalysisProcessingStep.tsx:60` | `Verificando vigência temporal: Lei 14.071/2020, 14.229/2021, 14.440/2022, 14.599/2023` | `Verificando a vigência de cada regra na data da infração` |
| `AnalysisProcessingStep.tsx:61` | `Calibrando probabilidade de deferimento perante o órgão autuador` | `Apurando os requisitos legais aplicáveis ao seu caso` |
| `AnalysisProcessingStep.tsx:93` | `Processamento em Tempo Real` | `Análise determinística local` |
| `AnalysisProcessingStep.tsx:96` | `Analisando sua autuação com Inteligência Jurídica` | `Analisando sua autuação com 15 regras jurídicas` |
| `AnalysisProcessingStep.tsx:99` | `Aplicando 390 dispositivos… 7 peças-modelo… precedentes do STJ em tempo real.` | `Aplicando 15 regras determinísticas e 52 teses jurídicas fundamentadas — sem uso de modelos de linguagem.` |
| `AccountVerificationGate.tsx:137` | `100% dos Dados Coletados Preservados` | `Seus dados de contato serão salvos. O diagnóstico fica disponível após a confirmação do e-mail.` *(e criar `POST /api/cases/anonymous`)* |
| `AccountVerificationGate.tsx:142` | `Diagnóstico Preliminar Concluído (X% de êxito)` | `Diagnóstico Preliminar Concluído (X teses mapeadas)` |
| `rules-matrix.ts:60-62` | `Conversão em Advertência (0 Reais de Multa)` / badge `100% Isenção` | `Conversão em Advertência por Escrito` / badge `Art. 267 CTB` |
| `rules-matrix.ts:61` | `…Isenção total de pagamento e 0 pontos na CNH para infrações leves ou médias.` | `Quando a infração for leve ou média punível com multa e não houver reincidência em 12 meses, o órgão deve converter de ofício (Lei 14.071/2020).` |
| `InfractionCategoryStep.tsx:78` | `Isenção de 100% do valor da multa e zero pontos na CNH (sem reincidência).` | `Possível conversão em advertência por escrito, sem multa e sem pontos, se a infração for leve ou média e não houver reincidência em 12 meses.` |
| `SpecificInfractionDataStep.tsx:480` | `Requisitos Legais para 100% de Isenção (Art. 267 do CTB)` | `Requisitos do Art. 267 do CTB (conversão em advertência por escrito)` |
| `SpecificInfractionDataStep.tsx:496` | `Confirmo que não cometi nenhuma infração nos últimos 12 meses.` | `Declaro que não cometi nenhuma outra infração nos últimos 12 meses. (O extrato de prontuário será solicitado para comprovação.)` |
| `FreeAnalysisResultStep.tsx:58` | lista hardcoded `['745-50','735-80','736-62','735-80']` | `const cat = INFRACTION_CATALOG.find(i => i.code === infractionCode); const isLightOrMedium = cat ? ['leve','media'].includes(cat.severity) : false;` |
| `FreeAnalysisResultStep.tsx:65` | `Você tem DIREITO SUBJETIVO…` | `Com base nos dados informados, a infração atende aos requisitos do Art. 267 do CTB: o pedido de conversão em advertência por escrito é juridicamente cabível. A conversão depende do órgão autuador e da comprovação do prontuário.` |
| `FreeAnalysisResultStep.tsx:239-242` | `Probabilidade de Êxito` + `{displayedRate}%` | `Índice de fundamentação` + `{displayedRate}/100` + legenda `Pontuação interna derivada das regras aplicadas e da completude dos dados. Não é probabilidade estatística de deferimento.` — e **ocultar o número quando `defensePoints.length === 0`** |
| `FreeAnalysisResultStep.tsx:245` | `Alto potencial de anulação` | `Fundamentação robusta identificada` |
| `rule-engine.ts:152` | `impact: '100% de isenção … (R$ 130,16) …'` | `impact: 'Conversão em advertência por escrito: sem multa e sem pontuação, se confirmada pelo órgão autuador.'` |

---

## 7. O que NÃO foi possível verificar (e não foi inventado)

1. **Execução real da suíte E2E (70 cenários).** `docs/checkpoint-certificacao-e2e.md` L24 e L122/L135: "Mapeado, **não executado**", bloqueio `E2E-B-01` aberto. Nenhuma evidência PASS/FAIL/BLOCKED existe. Consequência: o comportamento de runtime de `POST /api/cases/anonymous` **não** foi observado — foi deduzido por leitura (rota ausente no código-fonte, o que é conclusivo quanto à existência).
2. **Persistência real em Supabase.** `case-repository.ts` exige `ALLOW_IN_MEMORY_CASE_PERSISTENCE=true` ou write-through no Postgres (FAIL CLOSED). Não houve credencial nem servidor no escopo desta auditoria (somente leitura).
3. **Conteúdo ingerido do RAG / base de conhecimento.** `src/core/knowledge/` tem código (ingestion, temporal-engine, national-registry com 1605 linhas) e `src/core/rag/rag-pipeline.ts` existe, mas **se há vetores/embeddings/documentos efetivamente ingeridos no banco** exige acesso ao Supabase — não verificado. O que foi verificado é o suficiente para os claims auditados: o DB de jurisprudência é código morto e a base legal estática tem 31 artigos + 9 resoluções + 52 teses.
4. **`enrichDefenseWithGemini` (Fase 2).** Depende de credencial Gemini; irrelevante para os claims da Fase 1 auditados (confirmado por leitura: o provider só é registrado em rotas de servidor para a Fase 2).
5. **Juízo jurídico formal** sobre o risco das afirmações "isenção de 100%" / "não perderá pontos" / "direito subjetivo" — o relatório classifica o risco a partir do texto legal do Art. 267 (redação Lei 14.071/2020, verificada na fonte oficial) e do comportamento do código; não substitui parecer de advogado.

---

## 8. Conclusão

- **9 de 13 claims classificados como MISLEADING (7) ou UNSUPPORTED (2).** Dos 4 restantes: 3 SUPPORTED (rótulos de gratuidade da Fase 1) e 1 PARTIAL ("Processamento em Tempo Real", tecnicamente defensável mas com checklist de teatro).
- **Nenhum claim quantitativo da tela de análise/análise gratuita tem lastro.** "390", "7 peças", "Probabilidade de Êxito", "100% Isenção", "100% dos Dados Preservados" — todos sem lastro ou com lastro invertido.
- **Risco legal alto** em 7 claims (C6, C7, C8, C9, C10, C11, C12): todos tocam em (a) promessa de resultado financeiro e de pontuação, (b) afirmação de certeza jurídica, (c) base probatória ausente. Um consumidor que pague com base em "100% de isenção / 0 pontos / direito subjetivo garantido" e tenha a declaração negada pelo órgão terá perdido dinheiro com uma promessa que o código não sustenta.
- **Dois bloqueios técnicos de alta gravidade, independentes da copy:**
  - `E2E-B-05` — `POST /api/cases/anonymous` inexistente ⇒ **perda de dados do consumidor anônimo** no caminho do badge "Dados Preservados" (§3).
  - `E2E-B-06` — `FreeAnalysisResultStep.tsx:58` usa severidade hardcoded (3 códigos) em vez do `INFRACTION_CATALOG` (4 códigos) ⇒ **contradição na mesma tela** para `685-80` (L61 vs L65).
- **Veredito de prontidão:** NEEDS WORK. A base determinística é real e de qualidade (FAIL CLOSED em reincidência, vigência temporal de regras implementada, 52 teses com jurisprudência citada, 15 regras auditáveis) — mas a camada de comunicação está **à frente** da evidência, e nesse domínio (multa + CNH) isso é risco regulatório e de consumer law, não só de copy.

---

*Auditoria somente-leitura. Nenhum arquivo do repositório foi modificado; nenhuma branch, PR ou commit foi criado.*
*Repositório em `main`, SHA `53fac09`, working tree limpo (exceto `tests/e2e-reconstruction/admin-pricing-edit.spec.ts` untracked, pré-existente).*
