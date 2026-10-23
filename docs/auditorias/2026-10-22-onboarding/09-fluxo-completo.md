# Relatório — Frente C: Auditoria do Fluxo Completo e Textos (7 Etapas × 7 Procedimentos)

**Projeto:** DefesAi / AdeusMultas  
**Repositório:** `Tokenizaa/AdeusMultas-Defesa-`  
**Branch:** `main` — **SHA:** `cd16284`  
**Data:** 23/10/2026  
**Infraestrutura reutilizada:** `tests/e2e-reconstruction/text-audit-runner.ts`, `text-capture.ts`, `text-validators.ts`, `text-audit-types.ts`

---

## 0. Resumo Executivo

Esta frente audita o fluxo ponta a ponta do onboarding para os 7 procedimentos, verificando a coerência entre textos renderizados, dados informados, regras acionadas e documento final.

**Resultado:** A infraestrutura de auditoria de texto está **implementada e funcional** (captura de texto por etapa, validadores de coerência input→API→UI→persistido, detecção de padrões proibidos). No entanto, **nenhum cenário do fluxo completo pôde ser executado** devido à ausência de ambiente E2E configurado (`PLAYWRIGHT_BASE_URL` e `E2E_ALLOW_PERSISTENT_WRITES` não definidos).

**Bloqueio:** Todos os 28 cenários de referência estão marcados como `executable: false`. A execução E2E requer autorização explícita do usuário para rodar contra uma URL real, conforme as regras do `AGENTS.md`.

---

## 1. Infraestrutura de Auditoria de Texto

### 1.1 Arquivos da Infraestrutura

| Arquivo | Função |
|---------|--------|
| `text-audit-runner.ts` | Orquestrador: executa fluxo completo (entrada → API → UI → documento), captura evidências, gera relatórios JSON + HTML |
| `text-capture.ts` | Captura textos renderizados no DOM por etapa (7 etapas) |
| `text-validators.ts` | Validadores de coerência: `validateInputVsApi`, `validateApiVsRendered`, `validateRenderedVsPersisted`, `checkForbiddenPatterns`, `runFullComparison` |
| `text-audit-types.ts` | Tipos: `FullRenderedText` (7 etapas), `PersistedDocumentEvidence`, `TextAuditEvidence`, `ComparisonResult`, `ForbiddenPatternRule` |
| `defesa_previa.spec.ts` | Exemplo de spec E2E que usa `runTextAudit` (cenários 11 e 12) |

### 1.2 Sete Etapas Mapeadas (conforme `text-audit-types.ts`)

| Etapa | Componente | Textos capturados |
|-------|-----------|-------------------|
| 1 — Identificação | `InfractionIdentificationStep` | labels, valores, texto do botão, helperTexts |
| 2 — Perguntas específicas | `SpecificInfractionDataStep` | categoryBanner, questões, respostas, botão, helpers |
| 3 — Processamento | `AnalysisProcessingStep` | headerTitle, headerDescription, estágios, progressPercentage |
| 4 — Resultado da análise | `FreeAnalysisResultStep` | header (AIT, placa), strengthIndicator, summaryCards (título, base legal, o que verificamos, lei explica, evidenceResult, userImpact, confidenceLevel), nextSteps, CTAs |
| 5 — Qualificação | `RequiredDataStep` | bannerText, preservedData, formLabels, formValues, botão |
| 6 — Revisão | `DocumentReviewStep` | header, seções (enquadramento, tesesInclusas, evidenciasNecessarias, qualificação), guaranteeBadge, botões |
| 7 — Checkout | `DocumentCheckoutStep` | header, orderSummary, paymentMethodTabs, pixSection, creditCardSection, backButton |

### 1.3 Validadores Implementados

| Validador | Compara | Severidades |
|-----------|---------|-------------|
| `validateInputVsApi` | Entrada sintética → Resposta da API | error, warning |
| `validateApiVsRendered` | API → UI renderizada | error, warning |
| `validateRenderedVsPersisted` | UI → Documento persistido | error |
| `checkForbiddenPatterns` | Todos os textos renderizados | error (5 padrões proibidos) |
| `runFullComparison` | Agregador de todos os validadores | error, warning, blocked |

### 1.4 Padrões Proibidos Detectados (conforme `text-audit-types.ts`)

| Padrão | Descrição | Severidade |
|--------|-----------|------------|
| `probabilidade de êxito` | Promessa de resultado como garantia | error |
| `cancelamento garantido` / `multa será cancelada` | Afirmação categórica de cancelamento | error |
| `consultamos jurisprudência em tempo real` | Alegação de operação que não ocorre | error |
| `100% preservado` / `x% de êxito` | Claims removidos na Onda 4 | error |
| `[object Object]` / `undefined` / `null` | Valores técnicos vazados na UI | error |

---

## 2. Cobertura por Procedimento

| Procedimento | Cenários definidos | Executável? | Bloqueado por |
|-------------|-------------------|-------------|---------------|
| `defesa_previa` | 4 (completos, dados_ausentes, evidencias_contraditorias, sem_tese_defensiva) | Não | PLAYWRIGHT_BASE_URL + E2E_ALLOW_PERSISTENT_WRITES |
| `recurso_jari` | 4 | Não | PLAYWRIGHT_BASE_URL + E2E_ALLOW_PERSISTENT_WRITES |
| `recurso_cetran` | 4 | Não | PLAYWRIGHT_BASE_URL + E2E_ALLOW_PERSISTENT_WRITES |
| `suspensao_cnh` | 4 | Não | PLAYWRIGHT_BASE_URL + E2E_ALLOW_PERSISTENT_WRITES |
| `cassacao_cnh` | 4 | Não | PLAYWRIGHT_BASE_URL + E2E_ALLOW_PERSISTENT_WRITES |
| `indicacao_condutor` | 4 | Não | PLAYWRIGHT_BASE_URL + E2E_ALLOW_PERSISTENT_WRITES |
| `conversao_advertencia` | 4 | Não | PLAYWRIGHT_BASE_URL + E2E_ALLOW_PERSISTENT_WRITES |
| **Total** | **28** | **0 executados** | **28 bloqueados** |

---

## 3. O que a Infraestrutura Poderia Verificar (quando executada)

Para cada cenário, a auditoria de fluxo completo verificaria:

1. **Textos renderizados nas 7 etapas** — captura real do DOM, não strings no código-fonte
2. **Coerência entrada → API → UI** — serviceType, dataGaps, overallSuccessRate, recommendedArguments, nextSteps, dataCompleteness
3. **Tratamento de campos ausentes** — DATA_GAP vs vício presumido (FAIL CLOSED no motor)
4. **Correspondência tese → fatos** — cada card de tese deve corresponder a um `recommendedArgument` da API
5. **Resultado da pré-análise** — overallSuccessRate, strengthIndicator, summaryReasoning
6. **Conteúdo persistido** — `validateRenderedVsPersisted` compara UI com `defenseDraft` (selectedArgumentIds, finalDraft, canonicalDraft, qualityGateReport)
7. **Documento final** — textos do documento gerado vs textos renderizados na UI
8. **Divergências UI ↔ persistido ↔ documento** — cada divergência registrada como defeito

---

## 4. Bloqueios Identificados

| # | Bloqueio | Severidade | Detalhe |
|---|----------|-----------|---------|
| 1 | `PLAYWRIGHT_BASE_URL` não definido | Alta | `tests/e2e-reconstruction/support.ts` linha 4-6 lança erro se ausente; `playwright.config.ts` linha 4-5 lança erro se ausente ou inválido |
| 2 | `E2E_ALLOW_PERSISTENT_WRITES` não definido | Alta | `createCaseThroughAnalysis` (support.ts linha 40) exige `=== 'true'` para criar casos persistentes |
| 3 | Nenhum `.env` no repositório | Média | Não há arquivo `.env` com as variáveis configuradas |
| 4 | Execução contra produção não autorizada | Alta | Requer autorização explícita do usuário; regras do AGENTS.md proíbem operações financeiras reais e deploy sem autorização |

---

## 5. Comandos Prontos para Execução Autorizada

Quando o ambiente for autorizado:

```bash
# 1. Definir variáveis (valores a serem fornecidos por quem autoriza)
export PLAYWRIGHT_BASE_URL="https://<ambiente-homologacao>"
export E2E_ALLOW_PERSISTENT_WRITES=true
export E2E_TEST_RUN_ID="frente-c-20261023"

# 2. Instalar dependências e browsers
npm ci
npx playwright install --with-deps chromium

# 3. Executar suíte E2E completa
npx playwright test

# 4. Executar por procedimento (exemplo)
npx playwright test tests/e2e-reconstruction/defesa_previa.spec.ts
npx playwright test tests/e2e-reconstruction/recurso_jari.spec.ts

# 5. Ver relatório HTML
npx playwright show-report artifacts/e2e-report
```

**Notas:**
- `playwright.config.ts`: `workers: 1`, `fullyParallel: false`, `retries: 0` — execução serial, sem retry
- Artefatos de falha (trace, screenshot): `artifacts/e2e-results/`
- Relatório HTML: `artifacts/e2e-report/`
- Cada spec cria casos persistentes via `POST /api/cases/anonymous` — exige `E2E_ALLOW_PERSISTENT_WRITES=true`
- Nenhuma cobrança real é feita (teste de pagamento espera `401` sem autenticação)

---

## 6. Conclusão

**A infraestrutura de auditoria de fluxo completo está implementada e pronta para uso.** No entanto, **nenhum cenário pôde ser executado** devido à ausência de ambiente E2E configurado e à proibição de executar contra produção sem autorização explícita.

**Próximos passos:**
1. Usuário autoriza o ambiente E2E (URL + `E2E_ALLOW_PERSISTENT_WRITES=true`)
2. Executar os 28 cenários e registrar resultados por célula
3. Corrigir divergências encontradas (UI ↔ persistido ↔ documento final)
4. Reexecutar até 10 execuções consecutivas verdes

---

**Evidências:**
- `tests/e2e-reconstruction/text-audit-runner.ts` — orquestrador de auditoria
- `tests/e2e-reconstruction/text-capture.ts` — captura de texto por etapa
- `tests/e2e-reconstruction/text-validators.ts` — validadores de coerência
- `tests/e2e-reconstruction/text-audit-types.ts` — tipos e padrões proibidos
- `tests/e2e-reconstruction/support.ts` — pré-requisitos (PLAYWRIGHT_BASE_URL, E2E_ALLOW_PERSISTENT_WRITES)
- `tests/e2e-reconstruction/defesa_previa.spec.ts` — exemplo de uso (cenários 11 e 12)
- `playwright.config.ts` — configuração Playwright
