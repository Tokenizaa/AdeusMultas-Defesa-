# Matriz de Completude — conversao_advertencia

| Categoria | Campo | Descrição | Fonte |
|---|---|---|---|
| **Obrigatórios (Input)** | `infractionCode` | Código da infração (ex: `735-80`) | Onboarding form |
| | `ctbArticle` | Artigo do CTB (ex: `Art. 221, CTB`) | Onboarding form |
| | `severity` | Gravidade da infração (`leve`/`media`/``gravissima`) | Onboarding form |
| | `fineAmount` | Valor da multa em reais | Onboarding form |
| | `points` | Pontos na carteira | Onboarding form |
| | `dateTime` | Data e hora da autuação (dd/mm/aaaa HH:MM) | Onboarding form |
| | `location` | Local da autuação | Onboarding form |
| | `autuadorBody` | Órgão autuador (ex: `DETRAN-SP`) | Onboarding form |
| | `aitNumber` | Número do AUTO DE INFRAÇÃO | Onboarding form |
| | `hasPreviousInfractionsLast12Months` | Se não há infrações anteriores | Onboarding form (obrigatório para validação) |
| **Obrigatórios (Output - Análise)** | `analysis.recommendedProcedure` | Deve ser `conversao_advertencia` | Engine contract |
| | `analysis.summaryReasoning` | Justificativa com >50 caracteres | Engine contract |
| | `analysis.evaluatedRules` | Array não-vazio de regras avaliadas | Engine contract |
| | `analysis.detectedInconsistencies` | Array de inconsistências detectadas | Engine contract |
| | `analysis.dataGaps` | Array de lacunas de dados identificadas | Engine contract |
| | `analysis.recommendedArguments` | Array de argumentos recomendados | Engine contract |
| | `analysis.recommendedProcedure` | Deve ser `conversao_advertencia` | Test assertion |
| **Condicionais (Input)** | `notificationExpeditionDate` | Data de expedição da notificação | Onboarding form |
| | `defenseDeadline` | Prazo para defesa | Onboarding form |
| **Opcionais (Input)** | `refusedTest` | Se recusou teste do etilômetro | Onboarding form |
| | `hasPreviousInfractionsLast12Months` | Histórico de infrações (já coberto acima) | Onboarding form |
| | `hasAgentDetailedObservations` | Observações circunstanciadas do agente | Onboarding form |
| | `hasPhotoProof` | Evidência fotográfica | Onboarding form |
| | `cellphoneCircumstance` | Circunstância do uso de celular | Onboarding form |
| | `yellowPhaseCrossing` | Se cruzou em fase amarela | Onboarding form |
| **Proibidos de serem inventados** | `fineAmount` não deve ser inventado — deve vir do cálculo oficial ou do onboarding | | Contrato de integridade |
| **Campos esperados na saída da análise** | `analysis.id` | ID da análise gerada | Engine output |
| | `analysis.caseId` | ID do caso associado | Engine output |
| | `analysis.overallSuccessRate` | Taxa de sucesso estimada (0-100%) | `CaseAnalysis` type |
| | `analysis.detectedInconsistencies[].description` | Descrição da inconsistência | `CaseAnalysis` type |
| | `analysis.detectedInconsistencies[].rule` | Regra que detectou a inconsistência | `CaseAnalysis` type |
| | `analysis.dataGaps[].field` | Campo com dado faltante | `CaseAnalysis` type |
| | `analysis.dataGaps[].description` | Razão da lacuna | `CaseAnalysis` type |
| | `analysis.recommendedArguments[].id` | ID do argumento (ex: `ARG-051`) | `CaseAnalysis` type |
| | `analysis.recommendedArguments[].title` | Título do argumento | `CaseAnalysis` type |
| | `analysis.infractionClassification.family` | Família da infração | `CaseAnalysis` type |
| | `analysis.integrityScore` | Score de integridade 0-100 | `CaseAnalysis` type |