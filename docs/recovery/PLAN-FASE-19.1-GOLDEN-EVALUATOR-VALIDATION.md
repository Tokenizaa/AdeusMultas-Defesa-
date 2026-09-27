# FASE 19.1 - PLANO DE VALIDAÇÃO DO GOLDEN EVALUATOR

## Objetivo
Validar e refinar o instrumento de medição (Golden Document Test) antes de usá-lo para julgar a qualidade do sistema, garantindo que os resultados sejam métricas confiáveis e não sejam contaminados por limitações metodológicas do próprio avaliador.

## Atividades

### 1. Validação dos 10 casos de teste (Golden Dataset)
- Revisar cada caso (GD-01 a GD-10) para garantir:
  - Fidelidade dos fatos esperados aos dados de entrada
  - Consistência jurídica dos argumentos esperados
  - Ausência de contradições internas nos casos
  - Clareza nas características esperadas do documento
- Atualizar `expectedFacts`, `expectedIssues`, `expectedArguments` e `expectedDocumentCharacteristics` conforme necessário
- Documentar decisões de validação em comentários no código

### 2. Eliminação de comparações literais (string matching)
- Substituir verificações de strings exatas por:
  - **Extração de entidades**: Identificar e validar valores específicos (velocidades, timestamps, localizações, IDs de equipamento)
  - **Análise semântica**: Medir similaridade de significado usando técnicas de processamento de linguagem natural básicas
  - **Verificação de conceitos-chave**: Confirmar presença de elementos jurídicos essenciais, não de frases específicas
- Implementar funções auxiliares:
  - `extractSpeedValues(text): { limit: number?, measured: number?, considered: number? }`
  - `extractTimestamp(text): string?`
  - `extractLocation(text): string?`
  - `semanticSimilarity(str1, str2): number (0-1)`
  - `containsConcept(text, conceptKeywords): boolean`

### 3. Correção da avaliação de argumentos
- Corrigir a lógica bugada na verificação de seleção de argumentos:
  - De: `arg.selectedArguments?.includes(argId)` (incorreto - `arg` é um argumento individual)
  - Para: `analysis.selectedArguments?.includes(argId)` (correto - verifica se o argumento foi selecionado na análise)
- Implementar distinção clara entre:
  - **Recomendados**: Argumentos identificados pelo rule engine como aplicáveis
  - **Selecionados**: Subconjunto de recomendados realmente escolhidos para inclusão no documento
  - **Avaliados separadamente**: Qualidade da recomendação vs. qualidade da seleção
- Atualizar critérios de pontuação para refletir essa distinção

### 4. Aprimoramento da verificação jurídica
- Ir além de busca por termos genéricos (art. 218, resolução contran, etc.)
- Validar aplicabilidade contextual das referências legais:
  - Para casos de velocidade: verificar se citações de Art. 218 estão contextualizadas com parágrafos/incisos corretos
  - Para casos de sinalização: verificar se referências ao Art. 90 estão adequadas
  - Para Lei Seca: verificar se Art. 306 é citado com parágrafos relevantes (ex: recusa ao teste)
  - Para celular: verificar se Art. 252 é citado com exceções aplicáveis (ex: viva-voz)
- Implementar verificações de:
  - Existência real da norma citada
  - Aplicabilidade da norma ao tipo de infração
  - Correção do contexto jurídico (parágrafos, incisos, alíneas)
  - Consistência entre tese argumentativa e base legal citada

### 5. Refinamento da detecção de alucinação
- Manter detecção de obviamente falsos como camada básica:
  - Padrões como `art. 999`, `res. contran 9999` continuam úteis
- Adicionar verificações mais sutis:
  - **Verificação de consistência normativa**: Se um documento cita "Resolução CONTRAN X determina Y", verificar se Y realmente está na Resolução CONTRAN X
  - **Verificação de hierarquia legal**: Garantir que normas citadas não contradizem leis superiores (ex: resolução não pode contrariar CTB)
  - **Verificação de vigência**: Para normas com data de validade, verificar se estavam vigentes na data da infração
  - **Detecção de inversão lógica**: Identificar afirmações como "X é permitido quando na verdade a norma proíbe X"

### 6. Revisão dos critérios de estrutura documental
- Remover recompensas por características superficiais:
  - Comprimento do documento (>100 caracteres)
  - Presença de frases genéricas ("Senhor", "Excelentíssimo")
- Adicionar medição de qualidade jurídica real:
  - **Clareza argumentativa**: Mensurar coesão entre fatos, argumentos e pedidos
  - **Estrutura lógica**: Verificar sequencialidade adequada (fatos → preliminares → mérito → pedidos)
  - **Adequação ao tipo de petição**: Confirmar que o documento segue o modelo esperado para o tipo de recurso (jari, cetran, etc.)
  - **Precisão terminária**: Medir uso correto de termos jurídicos técnicos
  - **Concisão relevante**: Avaliar se o documento é suficientemente detalhado sem ser prolixo

### 7. Criação de testes de contradição
- Adicionar casos de teste específicos para validar detecção de inconsistências internas:
  - Casos onde o sistema deveria ser penalizado por:
    - Contradição entre análise e defesa (ex: análise identifica vício, mas defesa não o menciona)
    - Inconsistência entre argumentos selecionados (ex: dois argumentos que se excluem mutuamente)
    - Conflito entre fatos narrados e fundamento jurídico alegado
- Implementar verificações de:
  - Consistência entre análise.detectedInconsistencies e defesa.selectedArgumentIds
  - Não-exclusão de argumentos selecionados (verificar se não há pares mutuamente excludentes)
  - Alinhamento entre fatos narrados e base legal dos argumentos selecionados

### 8. Recalculação dos resultados com avaliador corrigido
- Executar o mesmo conjunto de 10 casos de teste contra o instrumento validado
- Documentar mudanças metodológicas realizadas
- Apresentar primeiros resultados confiáveis para tomada de decisão
- Estabelecer linha de base para melhorias futuras do sistema

## Critérios de Aceitação para FASE 19.1

O instrumento de medição será considerado válido quando:

1. **Fidelidade dos fatos**: ≥80% dos fatos esperados verdadeiros são detectados corretamente (tolerando variações semânticas razoáveis)
2. **Precisão de argumentos**: Avaliação de recomendação e seleção de argumentos correlaciona-se com julgamento especialista (≥0.7 kappa)
3. **Correção jurídica**: ≥90% das referências legais validadas são corretamente aplicadas ao contexto do caso
4. **Especificidade de alucinação**: Taxa de falsos positivos na detecção de alucinação <10% (medido por casos de controle conhecidamente corretos)
5. **Qualidade estrutural**: Escores de estrutura correlacionam-se com avaliação especialista de qualidade jurídica documental (≥0.6 correlação)
6. **Detecção de contradição**: Instrumento identifica corretamente ≥80% das inconsistências internas inseridas propositalmente nos casos de teste

## Entregáveis

1. **Avaliador validado**: `test/golden-document-test.ts` com correções metodológicas implementadas
2. **Plano de validação**: Este documento (PLAN-FASE-19.1-GOLDEN-EVALUATOR-VALIDATION.md)
3. **Relatório de validação**: `docs/recovery/FASE-19.1-GOLDEN-EVALUATOR-VALIDATION-RESULTS-2026-09-21.md` (será gerado após execução)
4. **Dataset dourado aprimorado**: Versão atualizada dos casos de teste com validação jurídica documentada
5. **Métrica confiável inicial**: Primeiro conjunto de resultados que podem ser usados para decisões de melhoria do sistema

## Próximos Passos Após FASE 19.1

Após aceitação do instrumento de medição:
- Executar FASE 19.2: Executar teste validado contra o sistema para obter primeira medição confiável de qualidade
- Com base nos resultados confiáveis, decidir quais componentes necessitam de melhoria:
  - Templates de documento (faltam placeholders para dados técnicos?)
  - Rule Engine (seleção de argumentos subótima?)
  - RAG Pipeline (recuperação de contexto jurídico inadequada?)
  - Document Assembly Engine (fluxo de dados quebrado?)
  - Análise de IA (se aplicável)
- Implementar melhorias direcionadas com métrica confiável para orientar decisões

---
*Plano elaborado com base na revisão técnica especializada que identificou limitações metodológicas na primeira bateria de testes do Golden Document Test.*