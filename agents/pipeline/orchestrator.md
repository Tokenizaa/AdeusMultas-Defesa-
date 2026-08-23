# Pipeline Orchestrator — Adeus Multa

## Objetivo

Orquestrar a execução sequencial dos agentes especializados, garantindo que cada um receba os dados corretos do agente anterior e passe os resultados enriquecidos para o próximo.

## Fluxo completo

```
USER INPUT
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ CAMADA 1 — EXPERIÊNCIA                                              │
│                                                                     │
│ onboarding-ux ──► onboarding-copywriter ──► legal-ux-reviewer       │
│   Ordem das        Escrever textos         Traduzir jargão          │
│   perguntas        do onboarding           para linguagem simples   │
└─────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ CAMADA 2 — OCR                                                      │
│                                                                     │
│ ocr-classifier ──► ocr-extractor ──► ocr-validator                  │
│   Identificar       Extrair campos      Cruzar OCR vs                │
│   documento         do documento        usuário vs base             │
└─────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ CAMADA 3 — CONHECIMENTO JURÍDICO                                    │
│                                                                     │
│ legal-classifier ──► legal-researcher ──► legal-strategist          │
│   Classificar        Consultar base      Montar estratégia          │
│   infração           jurídica            de defesa                  │
└─────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ CAMADA 4 — DOCUMENTO                                                │
│                                                                     │
│ document-planner ──► document-drafter ──► legal-style-reviewer      │
│   Montar índice     Escrever seções      Revisar texto             │
│                                                                     │
│ document-layout ──► citation-validator                              │
│   Formatar A4       Verificar citações                              │
└─────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ CAMADA 5 — QUALIDADE                                                │
│                                                                     │
│ legal-auditor ──► hallucination-checker                             │
│   Auditoria        Detectar alucinações                             │
│                                                                     │
│ contradiction-checker ──► completeness-reviewer                     │
│   Detectar          Verificar                                       │
│   contradições      completude                                      │
└─────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ CAMADA 6 — PRODUTO                                                  │
│                                                                     │
│ pricing-agent ──► retention-agent ──► analytics-agent               │
│   Definir preço    Evitar abandono    Analisar métricas             │
└─────────────────────────────────────────────────────────────────────┘
    │
    ▼
OUTPUT: PDF + DOCX + Resumo + Hash
```

## Contratos entre camadas

Cada camada recebe e enriquece um `CaseContext` que flui pelo pipeline:

```
interface CaseContext {
  // Preenchido durante o onboarding
  user: { nome, cpf, cnh, endereco, cidade, uf }
  infraction: { placa, numero_auto, orgao_autuador, codigo_infracao, data, fotos? }
  service: { tipo, preco }

  // Preenchido pelo OCR
  ocr: { raw_text, document_type, extracted_fields, confidence }
  validated_fields: { campo, valor, fonte_confianca }[]

  // Preenchido pela camada jurídica
  classification: LegalClassification
  legal_research: LegalResearch
  strategy: Strategy

  // Preenchido pela camada de documento
  document_plan: DocumentPlan
  draft: Draft
  reviewed_draft: Draft

  // Preenchido pela camada de qualidade
  audit: AuditReport
  hallucination_check: HallucinationReport
  contradictions: ContradictionReport
  completeness: CompletenessReport

  // Metadados
  metadata: {
    document_id: string,
    version: string,
    hash: string,
    steps_completed: string[]
  }
}
```

## Regras do pipeline

1. Cada agente SÓ acessa a camada de dados que lhe compete
2. Nenhum agente modifica dados de camadas anteriores
3. Se um agente falha, o pipeline registra o erro e tenta com dados parciais
4. Agentes de qualidade podem solicitar reprocessamento de agentes anteriores
5. O pipeline só avança quando o agente atual retorna sucesso
6. Logs de cada agente são persistidos para auditoria

## Fluxo de erro

```
Agente falha
    │
    ▼
Registra erro no log
    │
    ▼
Pipeline verifica se é recuperável
    │
    ├── Sim → Tenta novamente (max 3x)
    │         ├── Sucesso → continua
    │         └── Falha  → usa dados parciais + aviso
    │
    └── Não → Retorna erro amigável ao usuário
              "Não foi possível completar uma etapa.
               Seus dados foram salvos. Tente novamente."
```
