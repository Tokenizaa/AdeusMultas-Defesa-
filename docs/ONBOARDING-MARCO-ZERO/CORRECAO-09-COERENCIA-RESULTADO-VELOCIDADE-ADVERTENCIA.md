# Correção 09 — coerência jurídica e linguagem do resultado da análise

**Objetivo:** corrigir divergências entre o cálculo de velocidade, o enquadramento da infração e a mensagem principal; impedir que uma declaração sobre o histórico do condutor seja apresentada como comprovação oficial; e tornar compreensíveis as regras não aplicáveis.

**Estado:** implementação em `main`; CI e deploy do commit mais recente concluídos com sucesso. Validação visual/E2E do caso real ainda pendente. Esta correção não certifica o onboarding completo.

## Contexto observado

O usuário compartilhou o resultado da análise do AIT **5955616144**, placa **NAM9X73**, infração Art. 218, I do CTB, código 745-50. O texto principal afirmava que os requisitos do art. 267 estavam atendidos por não haver infrações nos últimos 12 meses. A mesma saída indicava velocidade medida de 108 km/h, velocidade considerada de 100 km/h e limite de 100 km/h, mas apresentava uma verificação detalhada dizendo que o código indicava faixa mais gravosa do que os valores sustentavam.

Também apareciam mensagens internas, por exemplo `Regra restrita às famílias [alcoolemia]` e `excesso_velocidade`, na lista de verificações não aplicáveis.

Esse texto foi fornecido pelo usuário como observação da interface. Não foi uma captura produzida independentemente pelo agente por navegador/E2E.

## Diagnóstico

1. **ARG-005 — velocidade:** o texto principal podia dizer que a conta fechava sem verificar se a velocidade considerada superava o limite informado. Uma conta de tolerância compatível, isoladamente, não confirma que o enquadramento por excesso de velocidade está sustentado.
2. **ARG-051 — advertência:** a ausência de resposta sobre infrações anteriores não pode ser tratada como “não houve infrações”. Uma declaração do condutor também não equivale a uma confirmação do prontuário oficial.
3. **Regras não aplicáveis:** o renderer expunha nomes internos de famílias/categorias e dificultava a compreensão do resultado.
4. **Regressão de sintaxe:** uma alteração intermediária do objeto de explicação de ARG-005 introduziu erro de sintaxe; o commit seguinte corrigiu-o. Não tratar o commit intermediário com falha como estado final.

## Alterações realizadas

Arquivo principal: `src/components/onboarding/steps/FreeAnalysisResultStep.tsx`.

- **ARG-005:** passou a comparar a velocidade considerada calculada e informada com o limite da via. Se a velocidade considerada não supera o limite informado, a mensagem agora identifica que os dados apresentados não explicam o enquadramento por excesso de velocidade e orienta conferir limite, código e notificação original. Se o cálculo divergir, descreve os valores e pede conferência. Não declara nulidade automática.
- **ARG-051:** diferencia ausência de informação de declaração do condutor. Quando não há informação sobre o histórico, a mensagem pede consulta ao prontuário. Quando o usuário declara não ter cometido outras infrações, a mensagem explicita que a declaração ainda precisa ser confirmada oficialmente. O estado “DECLARADO” recebe nível de confiança médio, não o mesmo tratamento de um requisito comprovado.
- **Mensagens de regras não aplicáveis:** adicionada uma função de apresentação que traduz as famílias/categorias conhecidas para linguagem simples (por exemplo, “álcool e direção” e “excesso de velocidade”), sem alterar o status da regra ou a lógica jurídica do motor.

Arquivo de testes: `src/components/onboarding/steps/onboarding-copy-regression.test.tsx`.

- Adicionados cenários de regressão para o conflito entre velocidade considerada e limite e para a ausência/declaração de histórico do art. 267.
- Foi tentada uma nova asserção para a tradução das mensagens de regras não aplicáveis, mas a ferramenta de alteração bloqueou essa gravação. **Não afirmar que existe teste específico dessa tradução** até conferir ou adicionar a asserção por um caminho autorizado.

## Histórico de commits relevantes

- `b471252444301722cb226e3828694a86786f5002` — início da correção do texto específico de prazo/expedição (ARG-048), registrado no histórico anterior; validar comportamento visual do caso correspondente separadamente.
- `798951c26c594cb187008bfb43d4d80dad00fa8f` — tentativa de alteração de ARG-005; CI/deploy falharam por erro de sintaxe introduzido neste commit. Não usar como referência de estado funcional.
- `fc0bcf04231ce4cac944b6526f8d35253472515a` — corrigiu a sintaxe de ARG-005; CI e deploy desse commit concluíram com sucesso.
- `a25af2bf008ef4e6ecb62a252f339862081ad82b` — diferencia declaração de histórico de confirmação oficial; CI e deploy concluíram com sucesso.
- `1b5c4c9975d77943d71544efd8cfbcfaa5e3c3d3` — adicionou testes de regressão; a execução de CI desse commit falhou em uma asserção de texto excessivamente abrangente. O deploy concluiu, mas o CI não passou.
- `82d3b2738ebd6286b5475ed950aa59df4f7c8d44` — ajuste para remover o prefixo técnico “DECLARADO” da mensagem apresentada; CI desse commit falhou na asserção de texto mencionada acima, e o deploy concluiu.
- `f7f1a062557d48d18fcea4dc13768a85e67c4065` — corrigiu a asserção de regressão; CI e deploy concluíram com sucesso.
- **`1919b7847383e729f8d8e04de892967cf69f3eef` — commit mais recente verificado:** tradução das mensagens de regras não aplicáveis na camada de apresentação. CI/CD [run 40941464997](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40941464997) e Cloudflare Deploy [run 40941465159](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40941465159) concluíram com sucesso.

## Critérios de aceitação

- [x] A mensagem de ARG-005 não declara que a infração está validada apenas porque a subtração da margem fecha.
- [x] Quando a velocidade considerada informada não supera o limite informado, o resultado aponta a inconsistência entre esses dados e o enquadramento e pede conferência documental.
- [x] A falta de resposta sobre o histórico dos últimos 12 meses não é convertida em histórico limpo.
- [x] A declaração do condutor é apresentada como declaração pendente de confirmação oficial.
- [x] Mensagens de regras não aplicáveis conhecidas são traduzidas na camada de apresentação.
- [x] CI/CD e deploy do commit `1919b7847383e729f8d8e04de892967cf69f3eef` concluíram com sucesso.
- [ ] Confirmar que a saída publicada para o AIT 5955616144 reflete as mensagens atualizadas.
- [ ] Executar validação visual/E2E real da tela; CI e deploy, por si sós, não comprovam o comportamento final no navegador.
- [ ] Adicionar e executar teste específico para a tradução de regras não aplicáveis, pois a tentativa de alteração desse teste foi bloqueada.
- [ ] Revisar o texto estático de `whatWeChecked` de ARG-005: ele ainda pode mencionar uma margem fixa de 7 km/h, embora a função de cálculo trate de forma diferente medições acima de 107 km/h. A tentativa de corrigir esse texto foi bloqueada pela ferramenta e não foi aplicada.

## Riscos e limitações restantes

- O usuário forneceu uma saída de produção, mas o agente ainda não fez E2E visual independente para o caso. Não declarar validação visual.
- O CI verde e o deploy verde comprovam os respectivos workflows, não a correção jurídica completa do auto.
- Os dados do caso (limite, velocidades, código e histórico do condutor) devem ser conferidos na notificação e no prontuário oficiais antes de recomendar protocolo.
- Não inferir que todo caso do art. 267 será convertido sem confirmar os requisitos e o procedimento aplicáveis.
- Não alterar o motor de regras ou ampliar o escopo da tarefa sem novo diagnóstico documentado.

## Próxima ação autorizada

1. Atualizar o estado do Marco Zero (README e este handoff) com esta correção e seus links.
2. Em seguida, validar visualmente o resultado publicado para o AIT 5955616144: verificar texto principal de advertência, texto de velocidade, contagem das verificações e linguagem das regras não aplicáveis.
3. Corrigir apenas discrepâncias comprovadas; depois executar novamente CI e conferir deploy.
4. Não declarar o onboarding aprovado nem o caso juridicamente validado até concluir as verificações pendentes.
