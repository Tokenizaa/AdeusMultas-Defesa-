# Inventário Canônico — FASE E2E Massiva de Documentos

**Data:** 2026-09-07
**Método:** análise de código (src/core/onboarding/rules-matrix.ts, src/core/procedures/procedures-catalog.ts, src/core/documents/document-assembly-engine.ts, src/core/rules/rule-engine.ts, server.ts, src/server/routes/cases.ts, payments.ts)
**Github issue/audit:** FASE E2E MASSIVO DE DOCUMENTOS + AUDITORIA DE QUALIDADE

---

## 1. Matriz de seleção da UI (tipos → subtipos → categorias)

Fonte: `USER_SITUATIONS` + `USER_PROCESS_STAGES` + `INFRACTION_CATEGORIES` em `src/core/onboarding/rules-matrix.ts` e navegação `OnboardingWizard.tsx`.

```json
{
  "caseTypes": [
    {
      "id": "multa_transito",
      "name": "Multa de Trânsito",
      "subtypes": [
        { "id": "primeira_notificacao", "name": "Defesa Prévia (Notificação de Autuação)" },
        { "id": "notificacao_penalidade", "name": "Recurso JARI (Notificação de Imposição de Penalidade)" },
        { "id": "defesa_negada", "name": "Recurso JARI pós indeferimento da defesa prévia" },
        { "id": "recurso_jari_negado", "name": "Recurso CETRAN (2ª instância)" },
        { "id": "nao_tenho_certeza", "name": "Diagnóstico automático" }
      ],
      "categories": ["excesso_velocidade", "lei_seca", "celular", "vermelho", "estacionamento", "cnh_geral", "outro"]
    },
    {
      "id": "conversao_advertencia",
      "name": "Conversão em Advertência",
      "subtypes": [{ "id": "conversao_advertencia", "name": "Conversão por escrito (Art. 267 CTB)" }]
    },
    {
      "id": "indicacao_condutor",
      "name": "Indicação de Real Condutor",
      "subtypes": [{ "id": "indicacao_condutor", "name": "FARI / FICI (Art. 257 §7º CTB)" }]
    },
    {
      "id": "suspensao_cnh",
      "name": "Suspensão da CNH / Lei Seca",
      "subtypes": [{ "id": "suspensao_cnh", "name": "Defesa PSDD por pontos / infração autossuspensiva" }]
    },
    {
      "id": "cassacao_cnh",
      "name": "Cassação da CNH (PCDD)",
      "subtypes": [{ "id": "cassacao_cnh", "name": "Defesa PCDD por dirigir com CNH suspensa" }]
    }
  ]
}
```

## 2. Templates canônicos (documentos realmente montáveis)

Fonte: `src/core/templates/templates-catalog.ts` — 9 templates com `procedureType`:

| Template | procedureType |
|----------|---------------|
| TPL_RECURSO_JARI | recurso_jari |
| TPL_RECURSO_CETRAN | recurso_cetran |
| TPL_PSDD_SUSPENSAO | processo_suspensao |
| TPL_PCDD_CASSACAO | processo_cassacao |
| TPL_FICI_INDICACAO | indicacao_condutor |
| TPL_CONVERSAO_ADVERTENCIA | conversao_advertencia |
| TPL_DEFESA_PREVIA | defesa_previa |
| TPL_SUSPENSAO_CNH | suspensao_cnh |
| TPL_CASSACAO_CNH | cassacao_cnh |

`analise_tecnica` e `relatorio_pericial` NÃO têm template (KNOWLEDGE_GAP no catálogo).

## 3. procedureType REAL da geração (fonte da verdade do engine)

Fonte: `src/core/rules/rule-engine.ts` (linhas ~636-642) + `src/server/routes/cases.ts` generate-defense (linha 363).

**O documento gerado NÃO usa o serviceType selecionado na UI.** Ele usa:

```
canonicalProcedure = canonicalAnalysis.recommendedProcedure || domain.serviceType || 'recurso_jari'
```

E `recommendedProcedure` do `ExpertRuleEngine.evaluate` é determinístico:

| Condição | recommendedProcedure |
|----------|---------------------|
| infractionCode `516-91` ou `747-10` | `suspensao_cnh` |
| ARG-051 detectado (infração leve/média + ficha limpa) | `conversao_advertencia` |
| qualquer outro | `recurso_jari` (default) |

**Implicação:** `recurso_cetran`, `defesa_previa`, `indicacao_condutor`, `cassacao_cnh`, `processo_suspensao`, `processo_cassacao` NÃO são recomendados pelo engine — só alcançáveis se `serviceType` da UI for usado (payments.ts:106 usa `domain.serviceType`!`).

## 4. Discrepância de geração entre entry points (ACHADO P0)

| Entry | POST /api/cases | simulate-payment / generate-defense | Persistência |
|-------|-----------------|--------------------------------------|--------------|
| `server.ts` (Node dev, dist/server.cjs) | handler inline → `casesStore` (Map memória) | busca em `caseRepository` (Supabase) → **não acha caso do casesStore** → fallback fake "Condutor Teste" | split de stores |
| `src/server/app.ts` (serverless/Vercel) | router → `caseRepository` (Supabase) | mesma instância → acha o caso | real |

**Evidência reproduzida em 2026-09-07 (dev local):**

- Wizard/API cria `case_8mph80mmtrlulir` com clientName "João Piloto" → `casesStore`
- `POST /api/payments/simulate-payment` (admin checkout) → `databaseRows.get(caseId)` → **undefined** → fallback fake
- Documento gerado (2935 chars) contém "Condutor Teste", CPF `123.456.789-09`, placa `ABC1D23` — **dados do caso do wizard PERDIDOS**
- Caso persistido no Supabase real (`d679f216-...`, app_ref `case_8mph80mmtrlulir`) como "Condutor Teste"
- `documentGenerationStatus: ready`, defenseDraft real

**Impacto P0:** qualquer fluxo pago via entry Node dev gera documento com identidade errada (cross-contamination real). O teste da bateria captura como FAIL determinístico de identidade.

## 5. Quantidade calculada dinamicamente

Cada combinação (tipo, subtipo) é uma "unidade de teste". O engine real reduz as combinações GERAÇÃO-RELEVANTES via recommendedProcedure conforme §3. A bateria testa a matriz completa da UI (§1) e audita o documento pelo que o produto REALMENTE gera (procedimento esperado pela análise do caso).

```
casos_por_subtipo = 5
total_casos = 5 × N_subtipos_UI
```

## 6. Supabase staging real (conexão validada)

- Projeto: `llmxnpgjpxcvyrqjkfwb` (Defesai-AdeusMultas), região sa-east-1, status ACTIVE_HEALTHY
- `e2e_test_runs`: id, status, started_at, completed_at, triggered_by, total_tests, passed_tests, failed_tests, duration_ms, suites_summary(jsonb), logs(jsonb), artifacts(jsonb)
- `e2e_test_results`: id, run_id, service_key, scenario_id, scenario_name, user_name, user_email, status, watermark, integrity_score, cross_contamination, duration_ms, steps(jsonb), assembled_doc_snippet, error_message, traceable_artifact_path, created_at
- Acesso: Supabase personal access token (`sbp_*`) → service_role via Management API
- Histórico anterior: run `e2e_run_bootstrap_initial` (36 PASSED) + 2 runs RUNNING (stale)