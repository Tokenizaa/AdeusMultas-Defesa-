# Correção 02 — Preenchimento de teste coerente com serviço e fase

## Objetivo

Tornar confiável o botão administrativo **“Preencher com dados de teste”** da etapa de identificação. O botão deve preencher o formulário completo com um cenário fictício coerente com a combinação de **serviço solicitado + fase processual + categoria de infração**, sem confundir dados de teste com uma autuação real nem tratar datas sintéticas como prazos jurídicos.

## Escopo

Incluído:
- Fixture única reutilizável para o formulário de identificação.
- Serviço e fase atuais passados pelo wizard ao botão de teste.
- Resolução da categoria compatível com serviços especializados e com o pedido de conversão em advertência.
- Cenário de suspensão coerente: Lei Seca ou excesso de velocidade acima de 50%, conforme categoria selecionada.
- Sincronização da categoria do wizard quando o fixture precisa corrigir uma categoria incompatível.
- Identificação explícita de dados fictícios no nome, local e AIT (`TESTE-`).
- Datas em sequência cronológica sintética, sem afirmar que representam prazos legais reais.
- Testes para completude, substituição de campos derivados obsoletos e coerência serviço/fase/categoria.

Fora do escopo:
- Executar análise jurídica, submeter formulário ou avançar etapas automaticamente.
- Alterar regras de produção, OCR, backend, banco de dados, pagamentos ou fluxos jurídicos reais.
- Publicar/deployar a aplicação.

## Diagnóstico

A versão anterior recebia principalmente a categoria. Isso era insuficiente: uma categoria residual do estado do wizard poderia ser incompatível com um serviço específico, por exemplo indicação de condutor, conversão em advertência, suspensão ou cassação. Além disso, as datas anteriores eram calculadas depois de uma ocorrência recente, podendo gerar eventos futuros e uma cronologia enganosa.

## Implementação realizada

- **`src/components/onboarding/testFillData.ts`**
  - `resolveTestIdentificationCategory` recebe serviço, fase e categoria selecionada.
  - Indicação de condutor força a categoria `indicacao_condutor`.
  - Conversão em advertência, inclusive quando selecionada como fase dentro do serviço geral, usa `conversao_advertencia`.
  - Cassação usa a categoria geral de CNH.
  - Suspensão usa Lei Seca ou, quando escolhida a categoria de velocidade, um cenário sintético de velocidade acima de 50% com código `747-10`.
  - O nome `Condutor de Teste`, o local fictício e o prefixo `TESTE-` no AIT tornam o conjunto reconhecível como fictício.
  - A sequência ocorrência → expedição → entrega → prazo é cronológica e gerada para testes de interface; não é cálculo de prazo jurídico.

- **`src/components/onboarding/steps/InfractionIdentificationStep.tsx`**
  - Recebe serviço e fase do wizard e usa os três eixos ao gerar a fixture.
  - Atualiza a categoria do wizard se a regra de coerência exigir uma categoria diferente.

- **`src/components/onboarding/OnboardingWizard.tsx`**
  - Passa o serviço e a fase atuais para a etapa 4 e conecta a atualização de categoria ao handler existente.

- **`src/components/onboarding/testFillData.test.ts`**
  - Mantém os testes de preenchimento completo e acrescenta testes de resolução por serviço/fase, marcador fictício, cronologia e cenário de suspensão por velocidade.

## Critérios de aceitação

- [x] O botão permanece restrito ao administrador conforme o controle existente.
- [x] A fixture considera serviço, fase e categoria; não apenas categoria.
- [x] A categoria do wizard é sincronizada quando a combinação exige ajuste.
- [x] Código, artigo, descrição, gravidade, pontos e valor vêm do mesmo item do catálogo.
- [x] Os dados ficam identificáveis como fictícios.
- [x] As datas geradas respeitam a ordem cronológica, sem se apresentarem como prazo jurídico calculado.
- [x] Testes automatizados adicionados para as regras acima.
- [ ] Vitest, typecheck e build executados após esta revisão e com resultado confirmado.
- [ ] Teste visual/E2E no navegador e clique real no botão confirmados.
- [ ] Deploy em produção: não realizado.

## Commits desta revisão

- Fixture com contexto serviço/fase e resolução de categoria: [`5bb7b3f`](https://github.com/Tokenizaa/AdeusMultas-Defesa-/commit/5bb7b3f33c87a315fb758db89c6d422aa2fa7d88)
- Testes de coerência: [`fbd397c`](https://github.com/Tokenizaa/AdeusMultas-Defesa-/commit/fbd397c88e6a906e72208772160de5f7b63b1c80)
- Integração do botão com contexto: [`7b421a5`](https://github.com/Tokenizaa/AdeusMultas-Defesa-/commit/7b421a5658f142d6ca2c6aba5ca3514b944c4d2a)
- Passagem de serviço/fase e sincronização no wizard: [`b194e11`](https://github.com/Tokenizaa/AdeusMultas-Defesa-/commit/b194e114486880f1478a1d87b9b1dcc9a1eea5eb)

## Riscos e limites residuais

- O AIT recebe o prefixo `TESTE-`; a validação atual da etapa verifica presença/comprimento, mas o comportamento visual e qualquer validação posterior ainda precisam ser verificados no navegador.
- As datas são dados sintéticos de interface. Não devem ser reutilizadas como regra de cálculo de prazo ou como afirmação sobre cabimento jurídico.
- O serviço de suspensão possui múltiplas hipóteses de origem; o fixture cobre as duas categorias explicitamente modeladas aqui (Lei Seca e excesso de velocidade acima de 50%), não um processo real de suspensão por acúmulo de pontos.
- CI e validação visual/E2E não estão confirmados nesta documentação. Não declarar PASS até obter evidências.
- Nenhum deploy foi realizado.
