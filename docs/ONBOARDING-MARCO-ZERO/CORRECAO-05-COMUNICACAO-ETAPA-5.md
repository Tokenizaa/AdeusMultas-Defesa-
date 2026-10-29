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
- [ ] Executar Vitest e registrar resultado real.
- [ ] Executar typecheck e build.
- [ ] E2E/navegador: limite e velocidades preenchidos, data e identificação vazias, clicar em Executar Análise Gratuita e confirmar que chega à etapa de processamento.
- [ ] E2E/navegador: preencher também data e identificação, avançar e confirmar que o fluxo funciona sem perder os valores.
- [ ] Conferir CI e workflow Cloudflare. O gate E2E existente não deve ser desativado nem contornado.
- [ ] Confirmar status do deploy; não presumir que houve publicação apenas porque o commit foi criado.

**Limitação conhecida:** a validação de SSR/copy não simula interação de usuário. Os cenários de avanço real ficam pendentes até execução E2E/manual no ambiente apropriado.
