# Central de Certificação Visual Assistida

A central deve permitir navegação manual no onboarding real e preenchimento contextual por etapa, sem executor Playwright autônomo.

## Serviços
- defesa_previa
- recurso_jari
- recurso_cetran
- suspensao
- cassacao
- indicacao_condutor
- conversao_advertencia

## Regras
- O preenchimento deve considerar o serviço jurídico e a etapa/categoria efetivamente selecionados.
- Preencher apenas os campos da etapa atual, sem avançar, submeter, criar caso ou gerar pagamento automaticamente.
- Usar dados sintéticos coerentes com catálogo e regras existentes; não inventar correspondências legais.
- Campos condicionais devem existir apenas quando a etapa e as respostas os exigirem.
- O operador controla a navegação e confirma os resultados observados.

## Relatório
O relatório final sintetiza os 13 domínios da matriz canônica já existente no projeto. Não confundir módulos arquiteturais com domínios nem inventar nomes. Para cada domínio: PASS, FAIL, BLOCKED ou NOT_OBSERVED, serviços/etapas observados, evidências reais, defeitos, gravidade, impacto e reteste.

Nenhum domínio pode receber PASS sem evidência suficiente. Preenchimento de campos não prova persistência, integridade documental nem validade jurídica. Não fabricar screenshots, logs ou resultados. Pagamentos reais e operações destrutivas são proibidos neste fluxo. A certificação integral só pode ser declarada quando os sete serviços e os 13 domínios tiverem cobertura e evidências suficientes.
