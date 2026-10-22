# UI Finish Gate — Tela de Resultado da Análise Jurídica (Fase Gratuita)

**Alvo:** `src/components/onboarding/steps/FreeAnalysisResultStep.tsx` (456 linhas)
**Apoio:** `src/core/arguments/arguments-catalog.ts`, `src/core/rules/rule-engine.ts`, `src/core/rag/rag-pipeline.ts`, `src/types/index.ts`, `docs/padrao_GOV.BR.md`
**Base:** `main` @ `53fac09` (working tree limpo, exceto spec E2E não rastreado)
**Data:** 2026-10-22
**Modo:** somente leitura — nenhum arquivo do repositório foi alterado.

---

## 0. Veredito

**HOLD.** A tela **não está pronta para usuário real**. Ela não está "genérica" no sentido estético: a estrutura visual é boa. O defeito é **factual e estrutural** — a tela reconstrói a semântica jurídica no layer de view, em vez de consumir a saída do domínio, e por isso:

1. ** mente com dados que o usuário não informou** (código, artigo, multa, pontos);
2. **contradiz o motor determinístico que produziu o número na tela** (ex.: o motor detecta calibração vencida; a tela diz "Não há registro de data de averificação");
3. **entrega jargão jurídico** nas teses que o próprio motor considera mais fortes (ARG-048, ARG-049) — que é exatamente a reclamação do ODONO ("textos complexos e sem sentido").

O achado raiz, reproduzível: **`FreeAnalysisResultStep.tsx` lê apenas 3 campos do `CaseAnalysis`** (`overallSuccessRate`, `dataCompleteness`, `recommendedArguments`) e ignora todos os outros 8 — incluindo `detectedInconsistencies` (que já contém descrições em português claro escritas pelo domínio), `procedureDeadline` (o prazo real), `dataGaps` (o que não pôde ser avaliado), `integrityScore`, `summaryReasoning`, `evaluatedRules`, `recommendedProcedure` e `competentBody`. Verificação por grep no arquivo: nenhuma dessas chaves aparece.

---

## 1. Lente do produto

**Usuário e trabalho:** condutor comum, multado, no celular, respondendo a uma cobrança de multa. Ele não quer um "diagnóstico"; ele quer saber **se vale a pena gastar dinheiro** e **se o sistema realmente olhou o que ele informou**.

**Objeto de primeira leitura:** o número de "Probabilidade de Êxito" e o que ele significa para a *minha* multa (valor, pontos, chance de não pagar).

**Ação primária:** "Gerar Minha Defesa".

**O que repete:** o usuário acabou de preencher um formulário longo de dados da infração. Ele **acaba de dizer ao sistema o que aconteceu**. A tela precisa refletir o que ele disse.

**O que é raro e de alto risco:** prazo de defesa, decadência, e a_instance que o motor jáauditou com FAIL CLOSED.

**Contrato técnico já existente e não usado:** `ExpertRuleEngine.evaluate()` devolve `detectedInconsistencies[].description` em português direto, ex. `rule-engine.ts:64`:

> "A notificação foi postada 34 dias após a data da infração, violando o prazo limite decadencial improrrogável de 30 dias."

Esse texto é pronto para o usuário. A tela nunca o mostra.

---

## 2. Contrato de Design (referência para o time)

```markdown
# Free Analysis Result — Design Contract

**User + job:** condutor multado, no celular, precisa decidir se investe numa peça de defesa.
**First-read object:** o veredito por caso (chance + valor + pontos + prazo), não um card de tese.
**Primary action:** "Gerar minha defesa" (única ação primária), com "Salvar e ver no painel" como secundária.
**Density decision:** compacto. O mobile não rola 4 blocos de texto jurídico; cada bloco cabe em 1–2 linhas.
**Hierarchy:** (1) veredito do caso → (2) o que foundamos no SEU caso → (3) o que a lei diz → (4) o que isso significa. Prazos e valores antes das teses.
**Interaction model:** não há canvas, não há tabela. É um resumo decisório + lista de teses em accordion. Estado único.
**Responsive priority:** o veredito e o prazo ficam fixos no topo; as teses colapsam; nada de truncar artigo/órgão sem alternativa.
**References:** padrão de "diagnóstico" do Detran/DER (o cidadão lê o que o órgão achou no processo dele) + padrão de resumo de decisão do consumer.gov.br (ação única, dados do seu caso primeiro).
**Forbidden defaults:** (a) porcentagem de "probabilidade" sem base estatística; (b) fallbacks de dado ausente; (c) jargão de catálogo como copy de usuário; (d) "O que verificamos" que repete o título; (e) Contradição entre o número e o texto das teses.
**Finish evidence:** screenshots 1440px e 390px; estados: sem teses, 1 tese, 3+ teses, dado ausente, dado divergente; teste de conteúdo que falhe se a tela contradizer o motor.
```

---

## 3. Evidência comparável (referências)

| Padrão | Job que serve | Lição transferível |
|---|---|---|
| **Detran/DER — "Consulta de Autuação"** | Mostrar ao citando o que o órgão registrou **sobre o processo dele** | O bloco central é "o que consta no seu processo", não "o que a lei diz". A lei vem depois, e curta. |
| **consumer.gov.br — "Resolver problema"** | Decidir se vale abrir reclamação | Uma pergunta de decisão ("reclamar?") com 2–3 fatos do próprio caso; a fundamentação fica atrás de link. |
| **Stripe / Nubank — breakdown de cobrança** | Número financeiro que não pode ser inventado | Se o dado não existe, mostra "—" com ação para preencher. Nunca mostra um valor de exemplo. |
| **GOV.BR — Linguagem Simples (§Guia de Conteúdo, doc:210-217)** | Copy para cidadão | Voz ativa, ≤20 palavras/frase, jargão eliminado ou significado expandido na primeira ocorrência. |

---

## 4. Checklist do Finish Gate — veredito por critério

| # | Critério | Veredito | Evidência principal |
|---|---|---|---|
| 1 | Cobertura de conteúdo / utilidade do texto | **NEEDS WORK** | 4/52 teses mapeadas; 9/13 teses alcançáveis caem no fallback; jargão puro em ARG-048/ARG-049 |
| 2 | Lógica de confiança | **NEEDS WORK** | Match de substring PT, case-sensitive; ARG-001 e ARG-002 com resultado garantidamente errado |
| 3 | Redundância "O que verificamos" | **NEEDS WORK** | Linha 364 renderiza `point.title`, idêntico ao título da linha 349 |
| 4 | Honestidade da "Probabilidade de Êxito" | **NEEDS WORK** | Heurística 15–99 clampada, sem base estatística; satura em 99; muda de valor sob o usuário |
| 5 | Fallbacks hardcoded | **NEEDS WORK** | 4 campos que mentem: artigo, código, multa (e formato), pontos |
| 6 | Conformidade com `docs/padrao_GOV.BR.md` | **NEEDS WORK** (escopo não aplicável, autoconformidade falha) | Doc não se aplica juridicamente; o arquivo se autodeclara GOV.BR e falha Linguagem Simples, contraste, hierarquia, ARIA |
| 7 | Estados (loading/empty/erro/foco/estreito) | **NEEDS WORK** | Sem `aria-live`, sem `role=alert`, truncate silencioso, zero estado de erro, sem teste |
| 8 | Consistência de implementação | **NEEDS WORK** | 9 imports lucide mortos; `serviceType` prop morto; copy que promete tela inexistente |
| — | **Veredito geral** | **HOLD** | 0 de 8 critérios em PASS |

---

## 5. Findings — CRÍTICO

### C1 — A tela contradiz o motor em ARG-001 (afereição de radar vencida)

**Arquivos:** `FreeAnalysisResultStep.tsx:39-47` vs `rule-engine.ts:97-113` e `rule-engine.ts:713`

A regra `RULE_RADAR_CALIBRACAO_12M` só retorna `FAIL` (e portanto só adiciona ARG-001 a `recommendedArguments`) quando `ctx.radarCalibrationDate` **existe** e `diffDays > 365`. O `ctx.radarCalibrationDate` é preenchido em `rule-engine.ts:713` a partir de `infraction.inmetroAferitionDate`.

A view, porém, lê um campo que **não existe** em `InfractionData`:

```ts
// FreeAnalysisResultStep.tsx:39
if (data.infraction.radarCalibrationDate) {   // ← campo inexistente
```

`InfractionData` (`src/types/index.ts:52-115`) tem `inmetroAferitionDate` (linha 72). O onboarding coleta `inmetroAferitionDate` (`SpecificInfractionDataStep.tsx:198-199`). `radarCalibrationDate` só existe no contexto do RuleEngine (`knowledge-schema.ts:269`) — nunca chega à view.

**Consequência:** `evidenceCheck` sempre cai no `return` da linha 47 →
`"Não há registro de data de averificação disponível para validação"` →
confiança `"Médio"` / `"Baseado em ausência de comprovação disponível nos dados fornecidos"`.

O usuário lê: *"O que encontramos nos seus dados: Não há registro de data de averição disponível"* — **em um caso onde o motor só o recomendou porque a data existe e venceu**. E lê *"Nível de confiança: Médio"*, quando o motor atribuiu `baseScore = 92` (`rule-engine.ts:921-922`).

Isto não é probabilístico: é **garantido** para todo ARG-001. E não passa no typecheck porque `evidenceCheck: (data: any) => string` (`FreeAnalysisResultStep.tsx:31`) e `arg: any` (linha 26) desligam a checagem.

### C2 — ARG-002 sempre mostra "confiança Baixo" (inversão semântica)

**Arquivos:** `FreeAnalysisResultStep.tsx:72` e `:128-135` vs `rule-engine.ts:255-263`

A regra `RULE_SINALIZACAO_INSUFICIENTE_90` só dispara com `ctx.hasR19SignageProof === false` (fail closed). Logo, **ARG-002 só é recomendado quando o dado prova a ausência** de sinalização.

A `evidenceCheck` então devolve (linha 72):
`"Ausência de comprovação de sinalização regulatória nos documentos"`

A lógica de confiança procura a string **minúscula** `'ausência de'` (linha 130). `"Ausência"` tem A maiúsculo → **não casa**. Cai no `else` (linha 133) → `"Baixo"` / `"Evidência insuficiente para conclusão definitiva"`.

Resultado: a tese mais forte (motor: `baseScore = 78`, impacto `"Atipicidade da conduta e cancelamento da autuação"`) é apresentada ao usuário como **evidência insuficiente**. É o inverso do que o dado significa — o usuário respondeu "não", e a tela diz "não sei".

### C3 — ARG-051 se contradiz dentro do próprio card

**Arquivos:** `FreeAnalysisResultStep.tsx:56-65` vs `rule-engine.ts:143-153` e `src/data/knowledge-base.ts:287-296`

A view classifica leve/média por uma **lista hardcoded de 4 códigos**, com duplicata:

```ts
// FreeAnalysisResultStep.tsx:58
const isLightOrMedium = ['745-50', '735-80', '736-62', '735-80'].includes(infractionCode);
//                                    ↑ '735-80' repetido; '685-80' ausente
```

O motor classifica pelo catálogo (`rule-engine.ts:141`): `cat.severity === 'leve' || cat.severity === 'media'`. No catálogo, os códigos `media` são `745-50`, `736-62`, `735-80` **e `685-80`** (`knowledge-base.ts:287-296` — "Transitar com o veículo com lotação excedente", Art. 231, VII CTB, `recommendedArgumentCodes: ['ARG-048','ARG-049','ARG-051']`).

Para uma infração `685-80` com ficha limpa:
- Motor: ARG-051 dispara, `baseScore = 94`, procedimento = `conversao_advertencia` (`rule-engine.ts:907-908`).
- Tela: `"Infração classificada como grave/gravíssima (não se aplica Art. 267)"` (linha 61)…
- …seguido, na seção seguinte, por: `"Você tem DIREITO SUBJETIVO de converter esta multa em advertência por escrito - não pagará valor e não perderá pontos na CNH"` (linha 65).

Duas frases mutuamente exclusivas, com 40px de distância, no mesmo card. A regra do motor cobre `families: ['excesso_velocidade','celular','estacionamento','cinto','circulacao','documentos','lotacao']` (`rule-engine.ts:138`); a lista da view só contém códigos de velocidade.

### C4 — A UI inventa dados que o usuário não informou

**Arquivo:** `FreeAnalysisResultStep.tsx:307, 308, 317, 318`

```tsx
307  {infractionData.ctbArticle || 'Art. 218 do CTB'}      // artigo inventado
308  {infractionData.infractionCode || '745-50'}           // código inventado
317  R$ {infractionData.fineAmount?.toFixed(2) || '130,16'} // multa inventada
318  {infractionData.points || 4} Pontos na CNH             // pontos inventados
```

- **`points || 4`**: se a infração vale 0 pontos (leve, ou isenta), a tela escreve **"4 Pontos na CNH"**. Inversão factual, não omissão.
- **`fineAmount`**: dois formatos diferentes no mesmo campo — o valor real sai como `"130.16"` (ponto, `toFixed(2)`) e o fallback como `"130,16"` (vírgula, linha 317). O usuário lê "R$ 130.16" com separador decimal americano.
- **`ctbArticle` / `infractionCode`**: o usuário não informou artigo nem código, e a tela atribui "Art. 218 do CTB" e "745-50" — que é o enquadramento de **excesso de velocidade**, independentemente de a infração ser de sinalização, celular ou álcool. Uma infração de alcoolemia com código em branco aparece na tela como se fosse um radar.
- **Contradição com o padrão do próprio repositório:** `rule-engine.ts:973-977` diz, em comentário: *"Prazo: somente o prazo real da notificação. Nenhum prazo inventado"*. A mesma disciplina não foi aplicada nesta view.

Os fallbacks honestos já existem na mesma linha de código e devem ser o padrão: `autuadorBody || '— não informado —'` (linha 312), `aitNumber || 'N/A'` (linha 229), `plate || 'N/A'` (linha 230). **Manter.**

### C5 — "Probabilidade de Êxito" não é probabilidade

**Arquivos:** `FreeAnalysisResultStep.tsx:167-168, 236-246` vs `rule-engine.ts:913-963`

O valor exibido é `analysis.overallSuccessRate`. No motor:

```
baseScore       = escada fixa (98 / 94 / 92 / 88 / 85 / 82 / 78) ou min(90, 50 + n*15)   // :915-933
adjustedScore   = baseScore + completenessBonus(0..10) + evidenceQualityBonus(3×n) - 2×gaps // :959
minScore        = detectedInconsistencies.length > 0 ? 30 : 15                             // :962
overallSuccessRate = Math.min(99, Math.max(minScore, adjustedScore))                        // :963
```

Não há modelo estatístico, base histórica, intervalo de confiança ou taxa de base de conversão. É um **score heurístico** apresentado com o rótulo **"Probabilidade de Êxito"**, em verde esmeralda, com contador animado de 0 → N em 1,2 s (linhas 172-196). A animação comunica "medição".

Consequências visíveis:
- **Saturação:** `98 + 10 + 9 = 117` → clamp em **99**. No topo da faixa o número é 99 independente da evidência.
- **Piso que se lê errado:** caso sem inconsistência → piso **15** → a tela mostra "15% Probabilidade de Êxito" e o estado vazio (linhas 425-430) diz "Nenhum vício formal ou tese de anulação foi identificado". O número significa "não encontramos nada", o texto significa "não há tese", e o usuário entende "você tem 15% de chance".
- **O número muda debaixo do usuário:** a tela renderiza primeiro com a análise do cliente (`AnalysisProcessingStep.tsx:49` → `ExpertRuleEngine.evaluate`) e depois `OnboardingWizard.handleAnalysisCompleted` substitui por `data.analysis` do servidor (`OnboardingWizard.tsx:449-451`). O contador re-anima para outro valor, sem nenhuma explicação. O backend usa `RagPipeline.analyzeInfraction` (`rag-pipeline.ts:174-208`), que é o mesmo motor + filtro de evidência — mas o payload persistido pode diferir do renderizado.
- O próprio tipo admite o problema: `types/index.ts:182` — `overallSuccessRate: number; // Probabilidade técnica estimada (0-100%)`. A tela escalate "técnica estimada" para "Probabilidade de Êxito" sem qualifier.

**Observação adicional (`rag-pipeline.ts:101-120`):** `retrieveContext().potentialNullities` traz `probabilidadeExito: 94` e `91` hardcoded (linhas 109 e 118). Esse caminho **não** é usado por `analyzeInfraction` (que delega a `ExpertRuleEngine.evaluate`, `rag-pipeline.ts:175`), mas é mais um número de "probabilidade" fabricado no codebase — e entra em `routes/ai.ts:23` (`retrieveContext`). Deve ser removido ou rotulado.

---

## 6. Findings — ALTO

### A1 — Cobertura de conteúdo: 4 de 52 teses mapeadas; as mais fortes são as piores

**Arquivos:** `FreeAnalysisResultStep.tsx:28-100` (mapa) vs `:102-108` (fallback) vs `rule-engine.ts:816-829, 852-864`

Lista exata do mapa `govBrExplanations`: **ARG-001** (linha 35), **ARG-051** (linha 52), **ARG-002** (linha 68), **ARG-005** (linha 80). Quatro.

- Contra o catálogo (`arguments-catalog.ts`, 52 teses, ARG-001..ARG-052): **48/52 = 92,3% caem no fallback.**
- Contra o conjunto **realmente alcançável** (IDs emitidos pelas regras do motor — ARG-001, 002, 005, 010, 015, 019, 020, 024, 025, 027, 048, 049, 051 = 13): **9/13 = 69,2% caem no fallback.**

O fallback (linhas 102-108) devolve:

```ts
title: arg.title,
lawExplanation: `${arg.legalBase} ${arg.contraranResolution ? `(c/c ${arg.contraranResolution})` : ''}`,
evidenceCheck: () => 'Verificação específica não configurada para este argumento',
userImpact: arg.summary,          // = catalog.description
confidenceBase: 'Base jurídica padrão'
```

`arg.summary` vem de `matchedArg.description` (`rule-engine.ts:825`), que é o texto de catálogo — denso e sem verbo para o usuário. Exemplos reais que o usuário leria em "O que isso significa para você":

- **ARG-048** (`arguments-catalog.ts:1190`): *"Extinção definitiva da pretensão punitiva da Administração Pública emvirtude da expedição ou postagem da Notificação da Autuação (NA) após o prazo decadencial de 30 dias da infração."*
- **ARG-049** (`arguments-catalog.ts:1223`): *"Nulidade insanável de processo de trânsito em que o órgão autuador aplicou penalidade sem a comprovação de envio da Notificação de Autuação prévia."*
- **ARG-001** (`arguments-catalog.ts:18`): *"Nulidade absoluta da autuação por excesso de velocidade quando o equipamento medidor de velocidade não foi submetido à verificação metrológica anual obrigatória (validade máxima de 12 meses) pelo INMETRO ou IPEM delegado."*

**Isto é literalmente a reclamação do ODONO.** E é pior por causa do corte:

`defensePoints` é ordenado por `confidenceLevel` (linhas 206-214) e corta em 3 (linha 215). **Todas** as teses do fallback recebem `"Baixo"` (a `evidenceCheck` do fallback — `"Verificação específica não configurada para este argumento"` — não casa com nenhuma das 6 strings testadas nas linhas 120-130). Logo, as 9 teses de fallback **empatram em 'Baixo' e são as primeiras a serem cortadas**.

Resultado: a tela prioriza exatamente as teses cujo texto ela sabe escrever, e descarta as teses que o motor considera mais fortes — incluindo **ARG-048 (decadência 30 dias, `baseScore = 98`, o maior peso do motor)** e **ARG-049 (Súmula 312 STJ)**. O usuário vê, como "principais pontos", as 3 teses com copy pronta, e nunca vê a decadência.

**Achado raiz (arquitetural):** a view reimplementa a semântica jurídica em vez de consumir a camada de domínio. O motor já escreve descrições prontas para o usuário (`rule-engine.ts:64, 101, 274-276`), e a tela as ignora.

### A2 — "O que verificamos" repete o título do card

**Arquivo:** `FreeAnalysisResultStep.tsx:349` e `:364`

```tsx
349  <h4 ...>{point.title}</h4>
364  <p ...>{point.title}</p>     {/* "O que verificamos" */}
```

Mesma string, dois blocos. No caso do fallback, `point.title` é `arg.title` — um título de catálogo com citação legal entre parênteses, ex.: *"Aferição Metrológica do Radar Vencida ou Ausente (Res. CONTRAN 798/2020)"*. O rótulo promete uma verificação realizada; o conteúdo entrega o próprio cabeçalho. No caso do ARG-002, o texto lido é *"Sinalização de velocidade adequada no local"* sob o rótulo "O que verificamos" — que não verifica nada.

### A3 — Confiança por substring em português

**Arquivo:** `FreeAnalysisResultStep.tsx:120-136`

A confiança é derivada de `explanation.confidenceBase.includes('Lei')` / `includes('Res.')` combinado com `evidenceResult.includes('constatada' | 'fora da validade' | 'dentro da validade' | 'Não há registro' | 'Não há comprovação' | 'ausência de')`.

Problemas:
- **Case-sensitive.** `'ausência de'` nunca casa com `"Ausência de..."` (C2). `'Não há registro'` e `'Não há comprovação'` casam por acaso de maiúscula.
- **Arbitrário.** "Muito Alto" só é alcançável por uma única frase literal: `"constatada"` — presente apenas na `evidenceCheck` do ARG-051 (linha 63). Qualquer reescrita de copy derruba o nível.
- **Não usa a confiança do domínio.** `ARGUMENTS_CATALOG` já traz `confidenceScore` 0–100 por tese (`arguments-catalog.ts:21, 68, 114, 145, 168, ...`) e `LegalArgumentDomain` o transporta (`types/index.ts:126`). A view o ignora e inventa um ordinal.
- **Não usa `detectedFlaws[].severity`** (`'alta' | 'media' | 'baixa'`), que é o sinal de severidade já calculado (`rule-engine.ts:794`).
- **Ignora o impacto.** `detectedInconsistencies[].impact` diz o que a tese faz ("cancelamento da autuação", "100% de isenção do pagamento financeiro (R$ 130,16) e 0 pontos na CNH" — `rule-engine.ts:152`) e nunca aparece na tela.

### A4 — Instância de procedimento hardcoded, ignorando o motor

**Arquivos:** `FreeAnalysisResultStep.tsx:150, 161, 313` vs `rule-engine.ts:902-911` e `OnboardingWizard.tsx:703`

`serviceType` é declarado na interface (linha 150), destruturado (linha 161) e **nunca usado**. A tela escreve sempre `"Instância: Defesa Administrativa"` (linha 313).

O motor deriva procedimento por família e por achado: `conversao_advertencia` quando ARG-051 (linhas 907-908), `suspensao_cnh` quando ARG-025 (909-910), senão o rito canônico da família (906). O wizard já calcula `mappedProcedure` e o passa como `serviceType` (OnboardingWizard.tsx:703). A tela mostra "Defesa Administrativa" mesmo quando o caso é conversão em advertência ou suspensão de CNH.

### A5 — Prazo de defesa nunca exibido

**Arquivos:** `FreeAnalysisResultStep.tsx` (ausente) vs `types/index.ts:192`, `rule-engine.ts:1005`

`analysis.procedureDeadline` existe (`types/index.ts:192`, preenchido em `rule-engine.ts:1005`) e vem de `infraction.defenseDeadline` — o prazo que o próprio condutor informou. **Não aparece em nenhum lugar da tela.**

Para um produto de defesa de multa, o prazo é o dado operacional mais importante depois do valor. A tela omite e ainda promete "+N outros pontos disponíveis na visualização completa" (linha 330).

### A6 — Promessa de tela inexistente

**Arquivo:** `FreeAnalysisResultStep.tsx:328-332`

`(+N outros pontos disponíveis na visualização completa)` — o string existe em **um único lugar** em todo `src/` (grep). Não há "visualização completa" no fluxo gratuito. A única tela de caso (`src/components/cases/CaseDetailView.tsx`) renderiza `recommendedArguments.map(a => a.id)` (linhas 114 e 130) — apenas IDs, sem texto. A copy aponta para um destino que não existe.

### A7 — Conformidade GOV.BR: escopo não se aplica, mas a autoconformidade falha

**Escopo.** `docs/padrao_GOV.BR.md` é um manual de engenharia reversa do padrão do **Governo Federal** (APF): Decreto 9.756/2019, Portaria SGD/ME nº 15.065/2021 (linhas 5-6), com REQs que citam `sso.acesso.gov.br`, header institucional federal e footer com marca do Governo Federal (REQ-04, REQ-05, REQ-08, doc:296-312). A DefesAi é uma plataforma privada que vende defesa de multa paraPreparación. **Juridicamente, o documento não se aplica** — REQ-01, REQ-02, REQ-04, REQ-05, REQ-08, REQ-09 e REQ-12 não são vinculantes aqui.

**Autoconformidade.** O próprio arquivo se declara GOV.BR: comentário da linha 25 *"FUNÇÃO AUXILIAR: Formata explicações jurídicas no estilo GOV.BR"* e da linha 354 *"Explicação no estilo GOV.BR"*. Julgado pelas partes do padrão que o arquivo invoca (Linguagem Simples, microcopy, WCAG AA, REQ-06, REQ-11, REQ-14), o resultado é:

| Requisito | Doc | Evidência na tela | Status |
|---|---|---|---|
| Linguagem Simples — eliminar jargão (doc:216) | obrigatório | `lawExplanation` = `legalBase` cru + `(c/c …)` (linha 104); `userImpact` = `arg.summary` = `description` do catálogo (linha 106) | **FAIL** |
| Linguagem Simples — ≤20 palavras/frase (doc:215) | obrigatório | ARG-001: *"Nulidade absoluta da autuação por excesso de velocidade quando o equipamento medidor de velocidade não foi submetido à verificação metrológica anual obrigatória (validade máxima de 12 meses) pelo INMETRO ou IPEM delegado."* — 32 palavras, 1 frase | **FAIL** |
| Linguagem Simples — significado expandido na 1ª ocorrência (doc:216) | obrigatório | "fé pública", "pretensão punitiva", "Súmula 312 STJ" usados sem glossário | **FAIL** |
| REQ-06 / WCAG 1.4.3 — contraste 4.5:1 (doc:303) | Crítica | `text-slate-400` (#94a3b8) sobre branco = **2,57:1** — linhas 306, 311, 316 (`text-base font-bold` = 16px, não é "texto grande") | **FAIL** |
| REQ-11 — hierarquia sem salto (doc:308, 187) | Média | `h1` (225) → `h3` (326) → `h4` (349). Falta `h2`. | **FAIL** |
| REQ-14 / doc:165 — `aria-hidden` em ícones decorativos | Alta | 14 ícones lucide renderizados sem `aria-hidden="true"` | **FAIL** |
| Feedback/Alert — `role="alert"` + `aria-live` (doc:104) | — | Bloco amber de "Probabilidade pode melhorar" (266-288) sem `role` nem `aria-live`; contador de % sem `aria-live` → leitor de tela nunca anuncia o resultado | **FAIL** |
| Microcopy — rótulo de ação no infinitivo (doc:223) | — | "Gerar Minha Defesa" (449), "Salvar e Ver no Painel" (441) | **FAIL** |
| REQ-10 — foco visível no indicador oficial (doc:307) | Crítica | Botões (437-451) só definem `hover:`; sem `focus-visible:` no azul oficial. O outline do UA do Tailwind não foi removido, então não é violação WCAG, mas não é o indicador especificado | **PARCIAL** |
| REQ-15 — reflow sem rolagem horizontal (doc:312) | Alta | `grid-cols-1 md:grid-cols-3` (304) colapsa corretamente | **PASS** |

Nota: `text-slate-500` (#64748b) sobre branco = 4,77:1 — passa por pouco. O problema é o `slate-400`.

---

## 7. Findings — MÉDIO

| ID | Arquivo:linha | Achado |
|---|---|---|
| M1 | `:172-196` | Contador anima de **0** até o valor. A tela mostra "0% Probabilidade de Êxito" por até 1,2 s dentro de um card verde de sucesso. Flash de zero em tela de conversão. |
| M2 | `:199` | `showImprovementMessage = !animationComplete || (...)`. O primeiro disjunct é **dead code**: a renderização em `:265` exige também `isLowProbability`, que não depende da animação. |
| M3 | `:266` | `animate-pulse` perpétuo no bloco amber. O doc prioriza "eficiência funcional sobre estética decorativa" (doc:56). |
| M4 | `:307, 312` | `truncate` em `ctbArticle` e `autuadorBody`. "Art. 2…" sem tooltip é inútil no mobile, e `truncate` em grid de 1 coluna esconde informação sem alternativa. |
| M5 | `:340` | `key={point.title \|\| idx}` — chave por título. Funciona hoje só porque os títulos do fallback são únicos por ARG; qualquer futura lista com título repetido colide. |
| M6 | `:2-22` | **9 imports lucide mortos**: `CheckCircle2`, `ChevronRight`, `Calendar`, `Scale`, `Download`, `Database`, `RefreshCw`, `Phone`, `User`. Resíduo de shell GOV.BR copiado — evidência de origem genérica. |
| M7 | `:425-430` | Estado vazio diz "Nenhum vício formal ou tese de anulação foi identificado" enquanto o número acima pode ser 15%/30%. E recomenda "consultar um advogado" — beco sem saída num funil pago. |
| M8 | — | **Zero cobertura de teste.** Não existe spec unitário do componente; `tests/e2e-reconstruction/*.spec.ts` só verificam navegação e `analysis.recommendedProcedure`. Nenhum assert sobre o texto, os números ou o fallback. Todos os defeitos acima passam batidos. |

---

## 8. O que já está certo — **manter**

1. **Estrutura de 4 blocos por tese** (`:356-419`) — "O que verificamos / O que a lei diz / O que encontramos nos seus dados / O que isso significa para você" é o esqueleto correto para um leigo. O problema é o conteúdo, não a forma.
2. **Rótulos de `missingCriticalFields`** (`rule-engine.ts:1131-1155`) — "Data de aferição do INMETRO", "Comprovação de sinalização R-19", "Data de entrega da notificação". Copy de produto real, com rótulo e não nome de campo. **Copiar esse padrão para o resto.**
3. **Fallbacks honestos já presentes** — `autuadorBody \|\| '— não informado —'` (`:312`), `aitNumber \|\| 'N/A'` (`:229`), `plate \|\| 'N/A'` (`:230`). O padrão certo já existe no arquivo.
4. **Filtro `dataCompleteness.missingCriticalFields`** com barra de progresso (`:249-262`) — é a parte que responde "o que falta eu preencher", que é a pergunta certa.
5. **Responsivo do grid de 3 colunas** (`:304`) e dos botões (`:436`) — sem rolagem horizontal.
6. **Estado vazio existe** (`:425-431`) — precisa de copy coerente com o número, não ser removido.
7. **`id="btn-proceed-to-document-generation"`** (`:445`) — âncora estável para E2E.

---

## 9. O que é preciso para PASS

### Obrigatório (bloqueia ship)

1. **Parar de mentir sobre o dado ausente.** Remover os fallbacks `'Art. 218 do CTB'`, `'745-50'`, `'130,16'`, `|| 4`. Substituir por `'— não informado —'` + ação para preencher. Verificar: `points = 0` deve renderizar "0 Pontos", nunca "4 Pontos". Formatar moeda com `toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })`.
2. **Corrigir `radarCalibrationDate` → `inmetroAferitionDate`** (`:39-40`) e tipar o mapa (`arg: LegalArgumentDomain`, `data: { infraction: InfractionData; vehicle: VehicleData }`) para o typecheck pegar a regressão. Verificar: caso com aferição vencida mostra a data em meses, e "confiança" coerente.
3. **Eliminar a contraditória do ARG-002**: ou usar `evidenceResult.toLowerCase()`, ou — melhor — trocar a lógica de confiança por severidade/confiança do domínio (`detectedFlaws[].severity` + `arg.confidenceScore`), sem substring.
4. **Corrigir ARG-051**: remover a lista hardcoded de códigos e usar `infractionData.severity` (que o `InfractionData` já tem, `types/index.ts:59`) ou o catálogo. Verificar: `685-80` (media) mostra a conversão aplicável, e nunca "grave/gravíssima" junto de "Você tem DIREITO SUBJETIVO".
5. **Parar de duplicar o título.** "O que verificamos" deve renderizar a *evidência concreta* verificada (data, número, velocidade), não `point.title`. Se não houver evidência, o bloco não deve existir.
6. **Remover o rótulo "Probabilidade de Êxito"** ou substituí-lo por uma métrica honesta. Mínimo: "Força da tese principal" + rótulo explicativo ("escore heurístico do motor, não é probabilidade estatística") e a fonte (`engineVersion`, `analysis.summaryReasoning`). Alternativa mais simples: mostrar **quantas teses foram confirmadas** e **o que cada uma faz por você** ("anula a multa", "converte em advertência", "retira 4 pontos").
7. **Consumir a saída do domínio.** Renderizar `detectedInconsistencies[].description` (já em português claro), `detectedInconsistencies[].impact`, `procedureDeadline`, `recommendedProcedure` e `dataGaps`. Remover `formatLegalPointGovBr` da camada de view: mover para `src/core/` como um **apresentador de tese** com fonte única, ao lado do motor, e consumindo `LegalArgumentDomain` + `DetectedFlaw`.
8. **Escrever a copy das 9 teses alcançáveis sem mapa** (ARG-010, 015, 019, 020, 024, 025, 027, 048, 049) em Linguagem Simples, ou — se o tempo não permitir — **parar de mostrar as 3 teses com fallback** e mostrar apenas as que têm texto próprio, com um texto honesto para o resto ("2 teses adicionais Requires de documentos que você ainda não enviou"). Mostrar jargão para teses fortes é pior que não mostrá-las.
9. **Mostrar o prazo** (`analysis.procedureDeadline`) com rótulo explícito ("Prazo para protocolo: DD/MM/AAAA") e o órgão (`analysis.competentBody`).
10. **Parar de prometer tela inexistente** — remover "(+N outros pontos disponíveis na visualização completa)" ou apontar para uma rota real.
11. **Usar `serviceType`/`recommendedProcedure`** no lugar do "Instância: Defesa Administrativa" fixo.

### Acessibilidade e conteúdo (bloqueia ship)

12. `aria-live="polite"` no contador de % e `role="status"`; `role="alert"` no bloco amber. `aria-hidden="true"` nos 14 ícones decorativos. Corrigir `text-slate-400` → `text-slate-500` (linhas 306, 311, 316) ou outro com ≥4,5:1. Inserir `h2` entre `h1` (225) e `h3` (326). Remover `truncate` ou fornecer alternativa acessível. Remover os 9 imports mortos. Rótulos de botão no infinitivo.

### Testes (bloqueia ship)

13. **Um teste de conteúdo** (o mínimo, sem framework novo) que falhe se a tela contradisser o motor: para um caso sintético com `inmetroAferitionDate` vencida + `hasR19SignageProof === false` + `infractionCode === '685-80'`, as asserções devem exigir (a) a data de aferição aparecendo em meses, (b) confiança ≠ "Baixo" para ARG-002, (c) ARG-051 sem "não se aplica" para `685-80`, (d) nenhum fallback `'Art. 218 do CTB'`/`'745-50'`/`'130,16'`/`4 Pontos` presente no HTML, (e) `procedureDeadline` presente.

---

## 10. Critérios de PASS

- [ ] A tela exibe **apenas** dados presentes em `infractionData`; campo ausente = "— não informado —" + ação.
- [ ] Nenhum texto da tela contradiz `ExpertRuleEngine` (data de aferição, gravidade, procedimento, prazo).
- [ ] "O que verificamos" mostra evidência concreta; se não há evidência, o bloco some.
- [ ] Nenhuma card de tese exibe "Verificação específica não configurada" nem jargão de catálogo.
- [ ] O número exibido é rotulado de forma que o usuário entenda que **não** é probabilidade estatística; ou deixou de ser um número.
- [ ] Prazo, valor, pontos e órgão — todos presentes, todos reais.
- [ ] Contraste ≥ 4,5:1 em todo texto; hierarquia `h1→h2→h3→h4` sem salto; `aria-live`/`role` nos estados dinâmicos; ícones decorativos com `aria-hidden`.
- [ ] Verificado em 1440px e 390px; sem truncamento silencioso.
- [ ] Teste de conteúdo impedindo regressão de (a)–(e).

---

## 11. Apêndice — inventário de "mentiras" (fallbacks) na tela

| Linha | Campo | Fallback | Gravidade |
|---|---|---|---|
| 307 | `ctbArticle` | `'Art. 218 do CTB'` | **Manda o usuário para um enquadramento de radar que pode não ser o dele** |
| 308 | `infractionCode` | `'745-50'` | Idem |
| 317 | `fineAmount` | `'130,16'` | Multa inventada + formato divergente do valor real (`toFixed(2)` → `"130.16"`) |
| 318 | `points` | `4` | **Inverte 0 pontos em 4 pontos** |
| 229 | `aitNumber` | `'N/A'` | Correto — manter |
| 230 | `plate` | `'N/A'` | Correto — manter |
| 312 | `autuadorBody` | `'— não informado —'` | Correto — manter |
| 105 | `evidenceCheck` (fallback) | `'Verificação específica não configurada para este argumento'` | Texto de debugger exposto ao usuário |
| 107 | `confidenceBase` (fallback) | `'Base jurídica padrão'` | Texto de debugger exposto ao usuário |

---

## 12. Nota sobre escopo desta revisão

- Nenhum arquivo do repositório foi modificado. Nenhuma branch, commit ou PR foi criado (branch canônica `main` preservada, `git status` limpo exceto `tests/e2e-reconstruction/admin-pricing-edit.spec.ts` não rastreado, pré-existente).
- Não houve verificação em browser nesta revisão: as evidências são de código (grep + leitura dos arquivos citados). A confirmação visual de contraste, reflow e do flash de "0%" requer execução da tela — está listada nos critérios de PASS.
- `docs/padrao_GOV.BR.md` **não é vinculante** para este produto (plataforma privada, não é serviço público federal). O critério 6 foi julgado como "autoconformidade": o arquivo se autodeclara GOV.BR e falha justamente nas partes que invoca — Linguagem Simples e acessibilidade — que são as duas coisas que o ODONO reclamou.
