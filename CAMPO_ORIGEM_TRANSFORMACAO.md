# Tabela de Rastreabilidade: `autuadorBody` e `cityState`

## `autuadorBody` (Órgão Autuador)

| Etapa | Campo | Origem | Transformação | Persistência (DB) | Consumo |
|-------|-------|--------|---------------|-------------------|---------|
| **Onboarding (Fase 1)** | `autuadorBody` | Input usuário (select/search) | Normalização: uppercase, trim | `cases.autuador_body` (snake_case) | — |
| **OCR Auxiliar** | `orgaoAutuador` | Extração OCR (legado) | Normalização: uppercase, trim | `cases.autuador_body` (fallback apenas se `autuadorBody` ausente) | Compatibilidade legada |
| **Canonical Mapper** | `autuador_body` | Domain → Row | `infraction.autuadorBody ?? infraction.orgaoAutuador` | `cases.autuador_body` | `CanonicalMapper.domainToRow()` |
| **Canonical Mapper** | `autuadorBody` | Row → Domain | Pass-through direto | — | `CanonicalMapper.rowToDomain()` |
| **Rule Engine** | `autuadorBody` | InfractionData | Validação obrigatória (throw se ausente) | — | `ExpertRuleEngine.evaluate()` → `CaseAnalysis.competentBody` |
| **Document Assembly** | `autuadorBody` | Payload | Validação obrigatória (throw se ausente), uppercase para placeholders | — | `DocumentAssemblyEngine.assemble()` → `authorityAddressing`, `{{orgao_autuador}}`, `{{orgao}}` |
| **RAG Pipeline** | `autuadorBody` | InfractionData | `resolveProtocolInfo(autuadorBody)` → `SubmissionInstructions` | — | `RagPipeline.generateDefenseDraft()` → `DefenseDraft.protocolInfo` |
| **Órgãos DB** | `abbreviation` | `ORGANS_DB` | Match exato por abreviação | — | `resolveProtocolInfo()` lookup |

### Fonte Canônica
- **Primária**: `autuadorBody` (onboarding, input do usuário)
- **Secundária (compatibilidade)**: `orgaoAutuador` (OCR/legado) — **apenas** se `autuadorBody` ausente
- **NUNCA**: fallback hardcoded (`'DETRAN'`, `'DETRAN / JARI'`)

---

## `cityState` (Cidade/Estado do Requerente)

| Etapa | Campo | Origem | Transformação | Persistência (DB) | Consumo |
|-------|-------|--------|---------------|-------------------|---------|
| **Onboarding (Fase 2)** | `addressCityState` | Input usuário (CEP → auto-complete ou select) | Formato: `"Cidade/UF"` (ex: `"São Paulo/SP"`) | `cases.applicant_city_state` (novo campo) ou em `applicant_data_json` | — |
| **Document Assembly** | `cityState` | Payload.applicant | Validação obrigatória (throw se ausente), split por `/` → `city`, `uf` | — | `DocumentAssemblyEngine.assemble()` → `{{cidade_estado}}`, `{{cidade_requerente}}`, `{{uf_requerente}}`, `closingPlaceDate` |
| **RAG Pipeline** | `cityState` | applicantData | Pass-through para DocumentAssemblyEngine | — | `RagPipeline.generateDefenseDraft()` |

### Fonte Canônica
- **Única**: `applicant.cityState` / `applicantData.cityState` (onboarding Fase 2)
- **NUNCA**: fallback hardcoded (`'São Paulo/SP'`)

---

## Fluxo Integrado (Onboarding → Minuta → Protocolo)

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────┐     ┌─────────────────────┐
│   ONBOARDING    │────▶│  RULE ENGINE     │────▶│ DOCUMENT ASSEMBLY  │────▶│   PROTOCOL INFO     │
│   (Fase 1/2)    │     │  (Análise)       │     │   (Minuta)         │     │   (Orientações)     │
└─────────────────┘     └──────────────────┘     └────────────────────┘     └─────────────────────┘
        │                       │                       │                        │
        ▼                       ▼                       ▼                        ▼
  autuadorBody            autuadorBody            autuadorBody            autuadorBody
  cityState               ──────────────▶         cityState               ──────────────▶
                           (validação)                              resolveProtocolInfo()
                                                                        │
                                                                        ▼
                                                              SubmissionInstructions
                                                              { competentBody,
                                                                portalUrl,
                                                                physicalAddress,
                                                                deadlineDate,
                                                                instructionsText }
```

---

## Validações FAIL CLOSED Implementadas

1. **DocumentAssemblyEngine.assemble()**
   - `if (!payload.infraction.autuadorBody) throw Error('autuadorBody obrigatório...')`
   - `if (!payload.applicant.cityState) throw Error('cityState obrigatório...')`

2. **ExpertRuleEngine.evaluate()**
   - `if (!infraction.autuadorBody) throw Error('autuadorBody obrigatório...')`

3. **CanonicalMapper.domainToRow()**
   - `autuador_body: infraction.autuadorBody ?? infraction.orgaoAutuador` (sem fallback hardcoded)

4. **resolveProtocolInfo()**
   - Retorna `null` se órgão não encontrado (sem fallback para DETRAN-SP)
   - Caller deve tratar `null` como erro de configuração

---

## Testes de Integridade (Isolamento SP/RJ)

| Teste | Órgão | Cidade/Estado | Validação |
|-------|-------|---------------|-----------|
| `resolveProtocolInfo('DETRAN-SP')` | DETRAN-SP | — | competentBody = JARI Central SP, portalUrl = detran.sp.gov.br |
| `resolveProtocolInfo('DETRAN-RJ')` | DETRAN-RJ | — | competentBody = JARI RJ, portalUrl = detran.rj.gov.br |
| `DocumentAssemblyEngine` com `autuadorBody: 'DETRAN-SP', cityState: 'São Paulo/SP'` | DETRAN-SP | São Paulo/SP | authorityAddressing contém DETRAN-SP, closingPlaceDate contém São Paulo/SP |
| `DocumentAssemblyEngine` com `autuadorBody: 'DETRAN-RJ', cityState: 'Rio de Janeiro/RJ'` | DETRAN-RJ | Rio de Janeiro/RJ | authorityAddressing contém DETRAN-RJ, closingPlaceDate contém Rio de Janeiro/RJ |
| `CanonicalMapper` prioriza `autuadorBody` sobre `orgaoAutuador` | DETRAN-SP (body) vs DETRAN-RJ (OCR) | — | Resultado = DETRAN-SP |
| `ExpertRuleEngine` usa `autuadorBody` direto para `competentBody` | PRF | — | competentBody = PRF (não DETRAN / JARI) |