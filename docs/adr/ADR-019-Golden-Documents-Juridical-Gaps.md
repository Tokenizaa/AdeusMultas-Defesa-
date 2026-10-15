# ADR-019: Golden Documents — Gaps Jurídicos Identificados e Decisões Pendentes

**Data**: 2026-10-03  
**Status**: PROPOSTO  
**Owner**: @supervisor + @defesa-transito + @base-legal  
**Contexto**: Validação da Fase 12 — Acurácia e Diferenciação dos 10 Golden Documents (GD-01..GD-10)

---

## 1. Resumo Executivo

A execução dos 10 Golden Documents contra o runtime canônico (Cloudflare Worker + Supabase `llmxnpgjpxcvyrqjkfwb`) produziu resultados mensuráveis que **confirmam a validade técnica da arquitetura**, mas revelam **gaps jurídicos persistentes** que exigem decisão explícita de domínio, não correção de código.

---

## 2. Evidência Técnica Atual (Snapshot 2026-10-03)

### 2.1 Métricas Principais

| Métrica | Resultado Anterior (FASE-12) | Resultado Atual | Evolução |
|---------|-------------------------------|-----------------|----------|
| GD executados pelo runtime canônico | 10/10 | 10/10 | ✅ Mantido |
| Análises únicas (fingerprint conteúdo) | **6/10** | **8/10** | ✅ **+33%** |
| Conjuntos de argumentos únicos | **4/10** | **8/10** | ✅ **+100%** |
| Documentos textualmente próprios (hash) | 10/10 | 10/10 | ✅ Mantido |
| Proveniência KB (argumentos com fonte) | **0/40** | **12/12** (100%) | ✅ **RESOLVIDO** |
| Quality Gate PASS | **0/10** | **5/10** | ✅ **Parcial** |
| Similaridade máxima entre pares | 0.9718 | 0.9533 | ⚠️ Leve melhoria |
| RAG chunks recuperados | 0 | 50 | ✅ **RESOLVIDO** |
| Procedimentos distintos | 1/10 | 3/10 | ⚠️ Parcial |

### 2.2 Detalhamento por Golden Document

| GD | Infração | Args | RAG Chunks | Provenance | Quality Gate | Integrity |
|----|----------|------|------------|------------|--------------|-----------|
| GD-01 | 745-50 (velocidade) | ARG-051,ARG-002,ARG-049 | 5 | 7 | ❌ FAIL:ESTRUTURA | ✅ |
| GD-02 | 745-50 (velocidade) | ARG-051,ARG-002,ARG-049 | 5 | 7 | ❌ FAIL:ESTRUTURA | ✅ |
| GD-03 | 745-50 (velocidade) | ARG-002,ARG-049 | 5 | 6 | ✅ PASS | ✅ |
| GD-04 | 745-50 (velocidade) | ARG-051,ARG-002,ARG-006,ARG-049 | 5 | 8 | ❌ FAIL:ESTRUTURA | ✅ |
| GD-05 | 745-50 (velocidade) | ARG-001,ARG-051,ARG-002,ARG-049 | 5 | 10 | ❌ FAIL:ESTRUTURA | ✅ |
| GD-06 | PRF (federal) | ARG-027 | 5 | 5 | ✅ PASS | ✅ |
| GD-07 | Semáforo | ARG-009,ARG-010 | 5 | 2 | ✅ PASS | ✅ |
| GD-08 | Celular | ARG-015,ARG-019 | 5 | 3 | ✅ PASS | ✅ |
| GD-09 | Estacionamento | ARG-024,ARG-020 | 5 | 2 | ✅ PASS | ✅ |
| GD-10 | 745-50 (velocidade) | ARG-051,ARG-002,ARG-049 | 5 | 7 | ❌ FAIL:ESTRUTURA | ✅ |

---

## 3. Gaps Jurídicos Identificados (Requerem Decisão + ADR)

### 3.1 A-01: Análise Genérica Residual (8/10 únicos → 2 colisões)
**Evidência**: GD-01 e GD-10 (ambos 745-50 velocidade até 20%) produzem fingerprint de análise idêntico.
**Causa**: KB não distingue contextos de velocidade (radar fixo vs móvel, margem de erro, localização).
**Decisão necessária**: Diferenciar teses por subtipo de radar / margem de erro / tipo de via.

### 3.2 A-02: ARG-002 (Art. 90 CTB) em 6/10 casos, inclusive não-velocidade
**Evidência**: ARG-002 aparece em GD-01,02,03,04,05,10 (velocidade) mas **também** em GD-07 (semáforo), GD-08 (celular), GD-09 (estacionamento).
**Causa**: Rule Engine não filtra ARG-002 por relevância à infração específica.
**Decisão necessária**: ARG-002 deve ser restrito a casos onde Art. 90 é materialmente relevante.

### 3.3 A-03: Procedimentos Distintos (apenas 3/10)
**Evidência**: 5 casos de velocidade (745-50) + GD-06 (PRF) todos usam `recurso_jari`. GD-03 usa `recurso_cetran`. GD-08/GD-09 usam procedimentos próprios.
**Causa**: Rule Engine não deriva procedimento por competência jurisdicional + tipo de infração.
**Decisão necessária**: Mapear procedimento correto por (UF × tipo_infração × instância).

### 3.4 A-04: Quality Gate FAIL:ESTRUTURA (5/10 casos)
**Evidência**: GD-01,02,04,05,10 falham no check ESTRUTURA do Quality Gate.
**Causa**: Documentos de velocidade não incluem citações obrigatórias de velocidade medida/considerada/radar/aferição.
**Decisão necessária**: Quality Gate deve validar presença de fatos decisivos por tipo de infração.

### 3.5 A-05: Similaridade Textual Alta (0.95 entre GD-01/GD-10)
**Evidência**: 5 pares de velocidade com >90% similaridade; máximo 0.9533.
**Causa**: Template de defesa usa blocos fixos; argumentos autorizados são idênticos para mesma infração.
**Decisão necessária**: Aceitar similaridade alta como esperado para mesma infração, OU diversificar templates.

### 3.6 A-06: Cobertura Estadual Incompleta (7 UFs sem docs)
**Evidência**: DF, MA, MT, PE, RN, RO, SE sem documentos na KB. BA fora de escopo.
**Decisão necessária**: Priorizar coleta para essas UFs ou aceitar limitação conhecida.

### 3.7 A-07: Vigência Normativa Desconhecida (66/66 NULL)
**Evidência**: Todos `effective_from`/`effective_until` NULL → Quality Gate não valida temporalidade.
**Decisão necessária**: Popular vigências ou desabilitar check temporal no Quality Gate.

### 3.8 A-08: Jurisdição Não Estruturada
**Evidência**: UF extraída via regex heurística do `autuadorBody`; `filter_jurisdiction` frágil.
**Decisão necessária**: Adicionar campo `jurisdiction_uf` estruturado no Case.

---

## 4. Decisões Propostas

### Decisão 1: ACEITAR similaridade alta para mesma infração (A-05)
**Justificativa**: Casos com mesma infração (745-50) e mesma jurisdição **devem** produzir defesas similares. A diferenciação deve vir de fatos do caso (velocidade, radar, local), não de variação textual arbitrária.
**Ação**: Documentar como comportamento esperado. Não alterar template.

### Decisão 2: CORRIGIR ARG-002 para ser contextual (A-02)
**Justificativa**: ARG-002 (Art. 90 - autoridade competente) não se aplica a todas as infrações. Aparecer em celular/semáforo/estacionamento é juridicamente incorreto.
**Ação**: Modificar Rule Engine para condicionar ARG-002 a infrações onde competência é discutível (ex: velocidade com radar municipal vs estadual).

### Decisão 3: DERIVAR PROCEDIMENTO por (UF × Infração × Instância) (A-03)
**Justificativa**: Procedimento `recurso_jari` não serve para todos. PRF → recurso interno; CETRAN → recurso_cetran; JARI municipal → defesa prévia + recurso_jari.
**Ação**: Implementar tabela de mapeamento procedimento por jurisdição/tipo.

### Decisão 4: QUALITY GATE — Validar Fatos Decisivos por Tipo (A-04)
**Justificativa**: Casos de velocidade sem citação de velocidade/radar/aferição são juridicamente frágeis.
**Ação**: Adicionar regras no Quality Gate: se `infraction_code` em {745-50, 746-30, ...} → exigir `velocidade_medida`, `velocidade_considerada`, `radar_equipment_id`, `afericao` no documento.

### Decisão 5: POPULAR VIGÊNCIAS ou DESABILITAR CHECK TEMPORAL (A-07)
**Justificativa**: 66 docs sem vigência = risco de citar norma revogada. Opções: (a) popular manualmente, (b) integrar fonte oficial (DOU/Planalto), (c) desabilitar check com aviso.
**Ação**: Recomendar (a) para CTB/CONTRAN + (c) para docs estaduais até coleta completa.

### Decisão 6: ESTRUTURAR JURISDIÇÃO NO CASE (A-08)
**Justificativa**: Heurística regex em `autuadorBody` falha para órgãos com nomes semelhantes.
**Ação**: Adicionar coluna `jurisdiction_uf` em `cases` (DDL) + popular no onboarding.

---

## 5. Plano de Ação

| Prioridade | Item | Responsável | Esforço | Dependência |
|------------|------|-------------|---------|-------------|
| P0 | Decisão 2 (ARG-002 contextual) | @defesa-transito + @base-legal | Baixo | Nenhuma |
| P0 | Decisão 4 (Quality Gate fatos decisivos) | @defesa-transito | Médio | Decisão 2 |
| P1 | Decisão 3 (Procedimento derivado) | @defesa-transito + @base-legal | Médio | Base legal UFs |
| P1 | Decisão 6 (Jurisdiction UF no Case) | @banco + @defesa-transito | Baixo | DDL + onboarding |
| P2 | Decisão 5 (Vigências) | @conhecimento-juridico | Alto | Coleta/integração fontes |
| P3 | Decisão 1 (Documentar similaridade) | @documentacao | Baixo | Nenhuma |

---

## 6. Métricas de Sucesso Pós-Implementação

| Métrica | Target |
|---------|--------|
| Análises únicas | 10/10 |
| Conjuntos argumentos únicos | 10/10 |
| Quality Gate PASS | 10/10 |
| Procedimentos distintos | ≥ 8/10 |
| Similaridade máxima (casos distintos) | < 0.85 |
| Argumentos sem suporte KB | 0 |
| UFs cobertas | 27/27 |

---

## 7. Referências

- **FASE-12-GOLDEN-DOCUMENT-ACCURACY-2026-09-25.md**: Relatório original com gaps A-01..A-14
- **FASE-12.5-GOLDEN-PATH-RESULTADO-2026-09-25.md**: Validação cadeia técnica
- **FASE-12.6-AUDITORIA-INTEGRADA-FINAL-2026-09-25.md**: Auditoria final integrada
- **FASE-9-RECONCILIACAO-DETERMINISTICA.sql**: Acervo KB restaurado (39 sources, 66 docs, 58 chunks, 58 embeddings)
- **commit ca2e6950**: Correções Fase 12 (classificação, regras por família, evaluatedRules, procedimento derivado)
- **commit 9b18c4c**: Correção medição provenance (analysis.recommendedArguments[*].provenance)

---

## 8. Aprovação

| Papel | Nome | Assinatura | Data |
|-------|------|------------|------|
| @supervisor | | | |
| @defesa-transito | | | |
| @base-legal | | | |

> **Nota**: Este ADR deve ser aprovado antes de implementar as correções P0/P1. As decisões 2, 3, 4 alteram a fundamentação jurídica emitida ao cliente.