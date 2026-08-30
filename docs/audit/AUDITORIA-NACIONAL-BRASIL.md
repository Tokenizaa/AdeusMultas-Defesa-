# Auditoria Nacional Brasil — Cobertura Real × Catálogo (27 UF)

> Gerado por @testes (auditoria FASE A + FASE B) — 2026-08-29
> Repositório: `Tokenizaa/AdeusMultas-Defesa-`, branch `main`
> Gate: `npm run test:unit` (suíte `tests/audit/`, agora com bateria nacional `national-coverage.*`)

---

## RESUMO EXECUTIVO — VEREDITO

**VEREDITO: `PARTIALLY_NATIONAL`** (inclinação `NOT_NATIONAL` para a régua nacional).

A plataforma **não opera nacionalmente nos termos prometidos pela UI**. O fluxo
jurídico completo (ONBOARDING → CASE → RULE ENGINE → KNOWLEDGE → ANÁLISE →
MINUTA → PDF → PROTOCOLO) tem **cobertura real de órgão/protocolo para apenas
3 DETRANs estaduais (SP, RJ, MG) + 2 órgãos federais (PRF, DNIT) + 2 municipais/
estaduais de SP (CET-SP, DER-SP)**. **24 das 27 UFs são CATALOG_ONLY**: existem
apenas como `<option>` no dropdown da UI (`InfractionIdentificationStep.tsx`),
sem órgão registrado, sem conhecimento estadual, sem regras estaduais, sem
protocolo.

**Bom (FASE B prova):** a plataforma **não fabrica nem contamina** para UFs fora
do registry — `resolveProtocolInfo('DETRAN-AM') = null`, sem fallback para
DETRAN-SP; dados ausentes → erro. Isso é um comportamento **correto e honesto**
(ausência não fabrica), mas significa que **24 UFs não entregam protocolo nem
análise estadual**.

---

## FASE A — MATRIZES DE COBERTURA REAL

### A1 + A2. As 27 UF × cobertura DETRAN/órgão

Fonte: `src/core/legal-base/organs.ts` (ORGANS_DB, 7 órgãos),
`src/data/knowledge-base.ts` (AUTUADOR_BODIES, 7), `resolveProtocolInfo` (7),
UI dropdown `src/components/onboarding/steps/InfractionIdentificationStep.tsx`
(27 DETRANs + 7 DER + 10 CET/municipais + federais + outros).

| UF | Sigla dropdown? | Órgão em ORGANS_DB/AUTUADOR_BODIES? | `resolveProtocolInfo`? | Classificação |
|---|---|---|---|---|
| AC | ✅ DETRAN-AC | ❌ | ❌ (null) | `CATALOG_ONLY` |
| AL | ✅ DETRAN-AL | ❌ | ❌ | `CATALOG_ONLY` |
| AP | ✅ DETRAN-AP | ❌ | ❌ | `CATALOG_ONLY` |
| AM | ✅ DETRAN-AM | ❌ | ❌ | `CATALOG_ONLY` |
| BA | ✅ DETRAN-BA | ❌ | ❌ | `CATALOG_ONLY` |
| CE | ✅ DETRAN-CE | ❌ | ❌ | `CATALOG_ONLY` |
| DF | ✅ DETRAN-DF (dropdown) | ❌ (PRF/DNIT são federais, sediados em DF, mas NÃO são "DETRAN-DF") | ❌ p/ DETRAN-DF | `CATALOG_ONLY` (DF); PRF/DNIT = `SUPPORTED_REAL` (federal) |
| ES | ✅ DETRAN-ES | ❌ | ❌ | `CATALOG_ONLY` |
| GO | ✅ DETRAN-GO | ❌ | ❌ | `CATALOG_ONLY` |
| MA | ✅ DETRAN-MA | ❌ | ❌ | `CATALOG_ONLY` |
| MT | ✅ DETRAN-MT | ❌ | ❌ | `CATALOG_ONLY` |
| MS | ✅ DETRAN-MS | ❌ | ❌ | `CATALOG_ONLY` |
| MG | ✅ DETRAN-MG | ✅ | ✅ | `SUPPORTED_PARTIAL` |
| PA | ✅ DETRAN-PA | ❌ | ❌ | `CATALOG_ONLY` |
| PB | ✅ DETRAN-PB | ❌ | ❌ | `CATALOG_ONLY` |
| PR | ✅ DETRAN-PR | ❌ | ❌ (null) | `CATALOG_ONLY` |
| PE | ✅ DETRAN-PE | ❌ | ❌ | `CATALOG_ONLY` |
| PI | ✅ DETRAN-PI | ❌ | ❌ | `CATALOG_ONLY` |
| RJ | ✅ DETRAN-RJ | ✅ | ✅ | `SUPPORTED_PARTIAL` |
| RN | ✅ DETRAN-RN | ❌ | ❌ | `CATALOG_ONLY` |
| RS | ✅ DETRAN-RS | ❌ | ❌ | `CATALOG_ONLY` |
| RO | ✅ DETRAN-RO | ❌ | ❌ | `CATALOG_ONLY` |
| RR | ✅ DETRAN-RR | ❌ | ❌ | `CATALOG_ONLY` |
| SC | ✅ DETRAN-SC | ❌ | ❌ | `CATALOG_ONLY` |
| SP | ✅ DETRAN-SP (+CET-SP+DER-SP) | ✅ (3) | ✅ | `SUPPORTED_PARTIAL` |
| SE | ✅ DETRAN-SE | ❌ | ❌ | `CATALOG_ONLY` |
| TO | ✅ DETRAN-TO | ❌ | ❌ | `CATALOG_ONLY` |

**Resumo**: `SUPPORTED_PARTIAL` = **3 UFs** (SP, RJ, MG); `SUPPORTED_REAL`
(federal, não-UF) = PRF, DNIT; `CATALOG_ONLY` = **24 UFs** (AC, AL, AP, AM, BA,
CE, DF, ES, GO, MA, MT, MS, PA, PB, PR, PE, PI, RN, RS, RO, RR, SC, SE, TO).
Nenhuma UF é `SUPPORTED_REAL` no sentido estadual completo (falta conhecimento/
regras estaduais em todos os casos).

### A3. Knowledge Base × regras estaduais

- `INFRACTION_CATALOG` (`src/data/knowledge-base.ts`): **25 infrações**, todas
  **federais** (CTB / CONTRAN / INMETRO): velocidade Art.218, lei seca 165/165-A,
  celular 252, semáforo 208, estacionamento 181, CNH 162/167 etc. **Zero regra
  estadual.**
- `LEGAL_ARGUMENTS`/`ARGUMENTS_CATALOG` (`src/data/knowledge-base.ts` +
  `src/core/arguments/arguments-catalog.ts`): **52 teses**, todas **federais**
  (CTB, Res. CONTRAN, Portaria INMETRO, CF/88, Súmula STJ). **Zero tese estadual.**
- `EXPERT_RULES` (`src/core/rules/rule-engine.ts`): **6 regras**, todas federais
  (decadência 30d, aferição INMETRO, advertência 267, lei seca 432, MBFT 985,
  sinalização 90). **Zero regra estadual.**
- `KNOWLEDGE_ORGAOS` (`src/core/knowledge/knowledge-base.ts`): derivado de
  ORGANS_DB → **7 órgãos** (SP/RJ/MG/PRF/DNIT/CET-SP/DER-SP). **Zero DETRAN para
  as 24 UFs restantes.**
- Fonte de teses/órgãos mapeada por UF: **0 registros** para AC, AL, AP, AM, BA,
  CE, DF, ES, GO, MA, MT, MS, PA, PB, PR, PE, PI, RN, RS, RO, RR, SC, SE, TO.

**Conclusão A3:** a Knowledge Base é **100% federal/genérica**. Não existe
conhecimento específico por estado (nº de instância, portais por UF, prazo
local, jargão estadual, particularidades JARI×CETRAN por UF). Para fins de
"cobertura nacional", a KB cobre apenas o direito federal comum.

### A4. Falsa cobertura nacional — fallbacks e SP hardcoded

Padrões auditados (2026-08-29, pós-correções da auditoria anterior):

| Padrão | Ocorrência atual | Classificação |
|---|---|---|
| `|| ORGANS_DB[0]` | 0 | ✅ REMOVIDO (fail-closed agora) |
| `|| INFRACTION_CATALOG[0]` | 0 | ✅ REMOVIDO |
| `PROCEDURES_CATALOG[0]` | 0 | ✅ REMOVIDO |
| `TEMPLATES_CATALOG[0]` | 0 | ✅ REMOVIDO |
| `|| 'DETRAN` / `|| 'São Paulo` | 0 | ✅ REMOVIDO |
| `aitNumber || 'AIT-1234567'` etc. | 0 (usa `|| ''` / `'Não informado'`) | ✅ REMOVIDO |
| `cpf || '000.000.000-00'` / `cnh || '00000000000'` | 0 | ✅ REMOVIDO |
| `procedureType = 'recurso_jari'` default | `rag-pipeline.ts:140`, `rule-engine.ts:258` | ⚠️ FEDERAL-ONLY (P1-1/P1-2) — sem dado que revele outra instância, assume JARI |
| UI dropdown 27 DETRANs | `InfractionIdentificationStep.tsx:367-394` | ❌ **CATÁLOGO ≠ CAPACIDADE** — 24 sem órgão/protocolo |

**Achado crítico A4:** a UI **apresenta 27 DETRANs + 7 DER + 10 CET** como
selecionáveis, mas o backend/resolver só conhece **7 órgãos**. O cidadão do Acre
seleciona `DETRAN-AC` → o sistema aceita o dado, persiste o case, roda análise
federal genérica, gera minuta — mas **`resolveProtocolInfo('DETRAN-AC') = null`**:
**sem portal, sem endereço, sem orientação de protocolo** para o estado dele.
A minuta não aponta onde/para quem protocolar. Isso é cobertura falsa nacional.

### A5. Matriz de procedimentos real (Serviço | ProcedureType | Comercial | Template | Órgão)

Fonte: `CommercialServiceType`, `PROCEDURES_CATALOG`, `TEMPLATES_CATALOG`,
`resolveProtocolInfo`.

| Comercial | ProcedureType (canônico) | Template? | Órgão registry (mg/SP/RJ) | Observação |
|---|---|---|---|---|
| recurso_jari | recurso_jari | ✅ TPL_RECURSO_JARI | DETRAN-SP/RJ/MG, PRF, DNIT | ✓ |
| recurso_cetran | recurso_cetran | ✅ TPL_RECURSO_CETRAN | estadual (só SP/RJ/MG/DER/PRF) | ✓ |
| suspensao | processo_suspensao | ✅ TPL_PSDD_SUSPENSAO | DETRAN (só 3) | ✓ p/ SP/RJ/MG |
| cassacao | processo_cassacao | ✅ TPL_PCDD_CASSACAO | DETRAN (só 3) | ✓ p/ SP/RJ/MG |
| suspensao_cnh | suspensao_cnh | ✅ alias | DETRAN (só 3) | ✓ |
| cassacao_cnh | cassacao_cnh | ✅ alias | DETRAN (só 3) | ✓ |
| indicacao_condutor | indicacao_condutor | ✅ FARI | órgão autuador (7) | ✓ |
| conversao_advertencia | conversao_advertencia | ✅ REQUERIMENTO | órgão autuador (7) | ✓ |
| defesa_previa (não-comercial) | defesa_previa | ✅ TPL_DEFESA_PREVIA | órgão autuador (7) | ✓ |
| analise_tecnica/relatorio_pericial (não-comercial) | — | ✅ (catálogo) | — | sem oferta comercial |

Todos os services comerciais têm template + procedimento no catálogo (P0-3/P0-4
corrigidos na auditoria anterior). **A limitação nacional é de ÓRGÃO, não de
procedimento.**

### A6. Matriz Serviço × UF (27)

Para cada serviço comercial: o serviço **processa** em qualquer UF (aceita o
dado, gera minuta federal), mas **só entrega PROTOCOLO/órgão correto para
SP, RJ, MG + PRF/DNIT**. Legenda: ✓ = órgão+protocolo resolvido; △ = processa
(minuta federal) mas protocolo `null`; ✗ = não resolve.

| Serviço | SP | RJ | MG | AC/…/TO (24 UFs) | PRF/DNIT (fed.) |
|---|---|---|---|---|---|
| recurso_jari | ✓ | ✓ | ✓ | △ (protocolo null) | ✓ |
| recurso_cetran | ✓ | ✓ | ✓ | △ | △ (federal, 2ª via CONTRAN) |
| suspensao/cassacao (+cnh/processo) | ✓ | ✓ | ✓ | △ | △ |
| indicacao_condutor | ✓ | ✓ | ✓ | △ | ✓ |
| conversao_advertencia | ✓ | ✓ | ✓ | △ | ✓ |
| defesa_previa | ✓ | ✓ | ✓ | △ | ✓ |

---

## FASE B — EXECUÇÃO (dimensionada pela matriz real)

**Dimensionamento (regra da FASE A):** como só X=3 UFs (SP/RJ/MG) + 2 órgãos
federais têm suporte real de órgão/protocolo, a bateria nacional **NÃO gera
27×9×5 casos**. Em vez disso:

1. **Caso apoio real (SUPPORTED)**: 1 caso por região usando órgão registrado,
   com UF correspondente — prova o caminho completo funciona (identity preservada,
   protocolo correto, sem fabricação, sem contaminação).
2. **Caso nacional honesto (CATALOG_ONLY)**: casos nas 24 UFs não-registradas
   provam que o sistema **não fabrica SP nem contamina** (protocolo null, dados
   preservados) — mas NÃO atribuem suporte falso.
3. **Adversarial**: fallback geográfico, contaminação de órgão/estado, contaminação
   entre casos, dados ausentes → erro.

### B1/B3. Casos executados (fluxo completo real)

Cada caso percorre a cadeia real:
`payload onboarding → CanonicalMapper.domainToRow/rowToDomain → ExpertRuleEngine.evaluate
→ RagPipeline.retrieveContext → DocumentAssemblyEngine.assemble → resolveProtocolInfo
→ conteúdo do PDF (exportDefenseToPDF usa real caseData, sem fabricação)`.

| Caso | UF | Órgão | Serviço | Resultado |
|---|---|---|---|---|
| AUD-AM-JARI-001 | AM | DETRAN-AM (CATALOG_ONLY) | recurso_jari | ✅ processa, protocolo null (verdade honesta) |
| AUD-BA-JARI-002 | BA | DETRAN-BA (CATALOG_ONLY) | recurso_jari | ✅ processa, protocolo null |
| AUD-GO-JARI-003 | GO | DETRAN-GO (CATALOG_ONLY) | recurso_jari | ✅ processa, protocolo null |
| AUD-RS-JARI-005 | RS | DETRAN-RS (CATALOG_ONLY) | recurso_jari | ✅ processa, protocolo null |
| AUD-SP-JARI-004 | SP | DETRAN-SP (SUPPORTED) | recurso_jari | ✅ protocolo DETRAN-SP correto |
| AUD-RJ-SUSP-006 | RJ | DETRAN-RJ (SUPPORTED) | processo_suspensao | ✅ protocolo DETRAN-RJ |
| AUD-MG-CASS-007 | MG | DETRAN-MG (SUPPORTED) | processo_cassacao | ✅ protocolo DETRAN-MG |
| AUD-PRF-REC-008 | DF | PRF (SUPPORTED) | recurso_jari | ✅ protocolo PRF |
| AUD-SP-CONV-009 | SP | DETRAN-SP | conversao_advertencia | ✅ protocolo correto |
| AUD-SP-FICI-010 | SP | DETRAN-SP | indicacao_condutor | ✅ protocolo correto |

### B4. Comparação Input → Output (identity/vehicle/infraction/procedure/protocol)

Em todos os casos abertos por levantamento + testes `national-coverage`:
- **Identidade**: nome/CPF/CNH/cidade/UF do input == `applicant*` do output da
  minuta e do PDF. Nenhum campo é substituído por valor hardcoded.
- **Veículo**: placa/RENAVAM do input preservados (RENAVAM não é fabricado).
- **Infração**: AIT/data/local/enquadramento/órgão preservados (sem fallback a
  `745-50`/`Art.218` quando dados reais presentes).
- **Procedimento**: template correto do procedimento (suspensão não vira Recurso
  JARI; cassação idem).
- **Protocolo**: `resolveProtocolInfo` devolve o portal/endereço **do próprio
  órgão**; para UFs não-registradas devolve **null** (nunca DETRAN-SP).

### B5/B6/B7. Personalização da análise + minuta + PDF

- **B5 (análise personalizada)**: `ExpertRuleEngine.evaluate` depende dos dados
  do caso (código 745-50 → regra radar; 516-91 → suspensão; dados de data →
  decadência 30d). Trocar dados de um caso por outro **muda** as inconsistências
  e teses — a análise NÃO é estática. (Coberto por testes que diferem inputs.)
- **B6 (minuta)**: cada campo classificado pelos testes como CORRETO (dado real
  presente) ou AUSENTE_CORRETAMENTE (dado ausente → vazio, não fabricado). Nenhum
  INCORRETO/FABRICADO/CONTAMINADO encontrado na suíte atual.
- **B7 (PDF)**: `exportDefenseToPDF` usa exclusivamente `caseData` real com
  `'Não informado'` p/ ausentes; não reintroduz AIT/CPF/CNH fabricados (P0-10
  corrigido).

### B2/B8/B9. Adversarial, jurídico-por-estado, isolamento

- **B2a fallback geográfico**: `DETRAN-AM` → protocolo `null`, nunca DETRAN-SP.
- **B2b contaminação órgão/estado**: caso RS não recebe portal/endereço de outro
  estado; caso com órgão não-registrado não recebe portal alheio.
- **B2c contaminação entre casos**: seq AM→RS→BA→PR→PE→GO→SP→PA→MG→CE; cada caso
  retém próprio órgão/cidade. (Testes `geographic-integrity` + `national-coverage`.)
- **B2d dados ausentes**: autuadorBody="" / cityState="" → **erro** (não fabrica).
- **B2e órgãos não-DETRAN**: PRF/DNIT/CET-SP resolvem; ANTT/IBAMA/DER-RJ etc. da
  UI **não estão no registry** → protocolo null (oportunidade de gap).
- **B8 jurídico por estado**: rule engine + KB **não têm regras estaduais** —
  respondem **SÓ** o federal. Para UF sem registro: **KNOWLEDGE GAP** (não é
  PASS). A competência/instância estadual (CETRAN por UF, portal local) **não é
  resolvida** pela plataforma.
- **B9 isolamento nacional**: `ORGANS_DB.find`/`resolveProtocolInfo` são puros
  (sem state global/cache/singleton) → nenhum vazamento de contexto entre casos.

---

## LISTA DE GAPS E FALHAS

| ID | Tipo | Severidade | Descrição | Evidência |
|---|---|---|---|---|
| N-01 | **COVERAGE GAP** | CRÍTICA | 24/27 UFs **sem órgão registrado** → sem protocolo (portal/endereço) e sem análise estadual | `organs.ts:9-99` (7 órgãos); dropdown `InfractionIdentificationStep.tsx:367-394` (27) |
| N-02 | **KNOWLEDGE GAP** | ALTA | KB 100% federal; **zero** regra/tese/portal estadual p/ qualquer UF | `knowledge-base.ts`, `arguments-catalog.ts`, `rule-engine.ts` |
| N-03 | **COVERAGE GAP** | MÉDIA | `PROCEDURES_CATALOG`/`resolveProtocolInfo` ignoram órgãos que a UI oferece (ANTT, IBAMA, DER-RJ/MG/PR/RS/SC/BA/GO, TRANSPE, TRANSFOR etc.) | dropdown `:364-423` vs `ORGANS_DB` |
| N-04 | **DESIGN GAP** | MÉDIA | Service `recurso_cetran` aponta instância estadual sem órgão/portal por UF (`CONSELHO ESTADUAL` genérico) | `procedures-catalog.ts:47-49,74`; `knowledge-base.ts:74` |
| N-05 | **DESIGN GAP** | MÉDIA | Defaults `procedure='recurso_jari'` (rain-pipeline + rule-engine) sem UO — se UF desconhecida e dado incompleto, assume 1ª instância JARI genérica | `rag-pipeline.ts:140`, `rule-engine.ts:258` (P1-1/P1-2 legados) |
| N-06 | **DOCUMENTATION GAP** | MÉDIA | UI vende "Brasil todo" mas backend não; não há aviso de cobertura por UF | `InfractionIdentificationStep.tsx` |

**Não-classificados (já corrigidos pela auditoria anterior; mantidos verdes):**
fabricação de dados (P0-5..P0-10), `[0]` fallbacks (P0-1..P0-4), defaults de
mapper (P1-4/P1-5), roll de documentos (P1-3) — todos com testes na suíte atual.

---

## Evidências (artefatos da bateria)

- `tests/audit/national-coverage.test.ts` — 27 UFs × registry/protocolo;
  fallback geográfico; isolamento AM→…→CE; personalização de análise;
  identidade/preservação no fluxo completo; dados ausentes → erro; PDF sem
  fabricação.
- Suíte pré-existente mantida verde (128 testes) + bateria nova:
  `catalog-integrity`, `commercial-integrity`, `defesa-previa-vs-recurso`,
  `geographic-integrity`, `no-fallback-integrity`, `service-procedure-flows`.

---

## Correções recomendadas (produção — FORA do escopo desta auditoria @testes)

1. (P0 nacional) **Registrar os 27 DETRANs** em `ORGANS_DB`/`AUTUADOR_BODIES`
   com portal/endereço reais por UF (DETRAN-AC…TO). `@banco`/`@backend`.
2. **Adicionar conhecimento estadual** (regras/prazos/CETRAN por UF) na KB. `@backend`.
3. **Mapear DECOR (DETRAN × Portal) no `resolveProtocolInfo`** de forma genérica
   por UF, com fallback explícito e auditável. `@backend`.
4. (UI) **Alinhar dropdown ↔ registry** ou sinalizar "cobertura disponível" por UF
   (evitar vender capacidade inexistente). `@frontend`.

---

## Veredito final

**`PARTIALLY_NATIONAL`** — com 24/27 UFs em `CATALOG_ONLY` (apenas na UI),
nenhum conhecimento estadual e protocolo só p/ SP/RJ/MG + PRF/DNIT:
- ✅ Ausência **não fabrica** ni contamina ni cai em SP (honestidade preservada).
- ✅ Caminho pago (SP/RJ/MG + federal) funciona end-to-end com dados reais.
- ❌ **Não é `NATIONAL_READY`**: 24 UFs não têm protocolo/órgão/regra estadual.
- ❌ Não é `NOT_NATIONAL` absoluto: SP/RJ/MG + PRF/DNIT têm suporte real.
