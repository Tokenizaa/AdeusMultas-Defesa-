# Matriz de Completude — cassacao

| Categoria | Campo | Descrição | Fonte |
|---|---|---|---|
| **Obrigatórios (Input)** | `infractionCode` | Código da infração (ex: `757-90`) | Onboarding form |
| | `ctbArticle` | Artigo do CTB (ex: `Art. 165-A, CTB`) | Onboarding form |
| | `severity` | Gravidade da infração (`leve`/`media`/``gravissima`) | Onboarding form |
| | `fineAmount` | Valor da multa em reais | Onboarding form |
| | `points` | Pontos na carteira | Onboarding form |
| | `dateTime` | Data e hora da autuação (dd/mm/aaaa HH:MM) | Onboarding form |
| | `location` | Local da autuação | Onboarding form |
| | `autuadorBody` | Órgão autuador (ex: `DETRAN-SP`) | Onboarding form |
| | `aitNumber` | Número do AUTO DE INFRAÇÃO | Onboarding form |
| | `refusedTest` | Se recusou o teste do etilômetro | Onboarding form (obrigatória para Cassação) |
| | `hasPreviousInfractionsLast12Months` | Se tem infrações nos últimos 12 meses | Onboarding form |
| | `hasPsychomotorTerm` | Termo de constatação de sinais psicomotores (Lei Seca) | Onboarding form |
| | `thirdPartyDriverDeclaration` | Se terceiro declarou que não conduzia | Onboarding form |
| **Obrigatórios (Output - Análise)** | `analysis.recommendedProcedure` | Deve ser `cassacao_cnh` | Engine contract |
| | `analysis.summaryReasoning` | Justificativa com >50 caracteres | Engine contract |
| | `analysis.evaluatedRules` | Array não-vazio de regras avaliadas | Engine contract |
| | `analysis.detectedInconsistencies` | Array de inconsistências detectadas | Engine contract |
| | `analysis.dataGaps` | Array de lacunas de dados identificadas | Engine contract |
| | `analysis.recommendedArguments` | Array de argumentos recomendados | Engine contract |
| | `analysis.recommendedProcedure` | Deve ser `cassacao_cnh` | Test assertion |
| **Condicionais (Input)** | `notificationExpeditionDate` | Data de expedição da notificação | Onboarding form |
| | `defenseDeadline` | Prazo para defesa | Onboarding form |
| **Opcionais (Input)** | `hasAgentDetailedObservations` | Observações circunstanciadas do agente | Onboarding form |
| | `hasPhotoProof` | Evidência fotográfica | Onboarding form |
| | `hasPreviousInfractionsLast12Months` (já coberto acima) | | Onboarding form |
| | `yellowPhaseCrossing` | Se cruzou em fase amarela | Onboarding form |
| | `cellphoneCircumstance` | Circunstância do uso de celular | Onboarding form |
| | `hasRegulatorySign` | Sinalização regulamentar | Onboarding form |
| **Proibidos de serem inventados** | `refusedTest` deve ser consistente com o restante dos dados | | Contrato de integridade |
| | `thirdPartyDriverDeclaration` deve ser verídico | | Lógica de negócio |
| **Campos esperados na saída da análise** | `analysis.id` | ID da análise gerada | Engine output |
| | `analysis.caseId` | ID do caso associado | Engine output |
| | `analysis.overallSuccessRate` | Taxa de sucesso estimada (0-100%) | `CaseAnalysis` type |
| | `analysis.detectedInconsistencies[].description` | Descrição da inconsistência | `CaseAnalysis` type |
| | `analysis.detectedInconsistencies[].rule` | Regra que detectou a inconsistência | `CaseAnalysis` type |
| | `analysis.dataGaps[].field` | Campo com dado faltante | `CaseAnalysis` type |
| | `analysis.dataGaps[].description` | Razão da lacuna | `CaseAnalysis` type |
| | `analysis.recommendedArguments[].id` | ID do argumento (ex: `ARG-045`) | `CaseAnalysis` type |
| | `analysis.recommendedArguments[].title` | Título do argumento | `CaseAnalysis` type |
| | `analysis.infractionClassification.family` | Família da infração | `CaseAnalysis` type |
| | `analysis.integrityScore` | Score de integridade 0-100 | `CaseAnalysis` type |