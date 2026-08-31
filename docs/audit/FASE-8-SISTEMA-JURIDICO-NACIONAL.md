# Fase 8 — Sistema Jurídico Nacional Continuamente Atualizável

> Status: IMPLEMENTADO no que é deterministicamente produzível; demais itens são
> KNOWLEDGE_GAP estruturais (dependem de prova documental do usuário, não de
> lógica determinística). Nada aqui inventa legislação, jurisprudência ou fato.

## P0 — Legislação, Resoluções e Vigência Temporal ✅

As 7 regras determinísticas do `ExpertRuleEngine` têm `validFrom`/`validUntil`
verificados e testados:

| Regra | Vigência (`validFrom`) | Fonte |
|-------|------------------------|-------|
| R1 `RULE_DECADENCIA_30_DIAS` | 1998-01-22 | CTB |
| R2 `RULE_RADAR_CALIBRACAO_12M` | 2020-11-01 | Res. CONTRAN 798/2020 |
| R3 `RULE_CONVERSAO_ADVERTENCIA_267` | 2021-04-12 | Lei 14.071/2020 |
| R4 `RULE_LEI_SECA_TERMO_432` | 2013-01-29 | Res. CONTRAN 432/2013 |
| R5 `RULE_AUTUACAO_SEM_ABORDAGEM_MBFT` | 2023-01-02 | Res. CONTRAN 985/2022 |
| R6 `RULE_SINALIZACAO_INSUFICIENTE_90` | 1998-01-22 | CTB |
| R7 `RULE_INMETRO_CONSIDERED_SPEED_ERROR` | 2020-11-01 | Res. CONTRAN 798/2020 |

Temporal validity aplicada por `ExpertRuleEngine.isRuleActiveAtDate`. Falhas nesta
camada (uma regra aplicada a fato anterior) são regressões cobertas por
`tests/audit/national-coverage.test.ts` (72 testes, inclusos casos pré/pós Lei).

## P0 — Jurisprudência Relevante ✅

Todos os **52 ARGs** do `ARGUMENTS_CATALOG` possuem `relatedJurisprudence` e
`legalBase` preenchidos (auditoria automática: 0 vazios). As 7 teses
deterministicamente acionáveis apontam jurisprudência ancorada (ex: Súmula 312 STJ,
REsp, TJ-SP/TRF-4). Nunca inventada: validador `integrity-validator` sinaliza
`ARGUMENT_NO_LEGAL_BASE` caso uma tese sem base entre no fluxo.

## P1 — Especialização por UF/Órgão ✅ (já existia)

`CanonicalKnowledgeRegistry` + `ORGANS_DB` cobrem as 27 UFs sem leakage entre
órgãos (testado em national-coverage). Cada UF resolve seus próprios dados.

## P1 — Novas Tecnologias de Fiscalização

Sem regra determinística adicionada. Racional: não há regra jurídica de
fiscalização por drone/OCR/etc. universalmente vigente que permita dedução
determinística sem fundamento legal específico verificado. **KNOWLEDGE_GAP**:
adicionar regra exige base legal real (resolução/lei vigente) antes de qualquer
código. Sinalizar no conhecimento quando a fonte for confirmada.

## P1 — Resolver ARG-012 (Parada sobre Linha de Retenção)

Não é dedutível deterministicamente do AIT: depende da prova (foto panorâmica
demonstrando fila à frente). Estado atual correto: **não há regra que o dispare
automaticamente**; disponível como seleção manual em modo profissional (advogado
assume responsabilidade quando tem a prova). **KNOWLEDGE_GAP estrutural.**

## P1 — Coletar Dados no Onboarding para ARG-019/020

ARG-019 (viva-voz/Bluetooth) e ARG-020 (ausência/ilegibilidade placa R-6a) exigem
foto/manual anexado. Não há campo de query determinístico que os torne acionáveis
sem prova. **KNOWLEDGE_GAP estrutural**: requer captura de evidência (upload)
antes de recomendar.

## P2 — Evidências para ARG-021/022/024/025 ✅ (implementado)

**Implementado nesta rodada**: `buildDocumentRollTextForAnalysis`
(`src/core/documents/document-roll.ts`) mescla os documentos obrigatórios do
procedimento com as **evidências canônicas das teses detectadas**
(`ArgumentModel.requirements`). O `DocumentAssemblyEngine` usa a versão dirigida
por análise quando há `analysis`, garantindo que a minuta peça a prova da tese
(ex: Certidão PSInmetro para ARG-001). Nunca inventa evidência: id fora do
catálogo é ignorado. Testes dedicados.

## Guarda de integridade (não alterar)

- FAIL CLOSED: tese determinística só dispara com `requiredData` presente;
  ausência => `dataGaps` (nunca vira vício).
- IA apenas refina prosa; validador descarta saída de IA inválida.
- Monitoramento: toda mudança de fonte vai a `PENDING_REVIEW` humana; nunca
  auto-aplica tese.
- Validador nunca corrige silenciosamente.

## Dívidas / próximos passos

1. **Captura de evidência no onboarding** (upload foto/vídeo) para liberar
   ARG-012/019/020/021/022/024 como acionáveis com prova — exige feature de
   upload + flag `hasEvidence` em `InfractionData`.
2. **Regras de fiscalização por nova tecnologia**: somente após base legal
   vigente confirmada.
3. **Rol dirigido por análise na UI**: expor quais evidências a minuta espera
   (já no texto; falta checklist visual na etapa 4).
