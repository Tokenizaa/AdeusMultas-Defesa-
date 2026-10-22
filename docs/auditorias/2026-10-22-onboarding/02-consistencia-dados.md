# Auditoria de Consistência de Dados — Onboarding → Motor de Regras → RAG → Persistência → Tela

**Repositório:** `/home/lg/workspace/projects/AdeusMultas-Defesa-`
**Branch:** `main` @ `53fac09` (working tree limpo, exceto `tests/e2e-reconstruction/admin-pricing-edit.spec.ts` não rastreado, pré-existente)
**Modo:** somente leitura. Nenhum arquivo do repositório foi alterado. Nenhum branch, PR ou commit foi criado.
**Data:** 2026-10-22

---

## 1. Escopo e método

Cadeia auditada:

```
OnboardingWizard (form) → AnalysisProcessingStep (motor no cliente)
      ↓                                      ↓
InfractionIdentificationStep          POST /api/cases/anonymous
SpecificInfractionDataStep                   ↓
      ↓                          ┌────────────┴────────────┐
OnboardingWizard.handleAnalysisCompleted  Express (src/server)   Cloudflare Worker
      ↓                                  ↓                        ↓
FreeAnalysisResultStep              RagPipeline.analyzeInfraction   rag-adapter
                                           ↓                        ↓
                                   ExpertRuleEngine.evaluate (comum)
```

Método: leitura integral dos arquivos do caminho, `grep` de cruzamento por símbolo/campo, e comparação linha a linha das versões paralelas. Cada achado abaixo é um fato verificável com `file:line`.

**Terminologia de severidade**

| Severidade | Critério |
|---|---|
| **CRÍTICO** | Corrompe dado, valor, tese jurídica ou o resultado exibido ao usuário. O código não erra — erra silenciosamente. |
| **ALTO** | Impede a boaLEGAL ou o dado persistido divergir do exibido. |
| **MÉDIO** | Duas fontes de verdade divergentes; falha sob condição específica. |
| **BAIXO** | Comentário/documento/código desalinhado, sem efeito no resultado. |

---

## 2. Respostas diretas às 8 perguntas

### P1 — Fases duplas de análise (cliente × servidor) e taxa exibida na divergência

**Sim, existem duas análises independentes, e a segunda substitui a primeira na tela.**

| | Análise A (cliente) | Análise B (servidor) |
|---|---|---|
| Onde roda | `src/components/onboarding/steps/AnalysisProcessingStep.tsx:49` | `cloudflare/routes/cases.ts:137` → `cloudflare/rag-adapter.ts:237` → `ExpertRuleEngine.evaluate` |
| Entrada | `infractionData` completo (todas as flags coletadas) | objeto reduzido a 17 campos (`cloudflare/routes/cases.ts:74-96`) |
| Filtro de evidência | **não** | **não** (`cloudflare/rag-adapter.ts:228-236`, comentário explícito) |
| Procedimento | derivado dos fatos | sobrescrito pelo pedido (`cloudflare/routes/cases.ts:141`, `:273`) |
| Substituição | `setCaseAnalysis(data.analysis)` — `src/components/onboarding/OnboardingWizard.tsx:450` | idem |

**A taxa exibida muda na frente do usuário.** O cliente mostra a taxa da Análise A; ao concluir o save, `OnboardingWizard.tsx:450` troca `caseAnalysis` pela Análise B. Os campos que a Análise B não recebe são justamente os que produzem as teses de maior peso:

| Campo perdido na redução | Regra que deixa de disparar | ARG | Peso na taxa |
|---|---|---|---|
| `notificationExpeditionDate` | `RULE_DECADENCIA_30_DIAS` | ARG-048 | base 98 (`rule-engine.ts:917-918`) |
| `inmetroAferitionDate` | `RULE_RADAR_CALIBRACAO_12M` | ARG-001 | base 92 (`rule-engine.ts:921-922`) |
| `hasPreviousInfractionsLast12Months` | `RULE_CONVERSAO_ADVERTENCIA_267` | ARG-051 | base 94 (`rule-engine.ts:919-920`) |
| `hasPhotoProof` | `RULE_PHOTO_PROOF_REQUIRED` | ARG-006/009 | +15 por inconsistência |
| `hasR19SignageProof` | `RULE_SINALIZACAO_R19` | ARG-002 | base 78 |

Exemplo concreto: excessão de velocidade com radar aferido há 13 meses. Análise A → ARG-001 → taxa ≈ 92 + bônus. Análise B → sem `inmetroAferitionDate` → ARG-001 ausente, ARG-049 presente por construção (D-03) → taxa ≈ 50-65. O número exibido ao condutor cai ~30 pontos entre a tela de processamento e a tela de resultado, sem que nada na interface indique que a análise foi refeita com menos dados.

**Agravante:** `OnboardingWizard.tsx:165` inicializa `overallSuccessRate: 0`. Se o POST falhar (D-01 é exatamente o caso do servidor Express), o `catch` em `OnboardingWizard.tsx:453-455` apenas loga — a tela permanece com a Análise A. Se o POST *responder* com um corpo sem `analysis` (ex.: 404 HTML), `setCaseAnalysis` não é chamado e a UI exibe `?? 0` (`FreeAnalysisResultStep.tsx:167`) → **"0% de êxito"** com as teses da Análise A ainda listadas logo abaixo.

---

### P2 — Inventário de aliases de nome de campo

Quatro domínios de nomes coexistem para o mesmo dado. Nenhum é validado por tipo.

| # | Domínio de nomes | Onde | Observação |
|---|---|---|---|
| A | **Nome canônico do domínio** — `inmetroAferitionDate`, `measuredSpeed`, `consideredSpeed` | `src/types/index.ts:68-72` | É a base de `InfractionData`. |
| B | **Alias do contexto do motor** — `radarCalibrationDate`, `infractionDate`, `speedMeasured`, `speedConsidered` | `src/core/rules/rule-engine.ts:705-726` (contexto), `:759-762` (checagem de `requiredData`) | O motor renomeia o dado ao montar o contexto. |
| C | **Nomes históricos de formulário** — `speedMeasured`, `speedConsidered`, `code`, `pontos`, `velocidadeMedida` | `src/types/index.ts:69-70`, `src/core/mappers/canonical-mapper.ts:456-470` | Aceitos em paralelo pelo mapper; nunca canônicos. |
| D | **Alias do pipeline de validação** — `radarCalibrationDate → infraction.inmetroAferitionDate` | `src/core/validation/data-lineage.ts:312`, `src/core/validation/final-quality-gate.ts:543` | **Resolve o alias corretamente.** |

**Achado central (D-06):** o motor renomeia no contexto (domínio B) mas seus próprios mapas de pontuação usam o nome do domínio A. `rule-engine.ts:713` grava `radarCalibrationDate: infraction.inmetroAferitionDate`; `rule-engine.ts:1026-1063`, `:1065-1103` e `:1110` leem `inmetroAferitionDate` **do contexto**. Como o contexto não tem essa chave, o dado é sempre `undefined` ali.

Efeito: `hasStrongEvidenceForArgument('ARG-001')` (`rule-engine.ts:1108-1123`) é **sempre falso** → o bônus de evidência (+3, `rule-engine.ts:948`) nunca é aplicado à tese de radar, que é justamente a tese com prova documental mais forte.

Detalhe do ciclo de vida do alias:
- `src/types/index.ts:72` → `inmetroAferitionDate` (canônico)
- `rule-engine.ts:713` → contexto vira `radarCalibrationDate`
- `rule-engine.ts:713` consumida por `RULE_RADAR_CALIBRACAO_12M` (`rule-engine.ts:91`) — **funciona**
- `rule-engine.ts:1026-1063` / `:1110` — **quebrado**
- `data-lineage.ts:312` / `final-quality-gate.ts:543` — **funciona**
- `src/components/onboarding/steps/FreeAnalysisResultStep.tsx:39-40` — lê `data.infraction.radarCalibrationDate` — **quebrado** (o domínio não tem essa chave; ver D-16)

**Duplicação `measuredSpeed`/`speedMeasured`:** `InfractionData` declara os dois (`src/types/index.ts:67-70`). O motor mapeia os dois para o contexto (`rule-engine.ts:710-711`) mas **só usa** `measuredSpeed`/`consideredSpeed` (`rule-engine.ts:711`, `:1111`). O mapper canônico persiste só `measured_speed`/`considered_speed` (`src/core/mappers/canonical-mapper.ts:465-466`) — `speedMeasured`/`speedConsidered` são aceitos na entrada e **descartados na saída**. `src/lib/mappers/case-mappers.ts:96-97` volta a ler os legados, o que sugere que em algum momento os legados eram a única fonte.

---

### P3 — `recommendedArguments` × alcançabilidade do catálogo, incluindo ARG-051

**O ARG-051 existe e a regra existe. A regra é inalcançável no fluxo padrão.**

- `ARG-051` existe no catálogo: `src/core/arguments/arguments-catalog.ts:1266-1287` (id, `confidenceScore: 99`, `resolutions: ['Resolução CONTRAN nº 918/2022, Art. 10']`).
- `RULE_CONVERSAO_ADVERTENCIA_267` existe: `src/core/rules/rule-engine.ts:123-158`.
- O catálogo de infrações declara ARG-051 como recomendado para a família `excesso_velocidade`: `src/data/knowledge-base.ts:42` (`745-50`, `severity: 'media'`, `recommendedArgumentCodes: ['ARG-001','ARG-002','ARG-003','ARG-004','ARG-008','ARG-048','ARG-051']`).

**Por que nunca dispara:**

1. A regra exige `requiredData: ['hasPreviousInfractionsLast12Months']` (`rule-engine.ts:129`).
2. O motor aborta a regra antes de evaluá-la quando o dado falta (`rule-engine.ts:763-781` → `status: 'DATA_GAP'`).
3. O formulário **só coleta** `hasPreviousInfractionsLast12Months` dentro do bloco `category === 'conversao_advertencia'` — `src/components/onboarding/steps/SpecificInfractionDataStep.tsx:476-500` (checkbox nas linhas 488-492). Os blocos `excesso_velocidade` (`:139`), `lei_seca` (`:225`), `celular` (`:344`), `vermelho` (`:383`), `estacionamento` (`:443`) não têm esse campo.
4. No caminho Cloudflare, o campo é descartado na redução para 17 campos (`cloudflare/routes/cases.ts:74-96`).

**Resultado:** o condutor de excesso de velocidade leve/média **não reincidente** — o caso mais típico do produto — nunca produz ARG-051. A tese aparece no catálogo, aparece na elegibilidade, aparece na UI do serviço, e nunca aparece na análise. Quando o usuário preenche o checkbox (fluxo `conversao_advertencia`), o dado nem chega ao servidor: a redução o descarta.

**Inventário completo de alcançabilidade (catálogo `ARGUMENTS_CATALOG` = 52 teses):**

| Grupo | IDs | Alcançável por regra? |
|---|---|---|
| Produzidas por `legalArgumentId` | ARG-001, 002, 005, 010, 015, 019, 020, 024, 025, 027, 048, 049, 051 | 13 |
| Declaradas em `relatedArguments` mas nunca emitidas | ARG-006, 007, 009, 039, 041 | 5 |
| No catálogo, sem regra, sem `recommendedArgumentCodes` | ARG-040, 042, 043, 044, 045, 046, 047, 052 | 8 |
| Alcançáveis apenas por `eligibleArgumentIds` | ARG-003, 004, 008, 011, 012, 013, 014, 016, 017, 018, 021, 022, 023, 026, 028, 029, 030, 031-038, 050 | 29 |

**Duas classes de inalcançabilidade distintas:**

- **Classe A — regra declarada mas estéril:** `RULE_INDICACAO_CONDUTOR_TEMPESTIVA` (`rule-engine.ts:399-437`) declara `relatedArguments: ['ARG-039']`, mas **todos** os caminhos de retorno são `return null` (linhas 420, 430, 434, 436). A regra aparece como `PASS` em `evaluatedRules` — signalizando ao usuário que a hipótese foi verificada — e produz zero teses.
- **Classe B — ARG-006 dentro de uma regra que produz ARG-009:** `RULE_PHOTO_PROOF_REQUIRED` (`rule-engine.ts:346-388`) decide entre `ARG-009` (semáforo) e `ARG-006` (radar) na linha 381. `ARG-006` não está em nenhum `recommendedArgumentCodes` do catálogo. `ARG-009` está. A regra, portanto, produz em RAM (`excesso_velocidade`) uma tese que a classificação declara inelegível.

---

### P4 — `eligibleArgumentIds` do classificador × uso real pelo motor

**O classificador é a fonte de verdade declarada. O motor nunca lê essa fonte.**

- `src/core/rules/infraction-classifier.ts:170-178` — `eligibleFor(family)` = união dos `recommendedArgumentCodes` de todos os códigos do catálogo da família. É a fonte de verdade canônica.
- `src/core/rules/infraction-classifier.ts:254` — `isArgumentEligible(classification, argumentId)` é **exportado e nunca importado** em nenhum arquivo de `src/` ou `cloudflare/` (grep exaustivo: única ocorrência é a própria definição).
- `src/core/rules/rule-engine.ts:694` — `const eligible = new Set(classification.eligibleArgumentIds);` — **declarado e nunca lido**. As únicas duas menções a `eligibleArgumentIds` no motor são `:694` (a atribuição) e `:1015` (a cópia para a saída da análise).
- `src/core/ai/ai-orchestrator.ts:265-268` — `permittedTheses()` filtra `recommendedArguments` apenas por **existência** no `ARGUMENTS_CATALOG`. Não consulta `eligibleArgumentIds`.
- `src/core/validation/final-quality-gate.ts:128-157` — os 7 checks (COMPLETUDE, FIDELIDADE, CONSISTENCIA, CAUSALIDADE, RASTREABILIDADE, NAO_INVENCAO, ESTRUTURA) verificam documento/lineage. **Nenhum** verifica elegibilidade.

**Consequência:** o payload de análise se autocontradiz. Para `excesso_velocidade`, a análise diz `infractionClassification.eligibleArgumentIds: ['ARG-001','ARG-002','ARG-003','ARG-004','ARG-008','ARG-048','ARG-051', ...]` e, no mesmo objeto, `recommendedArguments` contém `ARG-005` e `ARG-006` — teses que o classificador diz serem inelegíveis. A cadeia de autorização (`permittedTheses`) aceita tudo que existe no catálogo. A regra documentada em `rule-engine.ts:740-745` ("ELEGIBILIDADE (RC-1): regra cujas teses são todas inelegíveis para a família da infração é registrada NOT_APPLICABLE") **nunca é executada**, porque o filtro usa `rule.families` (`:746`), não a elegibilidade das teses.

---

### P5 — Cálculo de `overallSuccessRate` × o que a UI afirma

**O número não é uma probabilidade. A UI o chama de probabilidade.**

Fórmula completa — `src/core/rules/rule-engine.ts:913-963`:

```
baseScore = 35                                    // piso sem teses
  → 98  se ARG-048 (decadência)
  → 94  se ARG-051 (conversão)
  → 92  se ARG-001 (aferição radar)
  → 88  se ARG-025 (Lei Seca)
  → 85  se ARG-005 (velocidade considerada)
  → 82  se ARG-015 (citação manual)
  → 78  se ARG-002 (sinalização R-19)
  → min(90, 50 + 15×n) se houver qualquer outra

adjustedScore = baseScore
              + round(ratioCompletude × 10)          // 0..+10
              + 3 × nº(teses com evidência forte)      // +0..+3 por tese
              − 2 × nº(dataGaps)

overallSuccessRate = min(99, max(piso, adjustedScore))
  piso = 30 se há inconsistências, 15 se não
```

**Não há um único dado empírico, histórico, jurisprudencial ou jurisdicional na fórmula.** É uma tabela literal + contagem de campos preenchidos + contagem de theses.

**O que a UI afirma:**

| Local | Texto |
|---|---|
| `src/components/onboarding/steps/FreeAnalysisResultStep.tsx:167` | `successRate` → "probabilidade de deferimento" |
| `src/components/onboarding/generation/DocumentCheckoutStep.tsx:256` | "Análise técnica com X% de probabilidade de êxito" |
| `src/components/onboarding/generation/DocumentReviewStep.tsx:69` | valor exibido ao lado do documento |
| `src/components/onboarding/AccountVerificationGate.tsx:142` | "Diagnóstico Preliminar Concluído (X% de êxito)" |
| `src/components/admin/AdminCaseDetailView.tsx:485` | "Probabilidade: X%" |
| `src/types/index.ts:182` | "Probabilidade técnica estimada (0-100%)" |

**Três problemas concretos:**

1. **O piso de 30% é garantido mesmo sem nenhuma tese.** `rule-engine.ts:962` — com zero inconsistências e zero gaps, `overallSuccessRate = max(15, 35+0+0-0) = 35`. Um caso sem nenhum víciojurídico mostra **35% de chance de ganhar**. O piso nunca chega a 15 porque `baseScore` já é 35.
2. **A completude que alimenta o bônus é medida contra campos inexistentes** (D-07) — 3 a 6 campos de cada família (`dateTime`, `plate`, `location`, `inmetroAferitionDate`, `hasVideoProof`, `bafometerResult`) nunca estão no contexto, então nunca são contados como preenchidos. O bônus máximo real é ~6, não 10.
3. **O "+3 por evidência forte" nunca dispara para ARG-001/ARG-005** (D-06), justamente as teses com documentação mais robusta.

**Modos degradados divergem:** `cloudflare/rag-adapter.ts:340-341` devolve `overallSuccessRate: null` com `successRateBasis: 'UNAVAILABLE'` — coerente. `src/server/routes/cases.ts:424` fabrica `overallSuccessRate: 50` num analysis de fallback — incoerente (D-12).

---

### P6 — `dataCompleteness` / `missingCriticalFields` × campos realmente coletados no wizard

**O motor pede ao usuário campos que o formulário não coleta, e vice-versa.**

`getMissingCriticalFields` — `src/core/rules/rule-engine.ts:1128-1160` — lê `context[f.field]`:

| Campo pedido como "crítico faltante" | Existe no `InfractionData`? | Coletado no wizard? |
|---|---|---|
| `inmetroAferitionDate` ("Data de aferição do INMETRO") | **sim** (`types/index.ts:72`) | sim, mas só para `excesso_velocidade` |
| `bafometerResult` ("Resultado do bafômetro") | **não** | não |
| `hasVideoProof` ("Vídeo da abordagem" / "Vídeo da infração") | **não** | não |
| `notificationDeliveryDate` ("Data de entrega da notificação") | sim (`types/index.ts:74`) | **nunca** — 0 ocorrências em `src/components/` |
| `hasPhotoProof` ("Foto do semáforo"/"Foto do celular") | sim | sim, mas só em `lei_seca`/`celular`/`vermelho` |
| `hasR19SignageProof` ("Comprovação de sinalização R-19") | sim | sim, mas só em `excesso_velocidade` |
| `radarEquipmentId` ("Identificação do radar") | sim | sim, mas só em `excesso_velocidade` |
| `hasPsychomotorTerm` ("Termo de constatação de sinais de embriaguez") | sim | sim, mas só em `lei_seca` |
| `yellowPhaseCrossing` ("Fase amarela no cruzamento") | sim | sim, mas só em `vermelho` |
| `cellphoneCircumstance` ("Circunstância do uso do celular") | sim | sim, mas só em `celular` |

Três problemas:

1. **`bafometerResult` e `hasVideoProof` não existem** em `InfractionData` (`src/types/index.ts:52-114`) nem no contexto (`rule-engine.ts:699-728`). Para as famílias `alcoolemia`, `semaforo` e `celular`, a tela de resultado **sempre** lista "Vídeo da abordagem" e "Resultado do bafômetro" como faltantes, com `showImprovementMessage` ativo (`FreeAnalysisResultStep.tsx:199`, `:265-283`). O usuário é instruído a fornecer dados que não têm campo de entrada, nem no onboarding, nem no banco.
2. **`notificationDeliveryDate` é sempre listado como faltante** e nunca é coletado (D-03, D-04).
3. **A completude (`ratio`) é medida contra chaves que não existem no contexto** (D-07): `countFilledRelevantFields` (`rule-engine.ts:1065-1103`) lê `context['dateTime']` (o contexto tem `infractionDate`), `context['plate']` (não existe), `context['location']` (não existe), `context['inmetroAferitionDate']` (não existe), `context['hasVideoProof']` (não existe), `context['bafometerResult']` (não existe). **Mínimo de 3 campos永远 contados como vazios** em todas as famílias, mais 3–6 específicos.

A tela mostra `dataCompleteness.ratio` como "X% completo" (`FreeAnalysisResultStep.tsx:253`) — um número que nunca pode passar de ~60% mesmo com o formulário 100% preenchido.

---

### P7 — Persistência de `analysis_json` × re-derivação no GET

**O GET não re-deriva. A PUT e o onboarding-v2 re-derivam. E o round-trip perde campos que a própria análise usou.**

| Operação | Comportamento | file:line |
|---|---|---|
| `POST /cases` | **descarta** o `analysis` enviado pelo cliente (`delete (domainData as any).analysis`) e **re-deriva** via `RagPipeline.analyzeInfraction` | `src/server/routes/cases.ts:127`, `:143` |
| `GET /cases/:id` | **não** re-deriva — lê `analysis_json` da linha | `src/server/routes/cases.ts:73-112`, `src/core/mappers/canonical-mapper.ts:284-290` |
| `PUT /cases/:id` | **re-deriva** a partir do `infraction` do body | `src/server/routes/cases.ts:216` |
| `POST /onboarding-v2/cases/:id/analysis` | **re-deriva** a partir de `CanonicalMapper.rowToDomain(row)` — ou seja, da infração reconstruída do banco | `src/server/routes/onboarding-v2.ts:82` |
| Cloudflare `POST /cases/anonymous` | re-deriva via `analyzeInfractionCompat` e **sobrescreve o procedimento** | `cloudflare/routes/cases.ts:137`, `:141` |
| Cloudflare rota autenticada | idem | `cloudflare/routes/cases.ts:272-273` |

**O problema não é a re-derivação — é a perda no round-trip.**

`notification_delivery_date` existe no banco (`supabase/migrations/20260925120000_fase_12_2_add_missing_case_columns.sql:16`) mas é **descartado em três pontos de escrita e um de leitura**:

| Ponto | Arquivo:linha | Efeito |
|---|---|---|
| `domainToRow` (Express) | `src/core/mappers/canonical-mapper.ts:438-504` | nunca escreve `notification_delivery_date` |
| `domainToRow` (Cloudflare) | `cloudflare/canonical-mapper.ts:106-188` | idem |
| `caseRowToDatabaseRow` (write-through Supabase) | `src/server/db/case-repository.ts:125` | idem |
| `databaseRowToCaseRow` (read Supabase → memória) | `src/server/db/case-repository.ts:83` | nunca lê |

Consequência: a análise persistida foi calculada com um conjunto de fatos; a infração reconstruída do banco tem um conjunto menor; qualquer re-derivação (PUT, onboarding-v2) produz uma análise **diferente** da persistida, sem que nada compare as duas.

O mesmo vale para `speedMeasured`/`speedConsidered` (descartados em `canonical-mapper.ts:465-466`), `hasPhotoProof`… (persistido em `has_photo_proof`, ok) e para os `evidenceFlags` (persistidos em `evidence_json`, mas **não** re-expandidos para o nível superior — `cloudflare/rag-adapter.ts:212-225` só o faz no adaptador, `src/core/rules/rule-engine.ts:728` lê `infraction.evidenceFlags` direto).

---

### P8 — `selectedArguments` × `recommendedArguments`, e as fontes de verdade paralelas

**`selectedArguments` é derivado de `recommendedArguments`. Não é uma fonte independente.**

- `src/core/rules/rule-engine.ts:981` — `const selectedArguments = Array.from(new Set(recommendedArgs.map((a) => a.id)));`
- `src/core/rag/rag-pipeline.ts:200-202` — o RAG **filtra** `selectedArguments` pela mesma regra de evidência que filtra `recommendedArguments`.

Portanto `selectedArguments ⊆ recommendedArguments`, sempre. Não há divergência possível entre os dois dentro do motor — mas também **não há informação nova**: o nome sugere "o que o usuário escolheu", e não é nada disso. É a lista de ids das tesesIUM推荐.

**Onde `selectedArguments` é consumido como se fosse escolha do usuário:** `src/components/onboarding/steps/FreeAnalysisResultStep.tsx:204` usa `analysis?.recommendedArguments` (não `selectedArguments`); `cloudflare/rag-adapter.ts:404` usa `analysis.recommendedArguments.map(a => a.id)` para o Document Assembly. Nenhum ponto trata `selectedArguments` como input do usuário. O campo é redundante, mas não divergente — o risco é de alguém Future ajouter a ler e assumir semântica de seleção.

**Fontes de verdade paralelas (a parte grave da P8).** Existem **cinco** catálogos de teses e **quatro** catálogos de infração/evidência coexistindo:

| # | Fonte | Arquivo:linha | Natureza | Conflita com |
|---|---|---|---|---|
| 1 | `ARGUMENTS_CATALOG` (52 teses) | `src/core/arguments/arguments-catalog.ts:1-1311` | **canônico** | — |
| 2 | `LEGAL_ARGUMENTS` | `src/data/knowledge-base.ts:400-432` | derivado, `@deprecated` | `applicabilityNote` usa `whenToUse[0]`; o motor usa `whenToUse.join('; ')` (`rule-engine.ts:829`) → **texto diferente para a mesma tese** |
| 3 | `INFRACTION_CATALOG` | `src/data/knowledge-base.ts:33-398` | catálogo de infrações com `severity`, `points`, `fineAmount`, `recommendedArgumentCodes` | `points`/`fineAmount`/`severity` duplicados de `src/types/index.ts:59-61` e do default do wizard (`OnboardingWizard.tsx:339-389`) |
| 4 | `EXPERT_RULES` | `src/core/rules/rule-engine.ts:~30-650` | regras com `relatedArguments` | `relatedArguments` cita teses que a regra não emite (ARG-007, ARG-039, ARG-041) |
| 5 | `cloudflare/canonical-mapper.ts` | `:106-188` | fork do `domainToRow` | fork do mapper canônico (D-25) |

**E quatro namespaces de `evidenceFlags`, sem schema** (`src/types/index.ts:114` — `{ [key: string]: boolean }`, index livre, nenhum catálogo de chaves):

| Namespace | Chaves | Onde |
|---|---|---|
| A (RAG) | `fotoRetencaoTrafego`, `manualVeiculoOuFotoPainel`, `fotoPlacaR6aAusente` | `src/core/rag/rag-pipeline.ts:21-23` |
| B (adaptador Cloudflare) | `r19SignageProof`, `fotoVeiculo`, `psicomotorTerm`, `observacoesAgente`, `hasRegulatorySign`/`placaSinalizacao`, `recusouTeste`, `ofereceuContraprova`, `tempoAmarelo`, `celularVivaVoz`, `passagemEmergencia` | `cloudflare/rag-adapter.ts:215-223` |
| C (motor) | `hasPhotoProof`, `hasR19SignageProof`, `hasPsychomotorTerm`, `hasAgentDetailedObservations`, `hasRegulatorySign`, `refusedTest`, `offeredRetest`, `yellowPhaseCrossing`, `cellphoneCircumstance`, `emergencyPassage` (nível superior, não `evidenceFlags`) | `src/core/rules/rule-engine.ts:719-728` |
| D (legado PT) | nomes em português variados | `src/server/routes/ai.ts` |

Uma flag gravada como `fotoVeiculo` (namespace B) não satisfaz `fotoRetencaoTrafego` (namespace A). Nenhum erro, nenhuma falha — apenas a tese que some.

---

## 3. Registro de achados — 4 visões

### Visão 1 — Por achado

| ID | Achado | Arquivos | Tipo | Severidade | Status |
|---|---|---|---|---|---|
| D-01 | `/api/cases/anonymous` não existe no Express | `OnboardingWizard.tsx:416`, `src/server/app.ts:103`, `src/server/routes/cases.ts:51-337`, `cloudflare/routes/cases.ts:46` | Contrato de API ausente | CRÍTICO | Aberto |
| D-02 | Análise B (servidor, dados reduzidos) substitui Análise A (cliente, dados completos) na tela | `OnboardingWizard.tsx:416-450`, `cloudflare/routes/cases.ts:74-96` | Divergência de pipeline | CRÍTICO | Aberto |
| D-03 | ARG-049 disparado por construção (`expedição && !entrega`); entrega nunca coletada | `rule-engine.ts:847-849`, `src/components/` (0 ocorrências) | Condição lógica invertida | CRÍTICO | Aberto |
| D-04 | `notification_delivery_date` existe no banco, nunca escrito nem lido | `migration 20260925120000:16`, `canonical-mapper.ts:438-504`, `cloudflare/canonical-mapper.ts:106-188`, `case-repository.ts:83,125` | Coluna morta | CRÍTICO | Aberto |
| D-05 | `eligibleArgumentIds` nunca aplicado; `isArgumentEligible` morto; `permittedTheses` não filtra | `infraction-classifier.ts:170-178,254`, `rule-engine.ts:694`, `ai-orchestrator.ts:265-268` | Fonte de verdade ignorada | CRÍTICO | Aberto |
| D-06 | Alias `radarCalibrationDate`×`inmetroAferitionDate` quebrado nos mapas de pontuação | `rule-engine.ts:713,1026-1063,1065-1103,1110` | Alias quebrado | ALTO | Aberto |
| D-07 | `countRelevantFields`/`countFilledRelevantFields` usam chaves inexistentes no contexto | `rule-engine.ts:1026-1103` vs `:699-728` | Métrica contra campo fantasma | ALTO | Aberto |
| D-08 | Filtro de evidência existe só no RAG (Express); cliente e Cloudflare não aplicam | `rag-pipeline.ts:20-24,180-205`, `AnalysisProcessingStep.tsx:49`, `cloudflare/rag-adapter.ts:228-236` | Filtro assimétrico | ALTO | Aberto |
| D-09 | 4 namespaces de `evidenceFlags`, tipo sem schema | `types/index.ts:114`, `rag-pipeline.ts:21-23`, `cloudflare/rag-adapter.ts:215-223` | Namespace paralelo | ALTO | Aberto |
| D-10 | `mapCaseToAnalysisInput` descarta 17 campos → harness de certificação testa outra análise | `src/lib/mappers/case-mappers.ts:83-100`, `e2e-test-runner-service.ts:16`, `AdminIntegrityTestView.tsx:29` | DTO truncado | ALTO | Aberto |
| D-11 | `mapAnalysisToDocumentInput` fabrica `['ARG-001']` sem teses | `src/lib/mappers/case-mappers.ts:143-145` | Fallback de tese jurídica | ALTO | Aberto |
| D-12 | Análise fabricar com `overallSuccessRate: 50` | `src/server/routes/cases.ts:424` | Número inventado | ALTO | Aberto |
| D-13 | ARG-051 inalcançável: campo exigido só coletado em `conversao_advertencia`; descartado na rota Cloudflare | `rule-engine.ts:123-158`, `SpecificInfractionDataStep.tsx:476-500`, `cloudflare/routes/cases.ts:74-96` | Regra inalcançável | ALTO | Aberto |
| D-14 | `overallSuccessRate` sem lastro empírico, exibido como "probabilidade de êxito" | `rule-engine.ts:913-963`, 6 pontos de UI | Métrica sem fundamento | ALTO | Aberto |
| D-15 | `points || 4` exibe 4 pontos em infração de 0 pontos | `FreeAnalysisResultStep.tsx:318`, `OnboardingWizard.tsx:353-357` | Truthiness | ALTO | Aberto |
| D-16 | Resultado lê `radarCalibrationDate`; o campo real é `inmetroAferitionDate` | `FreeAnalysisResultStep.tsx:39-40`, `types/index.ts:72` | Alias quebrado | ALTO | Aberto |
| D-17 | `contraranResolution` (typo) → resolução CONTRAN nunca renderizada | `FreeAnalysisResultStep.tsx:104`, `types/index.ts:123`, `rule-engine.ts:824,859` | Typo em campo | ALTO | Aberto |
| D-18 | `PUT /cases/:id` sobrescreve a linha inteira; só `user_id` preservado | `src/server/routes/cases.ts:196-227` | Overwrite destrutivo | MÉDIO | Aberto |
| D-19 | Re-deriva análise a partir de infração reconstruída (já sem `notificationDeliveryDate`) | `src/server/routes/cases.ts:216`, `src/server/routes/onboarding-v2.ts:82` | Re-derivação divergente | MÉDIO | Aberto |
| D-20 | Fallback Cloudflare salva caso como `status: 'completed'` com 0 teses | `cloudflare/rag-adapter.ts:334-357` | Falha mascarada de sucesso | MÉDIO | Aberto |
| D-21 | `RULE_INDICACAO_CONDUTOR_TEMPESTIVA` é estéril mas declara `relatedArguments: ['ARG-039']` | `rule-engine.ts:399-437` | Regra morta com falso PASS | MÉDIO | Aberto |
| D-22 | ARG-052 (e ARG-040, 042-047) no catálogo, sem regra e sem `recommendedArgumentCodes` | `arguments-catalog.ts:1289-1310` | Tese inalcançável | MÉDIO | Aberto |
| D-23 | `LEGAL_ARGUMENTS` (deprecated) divergente de `ARGUMENTS_CATALOG` em `applicabilityNote` | `knowledge-base.ts:400-432` vs `rule-engine.ts:829` | Fonte duplicada | MÉDIO | Aberto |
| D-24 | `mapRuleInputToField` duplicado em 2 arquivos | `data-lineage.ts:306`, `final-quality-gate.ts:537` | Código duplicado | MÉDIO | Aberto |
| D-25 | `domainToRow` duplicado (Express × Cloudflare) | `canonical-mapper.ts:438-504` vs `cloudflare/canonical-mapper.ts:106-188` | Fork de mapper | MÉDIO | Aberto |
| D-26 | `recommendedProcedure` sobrescrito pelo pedido do usuário sem `resolveProcedure` | `cloudflare/routes/cases.ts:141,273` vs `rag-adapter.ts:308-333` | Guard ignorado | MÉDIO | Aberto |
| D-27 | `autuadorBody`: Express lança erro cru (400), Cloudflare substitui `'Não informado'` | `rule-engine.ts:683-685`, `src/server/routes/cases.ts:143`+catch, `cloudflare/routes/cases.ts:88` | Semântica divergente | MÉDIO | Aberto |
| D-28 | Comentários descrevem comportamento inexistente | `AnalysisProcessingStep.tsx:44-46,61`, `rule-engine.ts:390-394` | Doc-vs-code | BAIXO | Aberto |
| D-29 | Lista hardcoded "leve ou média" com item duplicado | `FreeAnalysisResultStep.tsx:58` vs `rule-engine.ts:141` | Constante duplicada | BAIXO | Aberto |
| D-30 | `severity`/`points`/`fineAmount` com 3 origens (catálogo, tipo, default do wizard) | `knowledge-base.ts:35-40`, `types/index.ts:59-61`, `OnboardingWizard.tsx:339-389` | Constante duplicada | BAIXO | Aberto |

### Visão 2 — Por era de arquivo

| Era | Padrão dominante | Arquivos que seguem |
|---|---|---|
| **Era 1 — núcleo canônico** (Fases 1-8, ADR 013) | nomes canônicos (`inmetroAferitionDate`), `FAIL CLOSED` em `requiredData`, filtro de evidência no RAG, mapper único | `src/core/arguments/arguments-catalog.ts`, `src/core/rag/rag-pipeline.ts`, `src/core/rules/infraction-classifier.ts`, `src/core/mappers/canonical-mapper.ts`, `src/core/validation/*` |
| **Era 2 — motor determinístico** (Fase 8-P1A/B, aliases) | contexto renomeado (`radarCalibrationDate`), `evidenceFlags` no nível superior, elegibilidade declarada e não aplicada | `src/core/rules/rule-engine.ts` |
| **Era 3 — adapters de borda** (Cloudflare Worker, 2026) | `evidenceFlags` com namespace próprio, `domainToRow` fork, procedimento sobrescrito, filtro de evidência removido de propósito | `cloudflare/rag-adapter.ts`, `cloudflare/canonical-mapper.ts`, `cloudflare/routes/cases.ts` |
| **Era 4 — UI de onboarding** | leitura por alias do contexto (`radarCalibrationDate`), typos (`contraranResolution`), defaults por truthiness, duplicação de listas | `FreeAnalysisResultStep.tsx`, `AnalysisProcessingStep.tsx`, `OnboardingWizard.tsx` |
| **Era 5 — rotas Express** | re-derivação no POST/PUT, `/cases/anonymous` ausente, `overallSuccessRate: 50` de fallback | `src/server/routes/cases.ts`, `src/server/routes/onboarding-v2.ts` |

**Onde os achados nascem:** D-06 e D-16 (Era 2 vs Era 4 — alias resolvido em um lado, não no outro); D-08 e D-26 (Era 1 vs Era 3 — o adapter removeu o filtro de evidência deliberadamente, com comentário justificando, mas a remoção ficou só de um lado); D-01, D-27, D-12 (Era 5 nunca recebeu a rota anônima que a Era 3 implementou); D-11, D-22, D-23 (Era 4 e Era 5).

### Visão 3 — Por responsabilidade

| Responsabilidade | Implementações | Consistente? |
|---|---|---|
| Mapeamento domínio↔linha | `src/core/mappers/canonical-mapper.ts:438-504`, `cloudflare/canonical-mapper.ts:106-188` | **Não** — fork; ambos perdem `notification_delivery_date` |
| Persistência Supabase | `src/server/db/case-repository.ts:125` (write), `:83` (read) | **Não** — mesma perda, 4º ponto |
| Análise jurídica | `ExpertRuleEngine.evaluate` (canônico), `RagPipeline.analyzeInfraction` (filtro), `cloudflare/rag-adapter.ts:237` (adapter) | **Não** — 3 comportamento de filtro diferentes |
| Filtro de evidência | `rag-pipeline.ts:180-205` só | **Não** — 2 de 3 runtimes não aplicam |
| Elegibilidade de tese | `infraction-classifier.ts:170-178` (declarada), `rule-engine.ts:694` (ignorada), `ai-orchestrator.ts:265` (só existência) | **Não** — 3definition, 1 nunca aplicada |
| Cálculo de taxa | `rule-engine.ts:913-963` | **Sim** (1 implementação) — o problema é o foundation, não a duplicação |
| Mapeamento de input de regra | `data-lineage.ts:306`, `final-quality-gate.ts:537` | **Não** — cópias idênticas |
| Catálogo de teses | `arguments-catalog.ts` (canônico), `knowledge-base.ts:407-432` (deprecated) | **Não** — `applicabilityNote` diverge |
| Serialização de documento | `src/lib/mappers/case-mappers.ts:143-145`, `cloudflare/rag-adapter.ts:397-417` | **Não** — o segundo tem fallback real, o primeiro fabrica ARG-001 |
| Autoria do `analysis` | `ExpertRuleEngine` + `RagPipeline` + `cloudflare/rag-adapter` + `rule-engine` fallback `:916-930` | **Não** — 4 caminhos de fallback |

### Visão 4 — Por risco

#### CRÍTICO (corrompe dado ou resultado exibido)
1. **D-01** — anônimo no Express: 404, caso nunca persistido, funil gratuito perdido.
2. **D-02** — taxa e teses trocam na frente do usuário no momento do save.
3. **D-03** — ARG-049 (nulidade por dupla notificação) em todo caso com expedição preenchida.
4. **D-04** — `notification_delivery_date` nunca persistido: o bug D-03 é irreversível após o save.
5. **D-05** — elegibilidade declarada e nunca aplicada: teses inelegíveis são autorizadas e escritas na peça.

#### ALTO (impede a boa e divergem do exibido)
6. **D-06** — alias quebrado nos mapas de pontuação (ARG-001 nunca recebe evidência forte).
7. **D-07** — completude medida contra campos fantasma (ratio nunca passa de ~60%).
8. **D-08** — filtro de evidência só no Express.
9. **D-09** — 4 namespaces de `evidenceFlags`.
10. **D-10** — harness de certificação não exercita os campos que decidem as teses.
11. **D-11** — documento afirma ARG-001 sem análise que o produza.
12. **D-12** — `overallSuccessRate: 50` fabricado alimenta a peça de IA.
13. **D-13** — ARG-051 inalcançável no fluxo padrão.
14. **D-14** — taxa sem lastro exibida como probabilidade.
15. **D-15** — "4 Pontos" em infração de 0 pontos.
16. **D-16** — data de aferição nunca exibida.
17. **D-17** — resolução CONTRAN nunca exibida.

#### MÉDIO (duas fontes divergentes)
18. **D-18** — `PUT` sobrescreve a linha inteira.
19. **D-19** — re-derivação a partir de infração já truncada.
20. **D-20** — falha da KB salva como caso analisado com 0 teses.
21. **D-21** — regra estéril com falso PASS.
22. **D-22** — teses inalcançáveis no catálogo.
23. **D-23** — `LEGAL_ARGUMENTS` divergente.
24. **D-24** — `mapRuleInputToField` duplicado.
25. **D-25** — `domainToRow` fork.
26. **D-26** — `recommendedProcedure` sobrescrito sem `resolveProcedure`.
27. **D-27** — semântica divergente de `autuadorBody`.

#### BAIXO (consistência, sem efeito no resultado)
28. **D-28** — comentários desatualizados.
29. **D-29** — lista hardcoded com duplicata.
30. **D-30** — `severity`/`points`/`fineAmount` com 3 origens.

---

## 4. Detalhamento dos achados principais

### D-01 — `/api/cases/anonymous` só existe no Cloudflare Worker

O frontend decide o destino por autenticação:

```ts
// src/components/onboarding/OnboardingWizard.tsx:416
const res = await authFetch(isAuthenticated ? '/api/cases' : '/api/cases/anonymous', {
```

Rotas disponíveis no Express (`src/server/routes/cases.ts`):

```
:51   GET    /cases
:73   GET    /cases/:id
:114  POST   /cases              ← exige authenticateToken
:196  PUT    /cases/:id
:229  DELETE /cases/:id
:285  POST   /cases/:id/claim
:337  POST   /cases/:id/generate-defense
```

`src/server/app.ts:103` monta `app.use('/api', casesRoutes)`. **Não existe `/cases/anonymous`.**

A rota anônima existe apenas em `cloudflare/routes/cases.ts:46`, com rate limit por IP, geração de `claimToken` e `is_anonymous: true`.

**Impacto:** no deploy Express, o POST do usuário anônimo devolve 404. `data.id` é `undefined` → `savedCaseId` nunca é setado (`OnboardingWizard.tsx:437`), `claimToken` nunca emitido, `emitCasesChanged()` nunca dispara. O caso existe só na memória do navegador. Se o usuário fechar a aba, perde tudo — e o `saveWizardState` de `OnboardingWizard.tsx:468` grava `savedCaseId: undefined`.

O usuário **anônimo é o usuário do(funil gratuito**, justamente o produto de aquisição.

### D-03 — ARG-049 é disparado por construção

```ts
// src/core/rules/rule-engine.ts:847-849
const hasDualNotificationViolation =
  context.notificationExpeditionDate &&
  !context.notificationDeliveryDate;
```

O comentário em `:843-846` descreve "Notificação de Autuação expedida MAS não entregue" como violação real da dupla notificação. Mas:

- `notificationDeliveryDate` **nunca é coletado** — 0 ocorrências em `src/components/`. O formulário só pede `notificationExpeditionDate` (`InfractionIdentificationStep.tsx:445`).
- `notificationDeliveryDate` **nunca é persistido** (D-04) — mesmo que o usuário informasse, desapareceria.

Consequência: **qualquer caso com data de expedição preenchida recebe ARG-049**, tesa de nulidade por ausência de dupla notificação, com `severity: 'alta'`, `impact: 'Nulidade do processo por ausência de dupla notificação'`, `statutoryBasis: 'Art. 5º, LIV e LV da CF/88 c/c Súmula 312 do STJ'` (`rule-engine.ts:868-874`).

Esse `impact` é falso: a Notificação de Autuação é entregue **junto** com a penalidade na notificação única. A ausência da data de entrega na tela do usuário não é um fato.

**Efeito na taxa:** ARG-049 não está no ladder de `baseScore` (`rule-engine.ts:917-936`), então cai em `min(90, 50 + 15×n)`. Com ARG-049 como única inconsistência: base 65. Sem nenhuma inconsistência real: base 35. A tese inflada **e** o score inflado vêm do mesmo fato (a ausência de um dado).

**Efeito no documento:** ARG-049 é `category: 'constitucional'`, `confidenceScore` alto. Entra na peça jurídica como nulidade processual.

O `runCausalidadeCheck` (`final-quality-gate.ts:262-296`) não pega: ele pula inputs `undefined`/`null`/`''` (linha 270) — exatamente o caso do `notificationDeliveryDate` ausente.

### D-05 — A elegibilidade é declarada e nunca aplicada

```ts
// src/core/rules/rule-engine.ts:694
const eligible = new Set(classification.eligibleArgumentIds);
```

`eligible` não é lido em lugar nenhum. O filtro real é:

```ts
// src/core/rules/rule-engine.ts:745-746
const families = (rule as any).families as string[] | undefined;
const applicable = !families || families.includes(classification.family);
```

Ou seja: a elegibilidade da **família** filtra; a elegibilidade da **tese** não.

`isArgumentEligible` (`infraction-classifier.ts:254`) — a função escrita exatamente para isso — está exportada e sem nenhum import.

E a cadeia de autorização não cobre:

```ts
// src/core/ai/ai-orchestrator.ts:265-268
export function permittedTheses(analysis: CaseAnalysis): LegalArgumentDomain[] {
  const canonicalIds = new Set(ARGUMENTS_CATALOG.map((argument) => argument.id));
  return (analysis.recommendedArguments ?? []).filter((argument) => canonicalIds.has(argument.id));
}
```

"Existe no catálogo" é o único critério. Uma tese inelegível para a família passa.

**Comprovação:** `ARG-005` (erro de enquadramento por velocidade considerada) é produzido por `RULE_INMETRO_CONSIDERED_SPEED_ERROR` (`rule-engine.ts:273-330`, `families: ['excesso_velocidade']`, `legalArgumentId: 'ARG-005'` na linha 324). Mas `ARG-005` **não aparece em nenhum `recommendedArgumentCodes`** do catálogo (verificação exaustiva das 22 listas em `knowledge-base.ts`). O mesmo vale para `ARG-006` (produzido em `rule-engine.ts:381`).

A análise resultante afirma: `eligibleArgumentIds` não contém ARG-005/ARG-006, e `recommendedArguments` contém ARG-005/ARG-006. Dois objetos contraditórios no mesmo payload.

### D-07 — A completude é medida contra campos que não existem

Contexto do motor (`rule-engine.ts:699-728`) — 26 chaves. Nenhuma delas é `dateTime`, `plate`, `location`, `inmetroAferitionDate`, `hasVideoProof` ou `bafometerResult`.

Mapas de completude (`rule-engine.ts:1026-1063` e `:1065-1103`) — todas as 6 famílias pedem `dateTime`, `plate`, `location`; `alcoolemia` pede também `hasVideoProof` e `bafometerResult`; `velocidade` pede `inmetroAferitionDate`.

`countFilledRelevantFields` (`:1099-1103`) lê `context[f]` → `undefined` para todas essas chaves.

**Mínimo de 3 campos sempre vazios**, mais 1-3 específicos. O `completenessRatio` máximo em qualquer família é `(total-3)/total`.

Para `velocidade` (14 campos): máximo real 11/14 = 79% → `completenessBonus` máximo 8, não 10. Para `alcoolemia` (15 campos): máximo 10/15 = 67% → bônus 7.

A tela exibe isso como "X% completo" (`FreeAnalysisResultStep.tsx:253`) e usa `ratio < 75` para acionar `showImprovementMessage` (`:199`).

`missingCriticalFields` (`rule-engine.ts:1128-1160`) lê `context[f.field]` com os mesmos nomes — então "Resultado do bafômetro" e "Vídeo da abordagem" são **sempre** reportados como faltantes em `alcoolemia`/`semaforo`/`celular`, e nunca são coletáveis.

### D-13 — ARG-051: catalogado, elegível, inalcançável

Cadeia verificada ponta a ponta:

| Etapa | Estado | file:line |
|---|---|---|
| Tese no catálogo | ✅ ARG-051, `confidenceScore: 99` | `arguments-catalog.ts:1266` |
| Recomendada para 745-50 (severity `media`) | ✅ | `knowledge-base.ts:42` |
| Elegível para a família | ✅ | `infraction-classifier.ts:170-178` |
| Regra existe | ✅ `RULE_CONVERSAO_ADVERTENCIA_267` | `rule-engine.ts:123-158` |
| Requisito `hasPreviousInfractionsLast12Months` | ✅ existe no tipo | `types/index.ts:77` |
| **Coletado no wizard** | ❌ **só em `category === 'conversao_advertencia'`** | `SpecificInfractionDataStep.tsx:476-500` |
| **Sobrevive à rota Cloudflare** | ❌ **descartado na redução** | `cloudflare/routes/cases.ts:74-96` |
| Resultado | **ARG-051 nunca sai da análise no fluxo padrão** | |

E há um agravante de simetria: o checkbox de não-reincidência grava `hasPreviousInfractionsLast12Months: false` quando marcado e `true` quando desmarcado (`SpecificInfractionDataStep.tsx:492`). O motor exige `=== false` (`rule-engine.ts:144`). Desmarcar grava `true` → a regra retorna `null` (não-vício), e o dado **conta como preenchido** → o `requiredData` passa, a regra avalia, e não conclui. Estado intermediário, correto por construção, mas não documentado.

### D-15 — "4 Pontos" em infração de 0 pontos

```tsx
// src/components/onboarding/steps/FreeAnalysisResultStep.tsx:318
<p className="text-base text-amber-700 font-semibold">{infractionData.points || 4} Pontos na CNH</p>
```

`OnboardingWizard.tsx:353-357` define `lei_seca` com `points: 0`. `0 || 4` → `4`.

O usuário que recusou o bafômetro (gravíssima, 0 pontos) lê **"4 Pontos na CNH"** na tela de resultado, imediatamente abaixo do texto que pede a anulação. O valor real está a um `??` de distância.

O mesmo padrão `||` aparece no mapper: `canonical-mapper.ts:464-466` — `speed_limit: infraction.speedLimit || infraction.velocidadePermitida`. `measuredSpeed: 0` cairia no legado.

---

## 5. TOP 12

| # | ID | Sev. | Arquivo:linha | Resumo |
|---|---|---|---|---|
| 1 | **D-01** | CRÍTICO | `src/components/onboarding/OnboardingWizard.tsx:416` · `src/server/routes/cases.ts:51-337` · `cloudflare/routes/cases.ts:46` | Frontend chama `POST /api/cases/anonymous`; a rota só existe no Cloudflare Worker — no Express o caso anônimo dá 404 e nunca é persistido. |
| 2 | **D-02** | CRÍTICO | `src/components/onboarding/OnboardingWizard.tsx:450` · `cloudflare/routes/cases.ts:74-96` | A análise do servidor (17 campos) substitui a do cliente (dados completos) na tela: a taxa cai ~30 pontos e teses somem no momento do save. |
| 3 | **D-03** | CRÍTICO | `src/core/rules/rule-engine.ts:847-849` | ARG-049 (nulidade por dupla notificação) dispara sempre que há data de expedição — e a data de entrega nunca é coletada, logo é sempre "faltante". |
| 4 | **D-05** | CRÍTICO | `src/core/rules/rule-engine.ts:694` · `src/core/rules/infraction-classifier.ts:254` · `src/core/ai/ai-orchestrator.ts:265-268` | `eligibleArgumentIds` é calculado e nunca aplicado; `permittedTheses` só checa existência no catálogo — teses inelegíveis são autorizadas e redigidas. |
| 5 | **D-04** | CRÍTICO | `supabase/migrations/20260925120000_fase_12_2_add_missing_case_columns.sql:16` · `src/core/mappers/canonical-mapper.ts:438-504` · `src/server/db/case-repository.ts:83,125` | `notification_delivery_date` existe no banco mas é descartado em 3 escritas e 1 leitura — torna o falso positivo de ARG-049 irreversível após o save. |
| 6 | **D-06** | ALTO | `src/core/rules/rule-engine.ts:713` vs `:1026-1063` e `:1110` | O contexto usa `radarCalibrationDate`; os mapas de pontuação leem `inmetroAferitionDate` — ARG-001 nunca recebe o bônus de evidência forte (+3). |
| 7 | **D-13** | ALTO | `src/core/rules/rule-engine.ts:123-158` · `src/components/onboarding/steps/SpecificInfractionDataStep.tsx:476-500` | ARG-051 é catalogado, elegível e tem regra, mas o dado exigido só é coletado na categoria `conversao_advertencia` — nunca no fluxo padrão. |
| 8 | **D-07** | ALTO | `src/core/rules/rule-engine.ts:1026-1103` | Completude medida contra `dateTime`/`plate`/`location`/`hasVideoProof`/`bafometerResult`, que não existem no contexto: ratio nunca passa de ~60% e a UI pede campos não coletáveis. |
| 9 | **D-10** | ALTO | `src/lib/mappers/case-mappers.ts:83-100` · `src/server/services/e2e-test-runner-service.ts:16` | O harness E2E e a tela de integridade admin usam um mapper que descarta 17 campos — a certificação não exercita radar, decadência, foto nem evidências. |
| 10 | **D-11** | ALTO | `src/lib/mappers/case-mappers.ts:143-145` | Sem teses na análise, o documento recebe `['ARG-001']` como fallback — a peça afirma radar fora de aferição que a análise não produziu. |
| 11 | **D-08** | ALTO | `src/core/rag/rag-pipeline.ts:20-24,180-205` · `src/components/onboarding/steps/AnalysisProcessingStep.tsx:49` · `cloudflare/rag-adapter.ts:228-236` | O filtro de evidência (ARG-012/019/020) só roda no Express; cliente e Cloudflare não aplicam — a mesma infração produz teses diferentes por runtime. |
| 12 | **D-15** | ALTO | `src/components/onboarding/steps/FreeAnalysisResultStep.tsx:318` | `points || 4` mostra "4 Pontos na CNH" em infração de 0 pontos (recusa ao bafômetro, gravíssima). |

---

## 6. Encaminhamento sugerido

| Achado | Ação | Destino |
|---|---|---|
| D-01 | Mover `POST /cases/anonymous` para `src/server/routes/cases.ts` (mesmo contrato do adapter: rate limit, `claimToken`, `is_anonymous`) | Backend Architect |
| D-03 + D-04 | Excluir `notificationDeliveryDate` da condição de ARG-049 **ou** coletá-lo e persistí-lo (3 pontos de escrita + 1 de leitura); enquanto não persistido, a condição nunca deve ser satisfeita | Backend Architect + Frontend Developer |
| D-05 | Consumir `eligible` em `rule-engine.ts:694` (filtrar `recommendedArgs` por elegibilidade) e trocar `permittedTheses` para filtrar por `eligibleArgumentIds` | Backend Architect |
| D-02 | Unificar: o cliente envia `infractionData`; o servidor analisa **o mesmo objeto** que a tela mostra — ou a tela deixa de re-analisar e mostra a resposta do servidor | Backend Architect + Frontend Developer |
| D-06, D-16, D-17 | Um único mapa de alias por domínio, exportado de um lugar, consumido pelo motor, pelos validadores e pela UI | Backend Architect + Frontend Developer |
| D-13 | Coletar `hasPreviousInfractionsLast12Months` em todas as famílias leve/média (ou derivá-lo do prontuário), e preservá-lo na redução da rota Cloudflare | Frontend Developer |
| D-14 | Renomear a métrica para "indicador técnico" e remover "probabilidade de êxito" da UI, ou abandonar o número | Product + Frontend Developer |
| D-10 | Fazer o harness E2E usar o mesmo caminho de análise da produção (`RagPipeline.analyzeInfraction` com a infração completa) | QA / Testing |
| D-11, D-12 | Remover fallbacks que fabricam tese (`['ARG-001']`) e taxa (`50`) — falhar explícito é preferível a fabricar | Backend Architect |
| D-18, D-25 | Unificar `domainToRow` em um módulo, importado pelos dois runtimes | Backend Architect |

**Sequenciamento sugerido:** D-01 e D-03 primeiro (bloqueiam o funil e corrompem tese jurídica). D-05 e D-02 em seguida (restauram a coerência entre classificação, motor e tela). D-06/D-07/D-13/D-14 depois (corrigem a métrica e a alcançabilidade). O restante em lote de limpeza.

---

*Auditoria somente leitura. Nenhum arquivo do repositório foi modificado; nenhum branch, PR ou commit foi criado.*
