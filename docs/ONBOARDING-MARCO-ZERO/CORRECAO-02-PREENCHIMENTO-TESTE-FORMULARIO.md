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
- Identificação explícita de dados fictícios no nome e local, mantendo o AIT sintético em formato numérico para não quebrar validações posteriores.
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
  - O nome `Condutor de Teste` e o local fictício identificam o conjunto como sintético. O AIT continua numérico (gerado para teste) para preservar compatibilidade com validações posteriores.
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
- Preservação do formato numérico do AIT sintético: [`1876953`](https://github.com/Tokenizaa/AdeusMultas-Defesa-/commit/187695333bb7e4369fb2538ebfdb2d9fd514035f)
- Teste do formato numérico do AIT: [`679051a`](https://github.com/Tokenizaa/AdeusMultas-Defesa-/commit/679051a95009b4cea81cc8cc6e733fc193393242)

## Riscos e limites residuais

- O AIT de teste permanece numérico para manter compatibilidade potencial com validações posteriores; a distinção de dados fictícios fica no nome e no local. O comportamento visual e qualquer validação posterior ainda precisam ser verificados no navegador.
- As datas são dados sintéticos de interface. Não devem ser reutilizadas como regra de cálculo de prazo ou como afirmação sobre cabimento jurídico.
- O serviço de suspensão possui múltiplas hipóteses de origem; o fixture cobre as duas categorias explicitamente modeladas aqui (Lei Seca e excesso de velocidade acima de 50%), não um processo real de suspensão por acúmulo de pontos.
- CI e validação visual/E2E não estão confirmados nesta documentação. Não declarar PASS até obter evidências.
- Nenhum deploy foi realizado.


## Incidente reportado após teste em produção — campos de data não visíveis

**Relato:** ao acionar o botão administrativo, os campos `Data Expedição Notificação`, `Data de Entrega da Notificação` e `Prazo Final p/ Defesa` continuaram vazios.

**Investigação do código:** a fixture já gerava os três campos em ISO (`YYYY-MM-DD`) e o estado do wizard recebia o objeto completo. O componente `BrazilianDateInput` mantém estado de exibição próprio e sincroniza esse estado por efeito quando o valor controlado muda. Para tornar o preenchimento programático determinístico, os quatro controles de data da etapa agora recebem uma `key` derivada do valor canônico; quando a fixture troca o valor, o controle é remontado e inicializa a exibição a partir da data nova.

**Arquivos afetados nesta revisão:**
- `src/components/onboarding/steps/InfractionIdentificationStep.tsx`: remount controlado dos inputs de data quando o valor ISO muda.
- `src/components/onboarding/testFillData.test.ts`: asserção explícita de que a data de expedição é produzida pela fixture.

**Limite da evidência:** esta mudança foi gravada no repositório, mas ainda não foi executada em navegador nem confirmada em produção. Não é possível afirmar que o incidente está resolvido até validar localmente e confirmar que o ambiente de produção recebeu a versão com esta correção. Nenhum deploy foi realizado por esta tarefa.
