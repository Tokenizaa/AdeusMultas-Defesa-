# Matriz de Completude — indicacao_condutor

| Categoria | Campo | Descrição | Fonte |
|---|---|---|---|
| **Obrigatórios (Input)** | `infractionCode` | Código da infração (ex: `745-50`) | Onboarding form |
| | `ctbArticle` | Artigo do CTB (ex: `Art. 218, II, CTB`) | Onboarding form |
| | `severity` | Gravidade da infração (`leve`/`media`/``gravissima`) | Onboarding form |
| | `fineAmount` | Valor da multa em reais | Onboarding form |
| | `points` | Pontos na carteira | Onboarding form |
| | `dateTime` | Data e hora da autuação (dd/mm/aaaa HH:MM) | Onboarding form |
| | `location` | Local da autuação | Onboarding form |
| | `autuadorBody` | Órgão autuador (ex: `DETRAN-SP`) | Onboarding form |
| | `aitNumber` | Número do AUTO DE INFRAÇÃO | Onboarding form |
| | `realDriverName` | Nome do condutor indicado | Onboarding form |
| | `realDriverCpf` | CPF do condutor indicado | Onboarding form |
| | `realDriverCnh` | CNH do condutor indicado | Onboarding form |
| | `indicationWithinDeadline` | Se a indicação foi dentro do prazo | Onboarding form |
| **Obrigatórios (Output - Análise)** | `analysis.recommendedProcedure` | Deve ser `indicacao_condutor` | Engine contract |
| | `analysis.summaryReasoning` | Justificativa com >50 caracteres | Engine contract |
| | `analysis.evaluatedRules` | Array não-vazio de regras avaliadas | Engine contract |
| | `analysis.detectedInconsistencies` | Array de inconsistências detectadas | Engine contract |
| | `analysis.dataGaps` | Array de lacunas de dados identificadas | Engine contract |
| | `analysis.recommendedArguments` | Array de argumentos recomendados | Engine contract |
| | `analysis.recommendedProcedure` | Deve ser `indicacao_condutor` | Test assertion |
| **Condicionais (Input)** | `hasPreviousInfractionsLast12Months` | Histórico de infrações nos últimos 12 meses | Onboarding form |
| **Opcionais (Input)** | `notificationExpeditionDate` | Data de expedição da notificação | Onboarding form |
| | `defenseDeadline` | Prazo para defesa | Onboarding form |
| | `hasAgentDetailedObservations` | Observações circunstanciadas do agente | Onboarding form |
| | `hasPhotoProof` | Evidência fotográfica | Onboarding form |
| | `hasRegulatorySign` | Sinalização regulamentar | Onboarding form |
| | `yellowPhaseCrossing` | Se cruzou em fase amarela | Onboarding form |
| | `cellphoneCircumstance` | Circunstância do uso de celular | Onboarding form |
| | `refusedTest` | Se recusou teste do etilômetro | Onboarding form |
| **Proibidos de serem inventados** | `realDriverName`, `realDriverCpf`, `realDriverCnh` não devem ser inventados — vêm da declaração do cidadão | | Contrato de integridade |
| **Campos esperados na saída da análise** | `analysis.id` | ID da análise gerada | Engine output |
| | `analysis.caseId` | ID do caso associado | Engine output |
| | `analysis.overallSuccessRate` | Taxa de sucesso estimada (0-100%) | `CaseAnalysis` type |
| | `analysis.detectedInconsistencies[].description` | Descrição da inconsistência | `CaseAnalysis` type |
| | `analysis.detectedInconsistencies[].rule` | Regra que detectou a inconsistência | `CaseAnalysis` type |
| | `analysis.dataGaps[].field` | Campo com dado faltante | `CaseAnalysis` type |
| | `analysis.dataGaps[].description` | Razão da lacuna | `CaseAnalysis` type |
| | `analysis.recommendedArguments[].id` | ID do argumento | `CaseAnalysis` type |
| | `analysis.recommendedArguments[].title` | Título do argumento | `CaseAnalysis` type |
| | `analysis.infractionClassification.family` | Família da infração | `CaseAnalysis` type |
| | `analysis.integrityScore` | Score de integridade 0-100 | `CaseAnalysis` type |