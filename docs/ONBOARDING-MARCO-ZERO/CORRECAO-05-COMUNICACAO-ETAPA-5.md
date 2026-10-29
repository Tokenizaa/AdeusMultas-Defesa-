# Correção 05 — comunicação e validação da etapa 5 (velocidade/radar)

**Base:** `ccc0d970f68164cd8737566eefb3737d25e8d169`  
**Escopo:** somente a comunicação da etapa 5 e sua regressão de copy; não refazer etapas anteriores, não mudar fluxo de navegação, cálculo de velocidade ou contratos de backend.

## Implementação

- Instrução para o limite da via: consultar o valor indicado na notificação.
- Explicação de velocidade medida como registro anterior ao desconto da tolerância.
- Explicação de velocidade considerada como valor após a tolerância, conforme a notificação; o componente mantém o cálculo automático existente.
- Aviso conjunto para data e identificação do INMETRO: podem ficar vazias e a falta desses dados, isoladamente, não demonstra invalidade da multa.
- Preservados os IDs dos cinco campos e do botão de análise.
- Ampliado o teste de regressão de copy com as instruções, o aviso, os IDs e a ausência de atributo `required` nos dois campos opcionais.

## Critérios e estado de validação

- [x] Alteração limitada à comunicação da etapa 5 e teste de regressão existente.
- [x] Campos opcionais continuam sem atributo `required`; o componente continua chamando o mesmo `onNext` no botão atual.
- [x] Teste de regressão preparado para validar os textos no HTML renderizado.
- [x] Vitest passou no CI do commit `e38a3d17` ([run 40810414519](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40810414519)).
- [x] Typecheck e build passaram no mesmo CI ([run 40810414519](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40810414519)).
- [x] Adicionado ao cenário canônico E2E-DEFESA_PREVIA-10 o teste de navegador com campos INMETRO vazios, clique real em Executar Análise Gratuita e confirmação do diagnóstico (execução do workflow pendente).
- [x] O mesmo cenário E2E retorna à etapa 5, preenche data/identificação, avança novamente e verifica os valores enviados (execução do workflow pendente).
- [x] CI passou (Vitest, typecheck e build); workflow Cloudflare concluiu os gates de validação com sucesso ([run 40810414660](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40810414660)). A etapa de deploy ficou pulada porque o commit ainda não continha o marcador explícito exigido pelo workflow.
- [ ] Confirmar o resultado do deploy iniciado pelo commit com marcador `[DEPLOY-PRODUCTION]`; não presumir publicação antes da conclusão do workflow.

**Limitação conhecida:** o teste de navegador foi adicionado ao cenário canônico existente, mas só deve ser considerado PASS depois que o workflow executar e concluir com sucesso.
