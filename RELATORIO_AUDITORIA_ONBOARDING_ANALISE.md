# RELATÓRIO DE AUDITORIA — Onboarding (Fase de Análise) · UX, Copy e Consistência de Dados

**Projeto:** DefesAi — `AdeusMultas-Defesa-`
**Branch:** `main` — **SHA base:** `53fac09` ("docs: adiciona checkpoint de certificação E2E (70 cenários)")
**Data:** 2026-10-22
**Escopo:** SOMENTE LEITURA. Nenhuma alteração de código de produção foi feita nesta auditoria.
**Motivo do pedido:** "os textos exibidos ao usuário são complexos e sem sentido" na fase de análise.

---

## 0. Veredito executivo

O texto do usuário está certo, mas a causa não é (só) a redação. O problema real é de **camada de dados**:

1. **A análise que o usuário vê não é a análise dos dados que ele preencheu.** O backend reconstrói a infração por uma whitelist que descarta datas de notificação, prazos, flags de evidência e histórico de infrações; o motor roda sobre essa versão mutilada e a tela substitui o resultado do cliente pelo do servidor (`cloudflare/routes/cases.ts:71-100,137` + `src/components/onboarding/OnboardingWizard.tsx:449-451`). Divergência medida: **cliente 99% / 4 teses — servidor 88% / 1 tese**, com 4 `dataGaps` no servidor.
2. **O motor produz um vício falso em quase todo caso** que tem data de expedição de notificação (ARG-049 "Súmula 312"), porque `notificationDeliveryDate` **nunca é coletado** pelo wizard (`src/core/rules/rule-engine.ts:847-849`).
3. **A "Probabilidade de Êxito" não é probabilidade.** É uma heurística de inteiros (base 35 + bônus − penalidade), com piso 15/30 e teto 99, sem qualquer base histórica ou calibração (`src/core/rules/rule-engine.ts:913-963`).
4. **A tela fabrica dados quando o formulário está vazio**: artigo, código, multa e pontos têm fallback literal (`FreeAnalysisResultStep.tsx:307-318`).
5. **A copy é complexa porque reflete o jargão interno do motor** (`description` do catálogo de teses vaza direto para "O que isso significa para você"), e 48 das 52 teses caem num fallback vazio: *"Verificação específica não configurada para este argumento"*.

**Recomendação:** não começar por reescrever texto. A ordem correta é (1) consertar a perda de dados na ida ao servidor, (2) eliminar o vício falso e os fallbacks que fabricam valores, (3) só então reescrever a copy com o vocabulário real em mãos. Reescrever antes disso produz texto bonito sobre números errados.

---

## 1. Método e limitações

- Auditoria feita por 5 frentes paralelas (UX/fluxo, finish gate de UI, copy, consistência de dados entre camadas, claims sem lastro) + verificação independente por linha de código.
- Cada achado abaixo foi reconfirmado diretamente no código antes de entrar neste relatório. Achados que não se sustentaram foram **removidos ou reclassificados** — ver §7 (correções em relação aos relatórios dos anexos).
- **Não verificado** (não afirmar): execução real dos 70 cenários E2E (`docs/checkpoint-certificacao-e2e.md` diz "Mapeado, não executado"), persistência real no Supabase, vetores RAG ingeridos na KB, credenciais de enriquecimento com LLM, comportamento em produção dos dois backends.
- Anexos com os relatórios brutos: `docs/auditorias/2026-10-22-onboarding/`.

| Anexo | Frente |
|---|---|
| `02-consistencia-dados.md` | Onboarding → motor → RAG → persistência → tela (30 achados D-01..D-30) |
| `03-ux.md` | Fluxo, estados vazios, acessibilidade, coerência formulário→motor→tela |
| `04-ui-finish-gate.md` | Finish gate da tela de resultado, inventário de "mentiras" (fallbacks) |
| `05-copy.md` | Inventário de strings + **reescritas prontas para colar** |
| `06-claims.md` | Claims de marketing × lastro real (13 claims com veredito) |

---

## 2. Quadro de severidade

| Sev | Qtd | IDs |
|---|---|---|
| CRÍTICO | 7 | C-01 … C-07 |
| ALTO | 12 | A-01 … A-12 |
| MÉDIO | 9 | M-01 … M-09 |
| BAIXO | 5 | B-01 … B-05 |

---

## 3. Achados CRÍTICOS

### C-01 — A análise exibida é calculada sobre uma infração mutilada

**Onde:** `cloudflare/routes/cases.ts:71-100` (whitelist de reconstrução) → `cloudflare/routes/cases.ts:137` (`analyzeInfractionCompat`) → `src/components/onboarding/OnboardingWizard.tsx:449-451` (troca a análise do cliente pela do servidor).

**Fato.** A rota anônima do Worker reconstrói o objeto `infraction` campo a campo. Mantém: `aitNumber`, `infractionCode`, `description`, `ctbArticle`, `severity`, `points`, `fineAmount`, `autuadorBody`, `dateTime`, `location`, `speedLimit`, `measuredSpeed`, `consideredSpeed`, `radarEquipmentId`, `inmetroAferitionDate`. **Descarta silenciosamente**: `notificationExpeditionDate`, `notificationDeliveryDate`, `defenseDeadline`, `hasR19SignageProof`, `hasPreviousInfractionsLast12Months`, `hasPhotoProof`, `hasPsychomotorTerm`, `hasAgentDetailedObservations`, `hasRegulatorySign`, `refusedTest`, `offeredRetest`, `yellowPhaseCrossing`, `cellphoneCircumstance`, `emergencyPassage`, `evidenceFlags`.

O motor do Worker é o **mesmo** `ExpertRuleEngine` do cliente (`cloudflare/rag-adapter.ts`, `applyDeterministicAnalysis`), logo a divergência **não vem do motor**: vem dos dados que chegam ao motor.

**Medição (mesmo caso, mesmos fatos).**

| Camada | Score | Teses | dataGaps |
|---|---|---|---|
| Cliente (`ExpertRuleEngine.evaluate` com o form inteiro) | 99% | ARG-001, ARG-051, ARG-002, ARG-049 | — |
| Servidor (rota anônima do Worker) | 88% | ARG-001 | `RULE_DECADENCIA_30_DIAS`, `RULE_CONVERSAO_ADVERTENCIA_267`, `RULE_SINALIZACAO_INSUFICIENTE_90`, `RULE_PHOTO_PROOF_REQUIRED` |

**Impacto.** O usuário preencheu a data de expedição, o histórico de infrações e as fotos; o sistema diz que "não há dados suficientes para avaliar". A tela mostra um número que não corresponde ao formulário. É a origem mecânica de "textos complexos e sem sentido": cards que descrevem ausências que o próprio usuário preencheu.

**Correção.** Persistir o `infraction` completo (ou, no mínimo, a lista de campos que as regras exigem) na rota anônima; nunca reavaliar sobre um objeto reconstruído por whitelist. Alternativa: avaliar no servidor com o `analysis` já calculado no cliente **se** a peça for reaproveitada — mas isso abre brecha de confiança no cliente. Correto: transporte fiel.

---

### C-02 — ARG-049 ("Súmula 312") dispara por construção

**Onde:** `src/core/rules/rule-engine.ts:842-900` (condição em `:847-849`).

```ts
const hasDualNotificationViolation =
  context.notificationExpeditionDate &&
  !context.notificationDeliveryDate;
```

**Fato.** A condição afirma "notificação expedida e não entregue". Mas `notificationDeliveryDate` **não existe em nenhuma tela do wizard** — é lido pelo motor (`rule-engine.ts:705`) e nunca preenchido. `InfractionIdentificationStep.tsx` coleta apenas `notificationExpeditionDate` e `defenseDeadline`. Logo, **todo caso com data de expedição** recebe ARG-049, vício de severidade "alta",thesis injetada à força (`rule-engine.ts:852-898`), e `baseScore` de 35 vira 90 (`rule-engine.ts:931-933`).

**Impacto.** O produto afirma ao usuário, com base legal (`Art. 5º, LIV e LV da CF/88 c/c Súmula 312 do STJ`), uma nulidade que é **artefato de formulário**, não de processo. Risco alto de publicidade enganosa e de peça_recusada pelo órgão.

**Correção.** Ou o wizard coleta a data de entrega da notificação (o dado existe no papel e no OCR), ou a regra sai de `FAIL` e passa a `DATA_GAP` explícito — nunca "inconsistência".

---

### C-03 — Card ARG-001 lê um campo que o formulário não produz

**Onde:** `src/components/onboarding/steps/FreeAnalysisResultStep.tsx:38-48`.

```ts
if (data.infraction.radarCalibrationDate) { ... }
return 'Não há registro de data de averição disponível para validação';
```

**Fato.** `radarCalibrationDate` **não existe** em `InfractionData` (`src/types/index.ts:52-115` — o campo real é `inmetroAferitionDate`). O nome `radarCalibrationDate` é um alias interno do motor (`rule-engine.ts:713`: `radarCalibrationDate: infraction.inmetroAferitionDate`). O wizard **coleta** `inmetroAferitionDate` (`SpecificInfractionDataStep.tsx:196-201`).

**Impacto.** O card ARG-001 — a tese mais forte do produto — sempre responde "Não há registro de data de averição disponível para validação" e, pela lógica de confiança (`FreeAnalysisResultStep.tsx:128-132`), cai para **"Médio"**. O usuário pagou um formulário e o produto afirma que não tem o dado que ele acabou de digitar.

**Correção.** Ler `data.infraction.inmetroAferitionDate` (ou usar o mesmo alias do motor). 1 linha.

---

### C-04 — "Probabilidade de Êxito" não é probabilidade

**Onde:** `src/core/rules/rule-engine.ts:913-963` (cálculo) + `src/components/onboarding/steps/FreeAnalysisResultStep.tsx:167-196,236-243` (apresentação).

**Fato.** A fórmula é uma tabela de inteiros:

```
baseScore = 35                                     // sem nenhuma nulidade
  98 ARG-048 | 94 ARG-051 | 92 ARG-001 | 88 ARG-025 | 85 ARG-005 | 82 ARG-015 | 78 ARG-002
  senão min(90, 50 + nº_inconsistências * 15)
adjusted = base + bônus_completude(0..10) + bônus_evidência(+3/tese) − penalidade_lacunas(2/lacuna)
overallSuccessRate = min(99, max(15|30, adjusted))
```

Não há base histórica, calibração por órgão, taxa de deferimento nem conjunto de treino em lugar nenhum (`grep` de `calibrat|deferimento|winRate|historico` em `src/core/` só acha comentários). O número **nunca é 0** (piso 15/30) e **nunca é 100** (teto 99). A animação de 1200 ms anima de 0 até a constante, criando a sensação de medição ao vivo.

**Impacto.** É a maior afirmação quantitativa da tela e a que menos lastro tem. Usuário que preencheu tudo recebe +10 de bônus — ou seja, **o número premia o preenchimento do formulário**, não a qualidade da defesa.

**Correção.** Trocar o rótulo por "Força da análise" / "Indicador de completude do diagnóstico" e exibir os componentes (tese + completeness + lacunas), ou remover o número. Se o número for mantido, ele precisa de definição escrita na tela e de piso 0 real.

---

### C-05 — A completude é medida contra campos que não existem no contexto

**Onde:** `src/core/rules/rule-engine.ts:1026-1103` (maps de campos) contra `src/core/rules/rule-engine.ts:696-728` (contexto real).

**Fato.** O `context` do motor **não contém** `plate`, `location`, `dateTime` (o motor usa `infractionDate`), `inmetroAferitionDate` (usa `radarCalibrationDate`), `hasVideoProof`, `bafometerResult`. As listas de completude usam exatamente esses nomes. Resultado: campos **sempre** contados como não preenchidos.

| Família | Campos no mapa | Sempre vazios por nome errado | Completude máxima real |
|---|---|---|---|
| `velocidade` | 14 | `plate`, `dateTime`, `location`, `inmetroAferitionDate` | 10/14 = **71%** |
| `alcoolemia` | 15 | `plate`, `dateTime`, `location`, `hasVideoProof`, `bafometerResult` | 10/15 = **67%** |

O mesmo defeito em `getMissingCriticalFields` (`:1128-1166`): o bloco "Probabilidade pode melhorar com mais dados" pede "Data de aferição do INMETRO" (preenchida!), "Comprovação de sinalização R-19" e "Data de entrega da notificação" — **dois campos que o formulário não coleta** e um que o usuário já preencheu.

**Correção.** Derivar as listas do próprio `context` (ou normalizar aliases num único dicionário, como já existe em `src/core/validation/data-lineage.ts:285-323` e `final-quality-gate.ts:541-554`) e alinhar o que o wizard coleta com o que o motor exige.

---

### C-06 — A tela fabrica artigo, código, multa e pontos

**Onde:** `src/components/onboarding/steps/FreeAnalysisResultStep.tsx:307-318`.

```ts
{infractionData.ctbArticle   || 'Art. 218 do CTB'}
{Cód. {infractionData.infractionCode || '745-50'}}
R$ {infractionData.fineAmount?.toFixed(2) || '130,16'}
{infractionData.points || 4} Pontos na CNH
```

**Fato.** Três problemas num bloco só:

1. `points || 4` — **0 pontos viram "4 Pontos na CNH"**. O wizard seta `points: 0` para a categoria Lei Seca (`OnboardingWizard.tsx:357`). O usuário lê "4 Pontos" numa infração gravíssima.
2. `fineAmount` sempre vem preenchido pelo wizard (`OnboardingWizard.tsx:346,356,366,377,387`) com valor **fixo por categoria** — e.g. velocidade sempre R$ 130,16, mesmo acima de 20% (que é R$ 293,47). O "Impacto Estimado" é um default de formulário, não um dado do usuário.
3. `toFixed(2)` devolve "130.16" (ponto) e o fallback devolve "130,16" (vírgula) — mesma tela, dois formatos.

**Correção.** `points ?? '—'`, `fineAmount != null ? ... : 'não informado'`, sem valores literais de artigo/código; e o valor da multa deve ser Derived da faixa da velocidade ou declarado pelo usuário.

---

### C-07 — Recarregar a página apaga os dados e o modal jura o contrário

**Onde:** `src/components/onboarding/OnboardingWizard.tsx:34-81,225-231` (persistência) + `src/components/onboarding/AccountVerificationGate.tsx:119-142` (modal).

**Fato.** `sessionStorage` guarda **somente** `step`, `savedCaseId`, `savedClaimToken` (`OnboardingWizard.tsx:70-77`). A infração, o veículo, as velocidades, as flags e o lead vivem só em estado React. Um reload na etapa 5+ restaura a etapa e zera o formulário. O modal de verificação afirma "Seus dados foram salvos com segurança", "100% dos Dados Coletados Preservados" e "Você não precisará preencher os dados do veículo e da autuação novamente".

**Correção.** Persistir o payload do formulário no `sessionStorage` (é dado não sensível do próprio usuário, com expiração) ou, no mínimo, parar de prometer o que não é garantido.

---

## 4. Achados ALTOS

| ID | Onde | Fato | Correção |
|---|---|---|---|
| A-01 | `AnalysisProcessingStep.tsx:56-63,99` | Progresso **fake** de 4,2 s (700+800+800+700+700+500 ms) sobre um `ExpertRuleEngine.evaluate` **síncrono** já executado no `useEffect` de mount (`:49`); texto "Diagnóstico jurídico 100% gratuito **concluído com sucesso**" é exibido antes do resultado; "390 dispositivos do CTB", "7 peças-modelo validadas" e "precedentes do STJ em tempo real" | Ver §5 (claims). Se o progresso for mantido, que seja o progresso real (etapas do motor) e sem "sucesso" antecipado |
| A-02 | `FreeAnalysisResultStep.tsx:349` e `:364` | O bloco "O que verificamos" renderiza `point.title` — **literalmente o mesmo texto do `<h4>`** duas linhas acima | Renderizar o que foi de fato verificado (dado + resultado), não o rótulo |
| A-03 | `FreeAnalysisResultStep.tsx:102-108` + `arguments-catalog.ts` (`description`) | Só 4 das 52 teses têm card próprio (ARG-001/002/005/051). As outras 48 caem no fallback: `lawExplanation` = concatenação de `arg.legalBase` + resolução, `userImpact` = `arg.summary` (jargão interno: "inexigibilidade de sanção", "margem metrológica"), `evidenceCheck` = *"Verificação específica não configurada para este argumento"* | Reescritas prontas em `docs/auditorias/2026-10-22-onboarding/05-copy.md` §3.c (template de 4 blocos em linguagem de leigo) |
| A-04 | `rule-engine.ts:694` + `infraction-classifier.ts:170-178` | `eligibleArgumentIds` é calculado e **nunca usado** — `const eligible = new Set(...)` não é lido em lugar nenhum. O filtro real é só por `families` (`:746-747`) | Aplicar o filtro (ou remover o cálculo morto). Sem isso, teses fora da família podem escapar em regras transversais |
| A-05 | `FreeAnalysisResultStep.tsx:161,313` + `rule-engine.ts:1005` | `serviceType` é recebido e **nunca usado**; a tela mostra "Instância: Defesa Administrativa" hardcoded; o `procedureDeadline` (prazo real) nunca é exibido; o procedimento recomendado pelo motor é sobrescrito pelo pedido (`cloudflare/routes/cases.ts:141`) | Exibir instância e prazo reais; usar `recommendedProcedure` quando houver divergência |
| A-06 | `FreeAnalysisResultStep.tsx:312` | O rótulo "Órgão Julgador" mostra `autuadorBody` — que é o **autuante**, não o julgador | Renomear para "Órgão autuador" |
| A-07 | `FreeAnalysisResultStep.tsx:116-136` | Nível de confiança decidido por **substring em português** (`evidenceResult.includes('fora da validade')`, `.includes('constatada')`) — frágil e opaco; ARG-002 cai em "Baixo" mesmo quando a ausência de R-19 está comprovada (inversão semântica) | Derivar a confiança do dado, não do texto |
| A-08 | `InfractionIdentificationStep.tsx:364-391` | O código da infração **não é filtrado pela categoria** escolhida na etapa 3 → o motor pode classificar outra família e a tela afirmar a categoria do usuário | Filtrar a lista por categoria |
| A-09 | `src/server/routes/cases.ts` vs `cloudflare/routes/cases.ts:46` | **Dois backends divergentes.** `POST /api/cases/anonymous` existe **só no Worker**; o Express (rota usada pelo `vercel.json` → `api/index.mjs`) **não tem** a rota. O erro é engolido em `OnboardingWizard.tsx:452-454` (só `console.error`) → falha silenciosa | Ver §7. Unificar o contrato de rotas ou, no mínimo, tratar 404 com mensagem ao usuário |
| A-10 | `FreeAnalysisResultStep.tsx:90` vs `src/core/onboarding/rules-matrix.ts:227-233` | Tolerância divergente no card ARG-005: a tela usa `measured <= 100 ? 7 : 7%`; o app usa `measured <= 107 ? -7 : 7%`. Para 101–107 km/h o card **contradiz** o valor digitado | Reusar `calculateConsideredSpeed` |
| A-11 | `rule-engine.ts:1009` | `summaryReasoning` afirma "Há fundamentação legal e técnica para protocolo" mesmo com **0 inconsistências** detectadas | Condicionar a frase à existência de teses |
| A-12 | `cloudflare/rag-adapter.ts` (`fallbackDeterministicAnalysis`) + `FreeAnalysisResultStep.tsx:167` | Em modo degradado (KB indisponível) o backend devolve `overallSuccessRate: null` → a tela mostra **0%** com o bloco de probabilidade — e o wizard trata a análise do servidor como canônica "mesmo quando a taxa é 0" (`OnboardingWizard.tsx:446-451`) | Distinguir "indisponível" de "0%" na UI |

---

## 5. Claims sem lastro

Medição do lastro real (contagem direta no código):

| Recurso | Quantidade real | Onde |
|---|---|---|
| Regras determinísticas | **15** (`RULE_*`) | `src/core/rules/rule-engine.ts` |
| Teses (`ARGUMENTS_CATALOG`) | **52** (`ARG-001`..`ARG-052`) | `src/core/arguments/arguments-catalog.ts` |
| Artigos do CTB estruturados | **31** | `src/core/legal-base/ctb-articles.ts` |
| Resoluções do CONTRAN | **9** | `src/core/legal-base/resolutions.ts` |
| Precedentes em `JURISPRUDENCE_DB` | **5**, e **código morto** (nenhum import) | `src/core/legal-base/jurisprudence.ts` |
| Peças-modelo (`TPL_*`) | **9** | `src/core/templates/templates-catalog.ts` |
| Códigos de infração no catálogo | **33** (26 CTB + 7 rodado) | `src/data/knowledge-base.ts` |
| Infrações de severidade `leve` | **0** — só 4 códigos `media` (745-50, 736-62, 735-80, 685-80) atendem Art. 267 | `src/data/knowledge-base.ts` |

| Claim | Onde | Veredito | Texto corrigido |
|---|---|---|---|
| "Cruzando autuação com **390 dispositivos** do CTB e Resoluções do CONTRAN" | `AnalysisProcessingStep.tsx:58` | **UNSUPPORTED** — "390" não existe em mais nenhum lugar do `src/` | "Cruzando a autuação com 31 artigos do CTB, 9 Resoluções do CONTRAN e 15 regras de decisão" |
| "Aplicando **390 dispositivos do CTB, 7 peças-modelo validadas e precedentes do STJ** em tempo real" | `AnalysisProcessingStep.tsx:99` | **UNSUPPORTED** — peças-modelo são 9; a jurisprudência não é consultada em runtime | "Aplicando 15 regras de decisão sobre os dados que você informou" |
| "precedentes do STJ **em tempo real**" | `AnalysisProcessingStep.tsx:99` | **UNSUPPORTED** — `JURISPRUDENCE_DB` nunca é importado; o que existe é string estática `relatedJurisprudence` nas teses | Remover ou "citando os precedentes registrados na base legal" |
| "**100%** gratuito" / "concluído com sucesso" | `AnalysisProcessingStep.tsx:62` | **UNSUPPORTED** — o resultado ainda nem existe quando o texto aparece | "Concluindo a análise dos dados que você informou" |
| "**100% dos Dados Coletados Preservados**" | `AccountVerificationGate.tsx:119-142` | **UNSUPPORTED** — reload apaga o formulário (C-07) | Remover ou implementar a persistência |
| "Isenção de **100%** do valor da multa e zero pontos" | copy de `ARG-051` / badge | **PARCIAL** — depende de conversão em advertência, que depende de `hasPreviousInfractionsLast12Months` (nem sempre coletado) | "Conversão da multa em advertência por escrito, sem pagamento e sem pontos, se a infração for leve ou média e não houver reincidência" |
| "**Probabilidade de Êxito**" | `FreeAnalysisResultStep.tsx:239` | **UNSUPPORTED** (ver C-04) | "Indicador de força do diagnóstico" |
| "Diagnóstico Preliminar Concluído (**X% de êxito**)" | `AccountVerificationGate.tsx:142` | **UNSUPPORTED** — mesma heurística (C-04), em modal que o usuário lê como veredito | "Diagnóstico Preliminar Concluído (N teses aplicáveis)" |
| "Alto potencial de anulação" | `FreeAnalysisResultStep.tsx:245` | **UNSUPPORTED** — não há dado de anulação; o score é heurístico | "Análise com N teses aplicáveis identificadas" |

---

## 6. Achados MÉDIOS e BAIXOS

**MÉDIOS**

| ID | Onde | Fato |
|---|---|---|
| M-01 | `AccountVerificationGate.tsx:133` | Modal sem `role="dialog"`, sem focus trap, sem `aria-modal` |
| M-02 | `OnboardingWizard.tsx:596` vs `FreeAnalysisResultStep.tsx:225` | Salto de cabeçalho: `h2` antes de `h1` |
| M-03 | 28 `<label>` sem `htmlFor` no onboarding; 0 `aria-invalid`, 0 `aria-describedby`, 0 `role="alert"` | Formulário não é navegável por leitor de tela |
| M-04 | `OnboardingWizard.tsx:223-226` | Troca de etapa não move o foco nem anuncia a mudança (sem `aria-live`) |
| M-05 | `InfractionIdentificationStep.tsx:503-511` | Botão "Continuar" desabilitado sem explicar o motivo |
| M-06 | `ServiceStep.tsx:47` vs `OnboardingWizard.tsx:280-295` | Contadores de etapa contraditórios ("de 4" vs tracker até 10) |
| M-07 | `FreeAnalysisResultStep.tsx:37,54,70,82` | Blocos de 30–45 palavras com jargão ("margem metrológica", "inexigibilidade de sanção") — acima do limite de linguagem simples do padrão GOV.BR |
| M-08 | `FreeAnalysisResultStep.tsx:120-136` vs `FreeAnalysisResultStep.tsx:58` | Lista de códigos do Art. 267 no card (`['745-50','735-80','736-62','735-80']`) diverge do catálogo real (4 `media`, incluindo `685-80` e sem `735-80` duplicado) |
| M-09 | `src/core/onboarding/rules-matrix.ts:169` | `hasR19SignageProof` listado como campo opcional coletável, mas nenhuma tela o coleta |

**BAIXOS**

| ID | Onde | Fato |
|---|---|---|
| B-01 | `FreeAnalysisResultStep.tsx:441,449` | "Salvar e Ver no Painel" / "Gerar Minha Defesa" não são rótulos no infinitivo |
| B-02 | `FreeAnalysisResultStep.tsx:317` | `toFixed(2)` (ponto) convive com fallback em vírgula |
| B-03 | `FreeAnalysisResultStep.tsx:349` | Chave do React é `point.title` — dois cards com o mesmo título colidem |
| B-04 | `FreeAnalysisResultStep.tsx:427-428` | Texto de "nenhuma tese" diz "recomenda-se consultar um advogado" — saída fora do tom do produto |
| B-05 | `AnalysisProcessingStep.tsx:60` | "Verificando vigência temporal: Lei 14.071/2020, 14.229/2021, 14.440/2022, 14.599/2023" — não há verificação temporal implementada no motor |

---

## 7. Divergência cliente × servidor — a matriz que explica o sintoma

Fluxo real do onboarding:

```
formulário (etapas 1–5)                        FreeAnalysisResultStep
        │                                              ▲
        ├─ AnalysisProcessingStep.tsx:49                │ 449-451
        │   ExpertRuleEngine.evaluate(infraction FULL)  │
        │        → 99% / 4 teses                        │
        │                                               │
        └─ OnboardingWizard.tsx:416 POST /api/cases/anonymous
                 │
                 ├─ cloudflare/routes/cases.ts:71-100  RECONSTRUÇÃO POR WHITELIST
                 │   (descarta notificação, prazo, flags, evidenceFlags, histórico)
                 │
                 ├─ :137 analyzeInfractionCompat → mesmo motor, dados mutilados
                 │        → 88% / 1 tese / 4 dataGaps
                 │
                 └─ :151 devolve rowToDomain(data)  ──► substitui a análise do cliente
```

**O que o usuário preenche → o que chega ao motor → o que a tela mostra:**

| Dado preenchido | Tela que coleta | Chega ao motor? | Aparece no resultado? |
|---|---|---|---|
| `inmetroAferitionDate` | `SpecificInfractionDataStep.tsx:196-201` | sim, como `radarCalibrationDate` | **card lê `radarCalibrationDate`** → sempre "Não há registro" (C-03) |
| `notificationExpeditionDate` | `InfractionIdentificationStep.tsx:445-446` | sim, mas **descartado pelo servidor** | vira **vício falso** ARG-049 (C-02) |
| `notificationDeliveryDate` | **nenhuma** | sempre `undefined` | listado como "campo crítico faltante" (C-05) |
| `hasR19SignageProof` | **nenhuma** (só comentário em `AnalysisProcessingStep.tsx:44-46`) | sempre `undefined`; no servidor, descartado | card ARG-002: "Não há comprovação…" (A-03) |
| `hasPreviousInfractionsLast12Months` | `SpecificInfractionDataStep` | no cliente sim; **no servidor descartado** | ARG-051 existe no cliente e **não** no servidor (divergência 99 vs 88) |
| `measuredSpeed` / `consideredSpeed` / `speedLimit` | `SpecificInfractionDataStep.tsx:151-186` | sim | sim, com tolerância divergente (A-10) |
| `defenseDeadline` | `InfractionIdentificationStep.tsx:463-464` | sim, mas **descartado pelo servidor** | **nunca exibido** (A-05) |
| `autuadorBody` | `InfractionIdentificationStep.tsx:332-342` | sim | rotulado como "Órgão Julgador" (A-06) |
| `plate` | `InfractionIdentificationStep.tsx:311-319` | **não** (não está no `context`) | exibido, mas conta como "não preenchido" na completude (C-05) |
| `evidenceFlags` (fotos, termos) | várias | **não** (descartado pelo servidor) |pede-se "Foto da notificação" como pendência (C-05) |

---

## 8. Correção do backend Express (reclassificação de A-09 / D-01)

Os relatórios dos anexos classificam "POST /api/cases/anonymous inexistente" como CRÍTICO, com base no backend Express. **A verificação mostrou que isso não vale para o backend canônico.**

| Item | Verificação | Resultado |
|---|---|---|
| Rota no Worker | `cloudflare/routes/cases.ts:46` | **EXISTE** (`casesRoutes.post('/cases/anonymous')`) |
| Rota no Express | `src/server/routes/cases.ts` | **NÃO EXISTE** (só `/cases`, `/cases/:id`, `/cases/:id/claim`, `/cases/:id/generate-defense`) |
| Backend canônico | `wrangler.jsonc` — `name: adeusmulta`, rota `adeusmulta.defesai.com.br/*`, `assets.directory: ./dist`, `run_worker_first: ["/api/*"]`; `scripts/dev-cloudflare.mjs` sobe `wrangler dev --config wrangler.jsonc` em `127.0.0.1:8787`; `vite.config.ts` faz proxy de `/api` para `127.0.0.1:8787` | **Worker** (frontend e API no mesmo domínio) |
| Caminho Express | `vercel.json` → rewrite `/api/(.*)` → `api/index.mjs` (build de `src/server/app.ts`) | **secundário** |
| Root `wrangler.json` | `main: "cloudflare/worker.ts"` — arquivo **inexistente** no repositório (o versionado é `cloudflare/worker.js`); `wrangler.jsonc` é o config correto | **config quebrado** |

**Reclassificação:** o achado cai de CRÍTICO para **ALTO (risco latente)**. O onboarding anônimo **funciona** no backend canônico. O risco real é duplo:

1. Se qualquer tráfego (ou o fallback `API_ORIGIN_FALLBACK`) cair no caminho Express, o POST anônimo dá 404 e o erro é engolido (`OnboardingWizard.tsx:452-454`) — o visitante perde o diagnóstico sem saber.
2. `wrangler.json` na raiz aponta para `cloudflare/worker.ts`, que não existe: um `npx wrangler deploy` com o config errado falha ou publica artefato divergente.

**Correção:** (a) alinhar os dois backends no contrato de rotas (ou remover o caminho Express do escopo de produção), (b) deletar/corrigir `wrangler.json` na raiz, (c) nunca mais engolir erro de persistência sem feedback.

**Sobre a divergência 99% × 88%:** ela **não** é causada por dois motores diferentes — o Worker usa o mesmo `ExpertRuleEngine`. É causada pela reconstrução por whitelist (C-01).

---

## 9. Inventário de copy — onde o texto ruim está

| Onde | Tipo de problema | Nº |
|---|---|---|
| `src/components/onboarding/steps/FreeAnalysisResultStep.tsx` | fallbacks que fabricam dado, rótulos ambíguos, "O que verificamos" inútil, confiança por substring | 12 |
| `src/components/onboarding/steps/AnalysisProcessingStep.tsx` | etapas fake, claims sem lastro, "sucesso" antecipado | 6 |
| `src/core/arguments/arguments-catalog.ts` (`description`) | jargão interno vazando para "O que isso significa para você" (48/52 teses) | 52 |
| `src/core/rules/rule-engine.ts` (títulos/descrições de inconsistência) | texto que aparece na tela | 15 |
| `src/components/onboarding/steps/InfractionIdentificationStep.tsx` | "Art. 281-A CTB" — a base canônica do repositório é **Art. 281, parágrafo único, II** (`src/core/legal-base/ctb-articles.ts:24`, `jurisprudence.ts:30`) | 1 |
| `src/components/onboarding/OnboardingWizard.tsx` | promessas de persistência que o código não cumpre | 3 |
| `src/core/onboarding/rules-matrix.ts` (`USER_SITUATIONS`, `USER_PROCESS_STAGES`) | rótulos internos por trás da UI | 2 |

**Reescritas prontas para colar:** `docs/auditorias/2026-10-22-onboarding/05-copy.md` §3 — 6 estágios de processamento (§3.a), 4 cards jurídicos (§3.b), template de fallback para as 48 teses sem card (§3.c), strings de UI (§3.d) e 6 exemplos de `description` do catálogo (§3.e).

**Princípios de reescrita aplicados nos anexos:** 1) sujeito = o usuário; 2) frase ≤ 20 palavras; 3) "não temos esse dado" em vez de jargão de ausência; 4) nenhum número que não exista no código; 5) nenhum "100%" que não seja matematicamente verdade; 6) nenhum rótulo que prometa resultado antes do resultado; 7)ônus do produto antes do ônus do usuário.

---

## 10. Sequência de correção sugerida

**Onda 1 — parar de mentir sobre os dados (semana 1)**

1. C-01 — transportar a infração completa na rota anônima (fim da divergência 99/88).
2. C-02 — `notificationDeliveryDate`: coletar no wizard **ou** rebaixar ARG-049 para `DATA_GAP`.
3. C-06 — remover os fallbacks que fabricam artigo/código/multa/pontos; `points ?? '—'`.
4. A-09 — unificar contrato de rotas entre Worker e Express; corrigir `wrangler.json`; erro de persistência com feedback ao usuário.

**Onda 2 — consertar o motor e a medição (semana 2)**

5. C-03 — card ARG-001 ler `inmetroAferitionDate` (1 linha).
6. C-05 — maps de completude derivados do `context` real; alinhar `missingCriticalFields` com o que o wizard coleta.
7. A-04 — aplicar `eligibleArgumentIds` (ou remover o cálculo morto).
8. A-11 / A-12 — `summaryReasoning` condicional; "indisponível" ≠ "0%".
9. A-10 — reusar `calculateConsideredSpeed` no card.

**Onda 3 — reescrever a tela (semana 3, depois da 1 e 2)**

10. C-04 — definir e renomear o número (ou removê-lo); eliminar a animação que sugere medição ao vivo.
11. A-01 — etapas de progresso reais (ou remover o fake); texto dos 6 estágios conforme §3.a do anexo de copy.
12. A-02 — "O que verificamos" passa a mostrar o dado verificado.
13. A-03 — template de fallback para as 48 teses (§3.c do anexo) + reescrita de `description` (§3.e).
14. A-05 / A-06 — instância, procedimento e prazo reais; "Órgão autuador".

**Onda 4 — endurecer a claims e a acessibilidade (semana 4)**

15. §5 — substituir todas as claims UNSUPPORTED.
16. M-01…M-06 — modal acessível, foco, `aria-live`, contadores de etapa, labels com `htmlFor`.
17. C-07 — persistir o formulário no `sessionStorage` (ou remover a promessa do modal).

**Onda 5 — medição (contínuo)**

18. Rodar os 70 cenários E2E mapeados (`docs/testing/E2E-CERTIFICACAO-CANONICA.md`) contra um caso de cada família, verificando **tese a tese** o que a tela mostra vs. o que o motor decidiu — não só status HTTP.
19. Teste de regressão de contrato: mesma entrada em cliente e servidor ⇒ mesma `recommendedArguments`, mesmo `overallSuccessRate`, mesmos `dataGaps`. Hoje isso falha (C-01).

---

## 11. O que este relatório não cobre

- Execução real da suíte E2E de 70 cenários (não executada).
- Persistência real no Supabase, integridade do `analysis_json`, RLS.
- Qualidade da KB ingerida (chunks, provenance, `SUPPORTED`/`UNSUPPORTED` por tese).
- Enriquecimento por LLM (`enrichDefenseWithGemini`) — credenciais e comportamento.
- Métricas de conversão do funil anônimo.
- `docs/padrao_GOV.BR.md` foi usado como referência de estilo; o arquivo se autodeclara padrão GOV.BR e **não vincula produto privado** — se o produto é privado, revisar o enquadramento do documento.

---

## 12. Regra de ouro do conserto

> A tela não pode afirmar o que o motor não decidiu, e o motor não pode decidir sobre o que o usuário não informou.
> Toda vez que um texto da tela não tiver um `arquivo:linha` que o sustente, o texto é invenção — e invenção aqui é risco de CDC (art. 37), não só problema de estilo.

---

*Auditoria de leitura. Nenhum código de produção alterado. Anexos em `docs/auditorias/2026-10-22-onboarding/`.*
