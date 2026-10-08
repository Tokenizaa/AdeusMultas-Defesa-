# OpenCode local scope — AdeusMultas / DefesaAI

Este diretório contém agentes e skills específicos do produto AdeusMultas / DefesaAI.

## Regra de escopo

- Domínios de trânsito, infrações, veículos, casos, análise jurídica e timelines deste produto pertencem a este projeto.
- Não instalar essas skills novamente no escopo global apenas porque são úteis aqui.
- O `@supervisor` global continua responsável pela orquestração geral do projeto.
- Não criar runtime global, agent-loop, state machine ou mecanismo paralelo de orquestração.
- Skills verdadeiramente transversais, como Gov.br quando usadas em outros projetos, permanecem no escopo global.

## Skills locais

- agent-case-management
- agent-infraction-processing
- agent-legal-analysis
- agent-timeline-management
- agent-transportation-transit
- agent-vehicle-management
