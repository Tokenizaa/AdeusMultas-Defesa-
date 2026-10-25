# Relatório de Bloqueio E2E — Certificação do Onboarding

**Data:** 24/10/2026  
**SHA de referência:** `3dce0d5`  
**Missão:** Reconciliar roadmap e concluir caminho até produção  

---

## 1. Resumo do Bloqueio

A infraestrutura de auditoria textual do onboarding está **100% implementada e funcional**, mas **nenhum dos 28 cenários de referência pôde ser executado** devido à ausência de ambiente E2E configurado e autorizado.

---

## 2. Variáveis de Ambiente Obrigatórias

| Variável | Valor Necessário | Status | Onde Definir |
|---|---|---|---|
| `PLAYWRIGHT_BASE_URL` | URL de homologação (ex: `https://homologacao.defesai.com.br`) | **NÃO DEFINIDA** | CI secrets / `.env.local` / runner environment |
| `E2E_ALLOW_PERSISTENT_WRITES` | `true` (string literal) | **NÃO DEFINIDA** | CI secrets / `.env.local` / runner environment |
| `E2E_TEST_RUN_ID` | Identificador único por execução (ex: `frente-c-20261024`) | Opcional (tem default) | CI secrets / runner environment |

---

## 3. Código que Exige Estas Variáveis

### `tests/e2e-reconstruction/support.ts` (linhas 4-8)
```typescript
const configuredBaseURL = process.env.PLAYWRIGHT_BASE_URL;
if (!configuredBaseURL) throw new Error('PLAYWRIGHT_BASE_URL ausente; localhost não é fallback.');
export const baseURL: string = configuredBaseURL;
if (!/^https?:\/\//i.test(baseURL)) throw new Error('PLAYWRIGHT_BASE_URL deve ser HTTP(S).');
```

### `tests/e2e-reconstruction/support.ts` (linha 40)
```typescript
if (process.env.E2E_ALLOW_PERSISTENT_WRITES !== 'true') 
  throw new Error('BLOCKED: E2E_ALLOW_PERSISTENT_WRITES=true é obrigatório antes de criar casos persistentes.');
```

### `playwright.config.ts` (linhas 4-6)
```typescript
const baseURL = process.env.PLAYWRIGHT_BASE_URL;
if (!baseURL) throw new Error('PLAYWRIGHT_BASE_URL is required');
```

---

## 4. Por Que Não Usar Produção

### Regra do `AGENTS.md`:
> "Não rode uma bateria contra produção sem autorização explícita, sem pagamentos reais desabilitados e sem identificar o impacto de escrita no banco."

### Restrições da `E2E-CERTIFICACAO-CANONICA.md`:
> "Execução contra URL de produção autorizada: https://adeusmulta.defesai.com.br/  
> - A execução da bateria E2E contra a URL de produção é **permitida** como alvo de validação, desde que:  
>   1. **Pagamentos reais permaneçam bloqueados** (usar sandbox/test adapter do VenoPag/Stripe)  
>   2. **Dados sintéticos exclusivos** sejam usados (prefixo `E2E_` + `E2E_TEST_RUN_ID`)  
>   3. **Nenhuma limpeza destrutiva automática** seja executada  
>   4. **Verificações de banco** usem projeto Supabase de homologação/teste explicitamente configurado, não produção  
>   5. O relatório identifique explicitamente `environment: "production-url"` e o SHA testado"

---

## 5. O Que É Necessário Para Desbloquear

### Opção A: Ambiente de Homologação (Recomendado)
1. **URL de homologação** funcional e acessível
2. **Supabase de homologação** configurado (não produção)
3. **VenoPag sandbox/test mode** configurado
4. Variáveis definidas no runner/CI

### Opção B: Produção com Autorização Explícita
1. **Autorização por escrito** do usuário para rodar contra produção
2. Confirmação de que **pagamentos reais estão bloqueados** (sandbox ativo)
3. Confirmação de **Supabase de homologação** para verificações de persistência
4. Variáveis definidas + `E2E_ALLOW_PERSISTENT_WRITES=true`

---

## 6. Cenários Bloqueados (28 Total)

| Procedimento | Completos | Dados Ausentes | Evidências Contraditórias | Sem Tese Defensiva | Total |
|---|---|---|---|---|---|
| `defesa_previa` | AIT-REF-001 | AIT-REF-002 | AIT-REF-003 | AIT-REF-004 | 4 |
| `recurso_jari` | AIT-REF-005 | AIT-REF-011 | AIT-REF-017 | AIT-REF-018 | 4 |
| `recurso_cetran` | AIT-REF-006 | AIT-REF-012 | AIT-REF-019 | AIT-REF-020 | 4 |
| `suspensao_cnh` | AIT-REF-007 | AIT-REF-013 | AIT-REF-021 | AIT-REF-022 | 4 |
| `cassacao_cnh` | AIT-REF-008 | AIT-REF-014 | AIT-REF-023 | AIT-REF-024 | 4 |
| `indicacao_condutor` | AIT-REF-009 | AIT-REF-015 | AIT-REF-025 | AIT-REF-026 | 4 |
| `conversao_advertencia` | AIT-REF-010 | AIT-REF-016 | AIT-REF-027 | AIT-REF-028 | 4 |
| **TOTAL** | **7** | **7** | **7** | **7** | **28** |

**Todos marcados como `executable: false` com blocker: "PLAYWRIGHT_BASE_URL e E2E_ALLOW_PERSISTENT_WRITES não configurados."**

---

## 7. Infraestrutura Pronta (Não Precisa Ser Criada)

| Arquivo | Função | Status |
|---|---|---|
| `text-audit-runner.ts` | Orquestrador: executa fluxo completo, captura evidências, gera relatórios JSON+HTML | ✅ Implementado |
| `text-capture.ts` | Captura textos renderizados no DOM por etapa (7 etapas) | ✅ Implementado |
| `text-validators.ts` | Validadores: `validateInputVsApi`, `validateApiVsRendered`, `validateRenderedVsPersisted`, `checkForbiddenPatterns`, `runFullComparison` | ✅ Implementado |
| `text-audit-types.ts` | Tipos: `FullRenderedText` (7 etapas), `PersistedDocumentEvidence`, `TextAuditEvidence`, `ComparisonResult`, `ForbiddenPatternRule` | ✅ Implementado |
| `defesa_previa.spec.ts` | Exemplos de specs E2E usando `runTextAudit` (cenários 11 e 12) | ✅ Implementado |
| `recurso_jari.spec.ts`, `recurso_cetran.spec.ts`, `conversao_advertencia.spec.ts`, `indicacao_condutor.spec.ts`, `cassacao.spec.ts`, `suspensao.spec.ts` | Specs por procedimento (10 cenários canônicos cada) | ✅ Implementado |

---

## 8. Comandos Prontos para Execução (Quando Autorizado)

```bash
# 1. Definir variáveis (valores a serem fornecidos por quem autoriza)
export PLAYWRIGHT_BASE_URL="https://<ambiente-homologacao>"
export E2E_ALLOW_PERSISTENT_WRITES=true
export E2E_TEST_RUN_ID="frente-c-20261024"

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

**Configuração do Playwright (`playwright.config.ts`):**
- `workers: 1` (execução serial)
- `fullyParallel: false`
- `retries: 0` (sem retry)
- Artefatos de falha: `artifacts/e2e-results/`
- Relatório HTML: `artifacts/e2e-report/`

---

## 9. O Que a Auditoria Verificará (Quando Executada)

Para cada um dos 28 cenários:

1. **Textos renderizados nas 7 etapas** — captura real do DOM
2. **Coerência entrada → API → UI** — serviceType, dataGaps, overallSuccessRate, recommendedArguments, nextSteps, dataCompleteness
3. **Tratamento de campos ausentes** — DATA_GAP vs vício presumido (FAIL CLOSED no motor)
4. **Correspondência tese → fatos** — cada card de tese corresponde a um `recommendedArgument` da API
5. **Resultado da pré-análise** — overallSuccessRate, strengthIndicator, summaryReasoning
6. **Conteúdo persistido** — `validateRenderedVsPersisted` compara UI com `defenseDraft` (selectedArgumentIds, finalDraft, canonicalDraft, qualityGateReport)
7. **Documento final** — textos do documento gerado vs textos renderizados na UI
8. **Divergências UI ↔ persistido ↔ documento** — cada divergência registrada como defeito
9. **Padrões proibidos** — 5 patterns detectados automaticamente (promessa de êxito, cancelamento garantido, jurisprudência tempo real, claims removidos, valores técnicos vazados)

---

## 10. Critério de Desbloqueio

**O bloqueio só será removido quando:**
1. Usuário autorizar explicitamente o ambiente (homologação OU produção com condições)
2. Variáveis `PLAYWRIGHT_BASE_URL` e `E2E_ALLOW_PERSISTENT_WRITES=true` forem definidas
3. Supabase de homologação confirmado para verificações de persistência
4. Pagamentos reais confirmados como bloqueados (sandbox)

**Sem autorização explícita, não há workaround técnico.** A arquitetura exige ambiente real para validar a cadeia: ENTRADA → API → REGRAS → ANÁLISE → INTERFACE → PERSISTÊNCIA → MINUTA.

---

## 11. Impacto no Roadmap

| Item Roadmap | Status | Dependência |
|---|---|---|
| 1.7 Execução E2E 28 cenários | `BLOQUEADO` | Este bloqueio |
| 1.8 Auditoria fluxo completo | `BLOQUEADO` | Este bloqueio |
| 1.10 Deploy para produção | `BLOQUEADO` | Requer 1.7+1.8 concluídos + revisão jurídica |

---

*Este documento deve ser apresentado a quem pode autorizar o ambiente E2E. Sem autorização, a certificação textual do onboarding não pode prosseguir.*