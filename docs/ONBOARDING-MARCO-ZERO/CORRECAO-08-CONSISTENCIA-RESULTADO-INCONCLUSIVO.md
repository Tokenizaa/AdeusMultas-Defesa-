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

- **Leitura estática:** PASS — inconsistência do resumo e divergência possível entre `evaluatedRules` e `dataGaps` confirmadas no código.
- **CI com as alterações de código:** PASS — [run 40939043422](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40939043422) concluiu Vitest, typecheck e build com sucesso no commit `eeab356709d64e0e873a9e682dd9ba8ae2c162bf`, que já contém as alterações de código e testes de regressão desta correção.
- **CI adicional:** [run 40939108423](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40939108423) também concluiu Vitest, typecheck e build com sucesso no estado de código atual.
- **Deploy automático:** o workflow [Cloudflare Deploy run 40939043366](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40939043366) concluiu com sucesso para o commit `eeab356709d64e0e873a9e682dd9ba8ae2c162bf`. Isso comprova conclusão do workflow, não validação visual nem confirmação do caso específico em produção.
- **Teste manual/E2E de produção:** não executado nesta tarefa; o resultado informado pelo usuário ainda precisa ser refeito/inspecionado em sessão real após a publicação.
- **Limitação:** não declarar o comportamento final confirmado no site apenas com base no deploy; é necessário conferir a tela e o resumo técnico do cenário inconclusivo.

## Próxima ação

Aguardar o CI do commit. Se falhar, corrigir apenas causas comprovadas. Após CI aprovado, solicitar/confirmar autorização para publicar e validar o resultado inconclusivo em produção. Não refatorar as etapas anteriores do onboarding.
