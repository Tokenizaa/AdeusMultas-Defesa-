# Auditoria Exaustiva de Fluxos Jurídicos — Matriz Real + Falhas

> Gerado por @testes (auditoria determinística) — 2026-08-29
> Repositório: `Tokenizaa/AdeusMultas-Defesa-`, branch `main`
> Comando de checagem: `npm run test:unit` (suíte `tests/audit/`)

---

## A. MATRIZ REAL (extraída do código, não por suposição)

### A.1 Comércio → Procedimento → Template → Órgão

Fonte: `src/types/commercial.ts:21-31`, `src/types/index.ts:1-11`, `src/server/commercial/offers/offer-service.ts:27-42` (PROCEDURE_TO_COMMERCIAL), `src/core/templates/templates-catalog.ts`, `src/core/legal-base/organs.ts:9-99`.

| # | CommercialServiceType | ProcedureType (origem) | normaliza p/ catálogo | Template (templates-catalog) | Órgão registry (ORGANS_DB) |
|---|---|---|---|---|---|
| 1 | recurso_jari | recurso_jari | recurso_jari | TPL_RECURSO_JARI ✓ | DETRAN-SP / DETRAN-RJ / DETRAN-MG / PRF / DNIT / CET-SP / DER-SP |
| 2 | recurso_cetran | recurso_cetran | recurso_cetran | TPL_RECURSO_CETRAN ✓ | idem (2ª instância estadual) |
| 3 | suspensao | suspensao_cnh | suspensao | ⚠️ sem template (cai em TPL_RECURSO_JARI) | DETRAN estadual |
| 4 | cassacao | cassacao_cnh | cassacao | ⚠️ sem template (cai em TPL_RECURSO_JARI) | DETRAN estadual |
| 5 | indicacao_condutor | indicacao_condutor | indicacao_condutor | TPL_FICI_INDICACAO ✓ | órgão autuador |
| 6 | conversao_advertencia | conversao_advertencia | conversao_advertencia | TPL_CONVERSAO_ADVERTENCIA ✓ | órgão autuador |
| 7 | suspensao_cnh | suspensao_cnh | suspensao | ⚠️ sem template | DETRAN |
| 8 | cassacao_cnh | cassacao_cnh | cassacao | ⚠️ sem template | DETRAN |
| 9 | processo_suspensao | processo_suspensao | suspensao | TPL_PSDD_SUSPENSAO ✓ | DETRAN |
| 10 | processo_cassacao | processo_cassacao | cassacao | TPL_PCDD_CASSACAO ✓ | DETRAN |
| — | (não comercial) analise_tecnica | — | bloqueado | TPL_RELATORIO_TECNICO (catálogo procedures) | — |
| — | (não comercial) relatorio_pericial | — | bloqueado | TPL_RELATORIO_PERICIAL (catálogo procedures) | — |

`PROCEDURES_CATALOG` (`src/core/procedures/procedures-catalog.ts`) cobre: recurso_jari, recurso_cetran, suspensao_cnh, cassacao_cnh, indicacao_condutor, conversao_advertencia, analise_tecnica, relatorio_pericial.
**AUSENTES do catálogo:** `processo_suspensao`, `processo_cassacao` (P0 — assembly cai em `PROCEDURES_CATALOG[0]`).

### A.2 Onboarding → dados → análise → teses → template → minuta → protocolo

Fluxo real (`src/core/onboarding/rules-matrix.ts`, `src/core/rules/rule-engine.ts`, `src/core/rag/rag-pipeline.ts`, `src/core/documents/document-assembly-engine.ts`, `src/core/legal-base/organs.ts:106-117`):

```
USER_SITUATIONS (5) ──mappedProcedure──▶ ProcedureType
USER_PROCESS_STAGES (6) ──mappedProcedure──▶ ProcedureType
RULES_MATRIX (8 categorias) ──requiredFreeFields/requiredDocumentFields──▶ coleta
ExpertRuleEngine.evaluate(infraction) ──▶ CaseAnalysis (teses via EXPERT_RULES → ARGUMENTS_CATALOG)
DocumentAssemblyEngine.assemble ──▶ DefenseDraft (template + DOCUMENT_BLOCKS + variáveis)
resolveProtocolInfo(autuadorBody) ──▶ SubmissionInstructions (portal do órgão)
```

Estágios onboarding (`USER_PROCESS_STAGES`, rules-matrix.ts:100-149):

| Estágio | mappedProcedure | Papel jurídico |
|---|---|---|
| primeira_notificacao (NA) | recurso_jari ⚠️ | Defesa Prévia (Art. 281 CTB) — NÃO é recurso; confluído c/ Recurso JARI (`mappedProcedure: 'recurso_jari'` + nota arquitetural) |
| notificacao_penalidade (NIP) | recurso_jari ✓ | Recurso JARI (Art. 285) |
| defesa_negada | recurso_jari ✓ | Recurso JARI decorrente |
| recurso_jari_negado | recurso_cetran ✓ | Recurso CETRAN (Art. 288/289) |
| conversao_advertencia | conversao_advertencia ✓ | Art. 267 |
| nao_tenho_certeza | recurso_jari ✓ | inferência |

### A.3 Órgãos suportados (ORGANS_DB, organs.ts:9-99) + protocolo

| abbreviation | state | portal (resolveProtocolInfo) |
|---|---|---|
| DETRAN-SP | SP | https://www.detran.sp.gov.br/servicos/recursos |
| DETRAN-RJ | RJ | https://www.detran.rj.gov.br/protocolo-defesas |
| DETRAN-MG | MG | https://www.detran.mg.gov.br/infracoes/recursos |
| PRF | — | https://sistemas.prf.gov.br/portal/recursos |
| DNIT | — | https://servicos.dnit.gov.br/multas |
| CET-SP / DSV | SP | https://dsv.prefeitura.sp.gov.br/defesa |
| DER-SP | SP | https://www.der.sp.gov.br/multas/recursos |

`resolveProtocolInfo` (organs.ts:106): match exato por `abbreviation`; órgão desconhecido → `null` (SEM fallback — correto).

---

## B. LISTA DE FALHAS

### P0 — Dados fabricados ou procedimento errado em produção

| ID | Falha | Evidência |
|---|---|---|
| P0-1 | `RagPipeline.retrieveContext` cai no 1º órgão (`ORGANS_DB[0]` = DETRAN-SP) quando órgão não encontrado — análise financiada por órgão errado | `src/core/rag/rag-pipeline.ts:92` (`|| ORGANS_DB[0]`) |
| P0-2 | `RagPipeline.findInfraction` cai no 1º item do catálogo (`INFRACTION_CATALOG[0]`) quando código não encontrado — infração errada apresentada como fato | `src/core/rag/rag-pipeline.ts:25` |
| P0-3 | `DocumentAssemblyEngine.assemble` resolve procedure errada para `processo_suspensao`/`processo_cassacao` (ausentes do catálogo → `PROCEDURES_CATALOG[0]` = recurso_jari) — peça com procedimento incorreto | `src/core/documents/document-assembly-engine.ts:97-99` |
| P0-4 | Idem template: qualquer ProcedureType sem template próprio (ex: `suspensao_cnh`, `cassacao_cnh`) cai em `TEMPLATES_CATALOG[0]` = TPL_RECURSO_JARI — peça de Recurso JARI gerada p/ caso de suspensão | `src/core/documents/document-assembly-engine.ts:102-104` |
| P0-5 | Assembly interpolates dados fabricados p/ dados ausentes: `aitNumber \|\| 'AIT-1234567'`, `speedLimit \|\| 60`, `measured 78/considered 71`, datas '10/02/2026'/'25/02/2026', `psdd \|\| PSDD-883921`, `nome_requerente \|\| 'NOME DO REQUERENTE'`, `cpf \|\| '000.000.000-00'`, `cnh \|\| '00000000000'`, endereço 'Rua das Flores, 123', placa 'ABC-1234', renavam '00000000000' | `src/core/documents/document-assembly-engine.ts:152-234` |
| P0-6 | `RagPipeline.generateDefenseDraft` grava RENAVAM fake fixo `12345678900` em toda minuta | `src/core/rag/rag-pipeline.ts:148` |
| P0-7 | `POST /api/cases` gera minuta automática na CRIAÇÃO com dados fabricados (`cpf: '000.000.000-00'`, `cnh: '00000000000'`, `cityState: 'São Paulo/SP'`, placa 'SEM PLACA') — toda análise gratuita persiste peça com CPF/CNH inexistentes | `src/server/routes/cases.ts:81-97` |
| P0-8 | Geração pós-pagamento (webhook) usa dados fabricados (`cnh: '05492817492'`, `cityState: 'São Paulo/SP'`, `address: 'Rua das Flores, 450, Apto 82'`) e IGNORA `domain.applicant` — a peça paga que o cidadão baixa contém CNH e cidade que nunca foram digitadas | `src/server/routes/payments.ts:105-133` (generateDefenseDraftForDomain) |
| P0-9 | Geração em `POST /api/cases/:id/generate-defense` usa `cnh: '05492817492'` e `cityState: 'São Paulo/SP'` fabricados | `src/server/routes/cases.ts:198-212` |
| P0-10 | PDF export fabrica AIT '1B892014', placa 'BRA2E19', enquadramento '745-50'/'Art. 218 CTB', CPF '000.000.000-00' quando dados ausentes | `src/lib/pdf-export.ts:26,149,153,161,169,181` |

### P1 — Fallback de procedimento/órgão em camadas de negócio

| ID | Falha | Evidência |
|---|---|---|
| P1-1 | `generateDefenseDraft` default param `procedureType = 'recurso_jari'` — procedimento ausente não gera erro | `src/core/rag/rag-pipeline.ts:138` |
| P1-2 | `ExpertRuleEngine.evaluate` default `procedure = 'recurso_jari'` p/ qualquer infração fora dos códigos 516-91/747-10/ARG-051 — casos de suspensão/cassação podem recomendar recurso errado | `src/core/rules/rule-engine.ts:255-260` |
| P1-3 | `buildDocumentRoll*` resolve procedure ausente/inválida caindo em recurso_jari | `src/core/documents/document-roll.ts:42-48` |
| P1-4 | `CanonicalMapper.domainToRow` fabrica defaults: `infraction_code \|\| '745-50'`, `ctb_article \|\| 'Art. 218 do CTB'`, `severity \|\| 'grave'`, `location \|\| 'Via Pública'`, placa 'SEM PLACA', `date_time \|\| now()` | `src/core/mappers/canonical-mapper.ts:142-157` |
| P1-5 | `CanonicalMapper.rowToDomain` fallback `service_type \|\| 'recurso_jari'`, `status \|\| 'novo'` | `src/core/mappers/canonical-mapper.ts:71-73` |
| P1-6 | `RuleEvaluationContext.infractionCode` opcional; `RULE_RADAR_CALIBRACAO_12M` chama `ctx.infractionCode.startsWith` — crash se infractionCode ausente | `src/core/rules/rule-engine.ts:55` |
| P1-7 | Coupons: `serviceType ?? 'recurso_jari'` nas rotas validate/redeem | `src/server/routes/commercial.ts:223,235` |
| P1-8 | `retrieveContext` default de teses `matchedTeses` p/ código não-radar → sempre ARG-001/ARG-008; sem match → tese fake de radar | `src/core/rag/rag-pipeline.ts:55-58,102-108` |
| P1-9 | Sessão de 1ª notificação (Defesa Prévia) mapeada p/ Template de RECURSO — peça nomeada "Recurso Ordinário" em fase de NA (nota arquitetural reconhece a confluência) | `src/core/onboarding/rules-matrix.ts:104-113`, `src/server/routes/governance.ts:36` |

### P2 — Fallbacks dev/seed e exposição

| ID | Falha | Evidência |
|---|---|---|
| P2-1 | `governance.ts` dev-fallback retorna `verified:true` com dados fabricados (`DET2026SP984712`, 'BRA2E19', DETRAN-SP) sempre que `NODE_ENV !== 'production'` | `src/server/routes/governance.ts:54-66` |
| P2-2 | `transit.ts` simulador DETRAN/INMETRO habilitado fora de produção (501 em produção) | `src/server/routes/transit.ts:11-16,56-61` |
| P2-3 | `NODE_ENV` não definido em `.env`/`.env.example` — dependência implícita de definição da plataforma p/ travar fallbacks dev (P2-1/P2-2 testmode aberto se NODE_ENV ausente) | `.env`, `src/server/routes/payments.ts:140-154` |
| P2-4 | PIX create fabrica payer `'Condutor DefesAi'` / `contato@www.defesai.shop` / CPF `12345678909` quando cliente ausente | `src/server/routes/payments.ts:250-256,410-416` |
| P2-5 | `ExpertRuleEngine` prazo default = hoje+25d (`defenseDeadline \|\| deadlineStr`) | `src/core/rules/rule-engine.ts:284-296` |

### P3 — Higiene/hereditária

| ID | Falha | Evidência |
|---|---|---|
| P3-1 | Testes `.test.ts` (organs, mapper, rule-engine, assembly) importam vitest mas vitest não estava instalado nem script configurado — suíte morta até esta auditoria | `package.json` |
| P3-2 | CI `bun test` quebrado: roda `*.test.ts` sem vitest instalado | `.github/workflows/ci-cd.yml` |
| P3-3 | `testFillData.ts` + `TestFillButton` injetam dados fake na UI (dev-only, mas presentes no bundle) | `src/components/onboarding/testFillData.ts`, `src/components/ui/TestFillButton.tsx` |
| P3-4 | `TESTE`/`DEV-ONLY` seeds com DETRAN-SP: `demo-case.ts`, `state-service.ts:56-94` | idem |
| P3-5 | Typecheck quebrado (9 erros) em `src/server/workers/meta-publisher.worker.ts` — `publisher_jobs` ausente dos tipos Supabase (commit `fdd5047`, fora do escopo jurídico; zero erros em org/mapper/rule/assembly/rag/commercial) | `npm run lint` |
| P3-6 | `bun.lock` desatualizado (sem vitest) — dev com `bun install` re-sincroniza; CI migrou p/ npm | `bun.lock` |

---

## D. BUSCA GLOBAL CLASSIFICADA

Padrões auditados (2026-08-29):

| Padrão | Ocorrências | Classificação |
|---|---|---|
| `\|\| 'DETRAN` | 0 | ✅ FALLBACK REMOVIDO |
| `?? 'DETRAN` | 0 | ✅ FALLBACK REMOVIDO |
| `\|\| 'São Paulo` | 0 | ✅ FALLBACK REMOVIDO |
| `?? 'São` | 0 | ✅ FALLBACK REMOVIDO |
| `PROCEDURES_CATALOG[0]` | 1 (`document-assembly-engine.ts:99`) | ❌ ILEGAL (P0-3) |
| `TEMPLATES_CATALOG[0]` | 1 (`document-assembly-engine.ts:104`) | ❌ ILEGAL (P0-4) |
| `INFRACTION_CATALOG[0]` | 1 (`rag-pipeline.ts:25`) | ❌ ILEGAL (P0-2) |
| `ORGANS_DB[0]` | 1 (`rag-pipeline.ts:92`) | ❌ ILEGAL (P0-1) |
| `'DETRAN-SP'` hardcoded | governance.ts:61 (dev), transit.ts:41 (sim), demo-case.ts:32/79/88/91 (seed), state-service.ts:56 (seed), docs | DEV-ONLY ✓ / TESTE ✓ |
| `530: '12345678909'/'05492817492'/'000.000.000-00'` | routes+cases+payments+pdf+assembly | ❌ ILEGAL (P0-5..P0-10) |

Legenda: CANÔNICA = registry oficial; REGISTRY = dado de catálogo; TESTE = fixture/seed; DEV-ONLY = rota simulada; FALLBACK REMOVIDO = já corrigido; ILEGAL = viola "0 fallback jurídico".

---

## E. Veredito

**BLOCKED** — critérios violados:
- ❌ "0 fallback jurídico remanescente": P0-1..P0-4 (arrays[0]) + P0-5..P0-10 (dados fabricados)
- ❌ "0 órgão/cidade/UF incorreta": P0-1, P0-7..P0-9 ('São Paulo/SP' fabricado)
- ❌ "0 procedimento incorreto": P0-3, P0-4, P1-1, P1-2
- ❌ "0 perda de dados do onboarding": P0-8 (applicant ignorado na geração paga), P1-4/P1-5 (mapper fabrica defaults)
- ✅ 100% CommercialServiceType testados (`tests/audit/commercial-integrity.test.ts`)
- ✅ 100% ProcedureType testados (catalog-integrity + service-procedure-flows)
- ✅ 100% órgãos suportados testados (organs.test.ts + protocol-integrity em service-procedure-flows)
- ✅ 100% etapas críticas onboarding testadas (defesa-previa-vs-recurso + rules-matrix)
- ⚠️ Subserviços comerciais de referência/auditoria (affiliate/commission/audit ledger) dependem de `src/server/commercial/commercial-test-suite.ts` (requer Supabase) — fora do gate unitário (P3)

**Gate de CI**: `.github/workflows/ci-cd.yml` agora roda `test:unit` (vitest). Vermelho enquanto P0/P1 não corrigidos — comportamento intencional (gate bloqueia merge).