# Correção 08 — coerência do resultado inconclusivo e das lacunas

**Objetivo:** garantir que o resumo técnico, os estados das verificações e a contagem de pendências comuniquem o mesmo estado da análise. Nenhuma ausência de dados pode ser apresentada como verificação concluída sem falha.

## Escopo

- `src/core/rules/rule-engine.ts`: resumo técnico quando não há achados confirmados, mas existem lacunas.
- `src/components/onboarding/steps/FreeAnalysisResultStep.tsx`: contagem de pendências derivada tanto de `evaluatedRules` quanto de `dataGaps`; uma lacuna prevalece sobre uma linha de verificação marcada como PASS para a mesma regra.
- Testes de regressão do motor e da tela de resultado.
- Documentação do Marco Zero.

## Achados confirmados por leitura estática

1. O motor usava um resumo de “não identificou inconsistências jurídicas” sempre que `detectedInconsistencies` estava vazio, mesmo quando `dataGaps` não estava vazio. A mensagem acrescentava que havia hipóteses não avaliadas, criando uma conclusão contraditória: declarava ausência de inconsistências antes de admitir que a análise estava incompleta.
2. A tela contava pendências exclusivamente por `evaluatedRules.status === 'DATA_GAP'`, enquanto também recebia `dataGaps` separadamente. Se as coleções divergirem, uma lacuna pode existir sem entrar na contagem.
3. A linha de uma regra priorizava `rule.reason`; se a mesma regra também tivesse uma lacuna em `dataGaps`, poderia exibir “Nenhuma inconformidade detectada” apesar de existir informação insuficiente.

## Correções realizadas

- O resumo agora declara explicitamente que a análise ficou inconclusiva quando não há achados e existe ao menos uma lacuna, informa que a ausência de achados não prova que a autuação esteja correta e orienta completar os dados e conferir documentos.
- Quando não existem achados nem lacunas, o resumo limita a afirmação aos dados efetivamente avaliados e esclarece que isso não comprova, por si só, a correção da autuação.
- A contagem de pendências passa a considerar a união dos IDs de regras com status `DATA_GAP` e dos IDs presentes em `dataGaps`, sem duplicar uma mesma regra.
- Se uma regra tiver lacuna associada, o texto da lacuna prevalece sobre a razão da linha, evitando que uma marcação PASS esconda insuficiência de dados.
- Foram adicionados testes de regressão com dados sintéticos para o resumo inconclusivo e para a inconsistência entre `evaluatedRules` e `dataGaps`.

## Critérios de aceitação

- [ ] Sem achados e com lacunas: resumo declara “inconclusiva” e não afirma que o motor não identificou inconsistências como conclusão geral.
- [ ] Sem achados e sem lacunas: o resumo limita a conclusão aos dados avaliados e não afirma que a multa está correta.
- [ ] Uma lacuna existente em `dataGaps` é contada como pendência mesmo que falte uma linha `DATA_GAP` correspondente em `evaluatedRules`.
- [ ] Uma regra com lacuna associada não é exibida como “Nenhuma inconformidade detectada”.
- [ ] Vitest, typecheck e build passam.
- [ ] O comportamento do resultado em produção é revalidado depois de autorização e deploy confirmados.

## Estado da validação

- **Leitura estática:** achados e alterações identificados no código de `main`.
- **Testes automatizados:** adicionados; execução do CI deste commit pendente.
- **Teste manual/E2E de produção:** não executado nesta tarefa.
- **Deploy:** não solicitado por esta correção; não declarar que a versão publicada contém estas mudanças até haver autorização, workflow de deploy bem-sucedido e confirmação do comportamento no site.

## Próxima ação

Aguardar o CI do commit. Se falhar, corrigir apenas causas comprovadas. Após CI aprovado, solicitar/confirmar autorização para publicar e validar o resultado inconclusivo em produção. Não refatorar as etapas anteriores do onboarding.
