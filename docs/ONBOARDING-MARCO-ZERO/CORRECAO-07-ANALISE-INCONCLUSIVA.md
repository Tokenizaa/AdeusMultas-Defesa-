# Correção 07 — coleta de dados e integridade da execução da análise

**Objetivo:** corrigir a lacuna que fazia o fluxo comum de excesso de velocidade chegar ao resultado sem coletar um campo exigido por uma regra, e impedir que uma exceção do motor seja apresentada como uma análise concluída.

## Escopo

- `src/components/onboarding/steps/SpecificInfractionDataStep.tsx` — coletar o histórico de infrações dos 12 meses anteriores para infrações leves/médias, com três estados: sim, não e não informado.
- `src/components/onboarding/steps/AnalysisProcessingStep.tsx` — não avançar quando `ExpertRuleEngine.evaluate()` lança exceção; exibir erro e permitir voltar para revisar os dados.
- `src/components/onboarding/steps/FreeAnalysisResultStep.tsx` — mostrar contagem real das verificações retornadas e traduzir nomes técnicos dos campos pendentes para linguagem simples.
- `src/components/onboarding/testFillData.ts` e testes de regressão — alinhar fixture sintética e verificar coleta/apresentação.

## Achados confirmados

1. `hasPreviousInfractionsLast12Months` era exibido apenas no formulário específico de conversão em advertência. No fluxo comum de excesso de velocidade, o usuário podia preencher todos os campos visíveis sem nunca responder à pergunta; o motor então registrava `RULE_CONVERSAO_ADVERTENCIA_267` como lacuna de dados.
2. `AnalysisProcessingStep` capturava exceções somente com `console.error`. Ao fim da animação, `onComplete()` era chamado mesmo com `analysisResult === null`, permitindo que o wizard exibisse o estado inicial vazio.
3. A tela de resultado listava nomes de propriedades como `hasPreviousInfractionsLast12Months` e `speedLimit` em vez de explicar quais informações faltavam.
4. A tela já recebia `evaluatedRules` do domínio, mas não os resumia na primeira leitura; por isso, um resultado sem achados confirmados podia parecer que nenhuma análise havia sido executada.
5. A regra `RULE_INMETRO_CONSIDERED_SPEED_ERROR` produz `ARG-005`, mas a tese não estava em `recommendedArgumentCodes` dos códigos de velocidade; o filtro de elegibilidade podia descartar a divergência detectada antes de ela chegar ao resultado.
6. A condição anterior também comparava a velocidade medida bruta com faixas de velocidade considerada e podia marcar um caso válido como irregular. A regra agora usa `calculateConsideredSpeed`, a mesma função canônica da interface, e só aponta código mais gravoso que a faixa calculada/informada.

## Alterações realizadas

- Substituído o checkbox de não reincidência por uma seleção tri-state, evitando converter uma caixa desmarcada em fato afirmativo.
- Adicionada a mesma pergunta ao fluxo comum quando a infração é leve/média; “Não sei / Não informado” continua válido e mantém o motor em modo fail-closed.
- O formulário administrativo de teste preenche o campo com valor sintético explícito.
- A etapa de processamento agora mantém o usuário na etapa de análise se o motor falhar; não chama `onComplete()` sem resultado. O erro é apresentado na interface e há ação para voltar e revisar os dados.
- O resultado mostra quantas verificações foram registradas e quantas estão concluídas, com ponto de atenção, pendentes ou não aplicáveis.
- As lacunas são apresentadas com nomes legíveis, sem alterar o valor factual nem converter ausência em irregularidade.
- `ARG-005` foi habilitada no catálogo para os quatro códigos de velocidade explicitamente avaliados pela regra; foi adicionado teste que comprova a passagem da divergência pelo filtro de elegibilidade.
- A regra passou a reutilizar `calculateConsideredSpeed` e compara o grau do código da infração com a faixa calculada e a faixa informada, evitando sinalizar como irregular um código que já corresponde à velocidade considerada.

## Critérios de aceitação

- [ ] Excesso de velocidade leve/médio apresenta a pergunta de histórico dos últimos 12 meses.
- [ ] “Sim”, “Não” e “Não sei” são preservados como `true`, `false` e `undefined`.
- [ ] A análise sem achados exibe a contagem das verificações reais, se o motor as retornar.
- [ ] Lacunas são apresentadas em linguagem legível.
- [ ] Um caso com velocidade considerada correta e código compatível não gera falso positivo `ARG-005`.
- [ ] Um código de velocidade mais gravoso que a faixa calculada gera `ARG-005`.
- [ ] Uma divergência de velocidade que cruza a faixa de enquadramento chega à análise como `ARG-005`.
- [ ] Exceção do motor não avança para a etapa de resultado.
- [ ] Vitest, typecheck e build passam.
- [ ] Teste manual/E2E local confirma o caminho completo.
- [ ] Nenhum deploy de produção é iniciado sem autorização explícita.

## Estado da validação

- **Inspeção estática:** concluída para os arquivos alterados.
- **Testes de regressão adicionados:** coleta do histórico no fluxo de excesso de velocidade, fixture de teste, resumo de verificações e rótulos legíveis para lacunas.
- **Primeiro CI:** run [40822977925](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40822977925) — FAIL nos testes de regressão: 54 arquivos passaram, 1 falhou; 424 testes passaram e 2 falharam. As causas foram uma asserção de texto sem normalizar os comentários de SSR do React e uma expectativa que ainda usava a frase do checkbox removido.
- **CI do follow-up:** [run 40823075337](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40823075337) passou em Vitest, TypeScript e build. Depois disso, a correção adicional de elegibilidade revelou a necessidade de alinhar a regra ao cálculo canônico para evitar falso positivo; a nova alteração precisa de novo CI.
- **Teste manual/E2E:** pendente.
- **Produção:** não publicado. O commit não contém o marcador `[DEPLOY-PRODUCTION]`.

## Próxima ação autorizada

Verificar o CI deste commit. Se passar, sincronizar a cópia local, reexecutar os testes e validar manualmente o fluxo de excesso de velocidade. Se falhar, corrigir apenas a causa comprovada e repetir a validação. Não alterar etapas anteriores nem o fluxo geral.
