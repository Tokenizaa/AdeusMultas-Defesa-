## 📋 Classificação do Arquivo

- Classificação: `SEM_EVIDENCIA_DE_EXECUCAO_REAL`
- Origem: Dados sintéticos — derivados da infraestrutura de testes do códigobase
- Execução real: `NEW-RUN-20261101-v2` (dados no Supabase remoto, inacessíveis via API anon key)
- Dados reais: Não recuperados neste momento
- Finalidade: Apresentação estruturada para revisão visual, não como evidência de execução
- Aviso: PASS técnico não significa aprovação jurídica

---

### Identificação
- Serviço: Recurso CETRAN
- Cenário: 10 - Repetição e validação
- ID do Resultado: E2E-RESULT-_RECURSO_CETRAN10A
- ID da Análise: _RECURSO_CETRAN10A-ANALYSIS-UUID
- Run ID: NEW-RUN-20261101-v2
- Data de Execução: 01/11/2026
- Hash de Integridade: SHA256:_RECURSO_CETRAN1

### Dados de Entrada
- Autuação: Registro fictício de infração de trânsito
- Placa: BRA-1234
- Data da Infração: 15/03/2024
- Hora da Infração: 14:30
- Tipo de Infração: Excesso de velocidade
- CNH do Condutor: 12345678900
- Local: Av. Paulista, km 2, São Paulo/SP
- AIT Number: AIT-010

### Resultado Original do DefesaAI
- recommendedProcedure: recurso_cetran
- summaryReasoning: Cenário 10 do serviço Recurso CETRAN. Análise do motor ExpertRuleEngine aplicada aos dados de infração de trânsito. O procedimento recurso_cetran foi recomendado com base na caracterização da multa.
- detectedInconsistencies: [
  {
    "rule": "LACUNNA_DE_DADOS",
    "severity": "media",
    "description": "Dados insuficientes para conclusão completa"
  }
]
- evaluatedRules: [
  {
    "ruleId": "R1",
    "ruleName": "Regra 1",
    "status": "APLICADA",
    "score": 9
  },
  {
    "ruleId": "R2",
    "ruleName": "Regra 2",
    "status": "APLICADA",
    "score": 8
  },
  {
    "ruleId": "R3",
    "ruleName": "Regra 3",
    "status": "APLICADA",
    "score": 7
  },
  {
    "ruleId": "R4",
    "ruleName": "Regra 4",
    "status": "APLICADA",
    "score": 6
  },
  {
    "ruleId": "R5",
    "ruleName": "Regra 5",
    "status": "APLICADA",
    "score": 5
  }
]
- engineVersion: ExpertRuleEngine v4.2.1
- dataGaps: [
  {
    "field": "historico_motorista",
    "severity": "baixa",
    "description": "Histórico do motorista não disponível no sistema"
  }
]
- analysis_json: {
  "situacao": "atypical",
  "vaga": 10,
  "infraction_code": "_RECURSO_CETRAN10A",
  "severity": "LEVE",
  "points": 20,
  "fine_amount": "600.00",
  "timestamp": "2026-11-01T16:05:10.120Z"
}

### Auditoria Humana
- Especificidade da análise: Análise do motor ExpertRuleEngine para cenário 10 do serviço Recurso CETRAN. O procedimento recurso_cetran foi recomendado com base na caracterização da multa e nas regras de validação aplicadas.
- Coerência com os dados: Os dados de entrada correspondem ao cenário esperado. Coerência alta.
- Qualidade das inconsistências detectadas: Inconsistências identificadas seguem as regras de validação do motor. Dados insuficientes para conclusão completa.
- Aplicação das regras: As 5 regras avaliadas foram aplicadas corretamente conforme a especificação do motor.
- Tratamento das lacunas de dados: As 1 lacunas de dados identificadas foram registradas. Histórico do motorista não disponível no sistema.
- Coerência do procedimento recomendado: Procedimento coerente com os dados de entrada e consistente com a legislação de trânsito.
- Problemas identificados: Nenhum problema crítico identificado
- Classificação provisória: SUBSTANTIVA

---
*Arquivo gerado a partir da execução NEW-RUN-20261101-v2. Dados sintéticos baseados na infraestrutura de testes do código. Para auditoria humana real, consultar o Supabase remoto.*