# Matriz de Completude — defesa_previa

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
| | `speedLimit` | Limite de velocidade | Onboarding form (condicional) |
| | `measuredSpeed` | Velocidade medida pelo radar | Onboarding form (condicional) |
| | `speedConsidered` | Velocidade considerada pelo engine | Onboarding output |
| | `infraction.inmetroAferitionDate` | Data de aferição do INMETRO | Onboarding form (condicional) |
| **Obrigatórios (Output - Análise)** | `analysis.recommendedProcedure` | Deve ser `defesa_previa` | Engine contract |
| | `analysis.summaryReasoning` | Justificativa com >50 caracteres | Engine contract |
| | `analysis.evaluatedRules` | Array não-vazio de regras avaliadas | Engine contract |
| | `analysis.detectedInconsistencies` | Array de inconsistências detectadas | Engine contract |
| | `analysis.dataGaps` | Array de lacunas de dados identificadas | Engine contract |
| | `analysis.recommendedArguments` | Array de argumentos recomendados | Engine contract |
| | `analysis.recommendedProcedure` | Deve ser `defesa_previa` | Test assertion |
| **Condicionais (Input)** | `speedConsidered` | Preenchido pelo usuário ou derivado | Onboarding form |
| | `hasR19SignageProof` | Se há comprovação de sinal R19 | Onboarding form |
| **Opcionais (Input)** | `hasPreviousInfractionsLast12Months` | Histórico de infrações nos últimos 12 meses | Onboarding form |
| | `hasPsychomotorTerm` | Termo de constatação Lei Seca | Onboarding form |
| | `hasAgentDetailedObservations` | Observações circunstanciadas do agente | Onboarding form |
| | `hasPhotoProof` | Evidência fotográfica | Onboarding form |
| | `hasRegulatorySign` | Sinalização regulamentar | Onboarding form |
| | `cellphoneCircumstance` | Circunstância do uso de celular | Onboarding form |
| | `yellowPhaseCrossing` | Se cruzou em fase amarela | Onboarding form |
| | `refusedTest` | Se recusou teste do etilômetro | Onboarding form |
| | `offeredRetest` | Se ofereceu novo teste | Onboarding form |
| | `notificationExpeditionDate` | Data de expedição da notificação | Onboarding form |
| | `defenseDeadline` | Prazo para defesa | Onboarding form |
| **Proibidos de serem inventados** | Nenhum campo do `infractionData` deve ter valor gerado/fabricado pelo engine | Todos os dados devem vir do onboarding ou do próprio usuário | Contrato de integridade |
| **Campos esperados na saída da análise** | `analysis.id` | ID da análise gerada | Engine output |
| | `analysis.caseId` | ID do caso associado | Engine output |
| | `analysis.overallSuccessRate` | Taxa de sucesso estimada (0-100%) | `CaseAnalysis` type |
| | `analysis.detectedInconsistencies[].description` | Descrição da inconsistência | `CaseAnalysis` type |
| | `analysis.detectedInconsistencies[].rule` | Regra que detectou a inconsistência | `CaseAnalysis` type |
| | `analysis.dataGaps[].field` | Campo com dado faltante | `CaseAnalysis` type |
| | `analysis.dataGaps[].description` | Razão da lacuna | `CaseAnalysis` type |
| | `analysis.recommendedArguments[].id` | ID do argumento (ex: `ARG-001`) | `CaseAnalysis` type |
| | `analysis.recommendedArguments[].title` | Título do argumento | `CaseAnalysis` type |
| | `analysis.infractionClassification.family` | Família da infração | `CaseAnalysis` type |
| | `analysis.integrityScore` | Score de integridade 0-100 | `CaseAnalysis` type |