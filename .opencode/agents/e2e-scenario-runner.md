---
description: Executa os cenários E2E existentes de forma isolada e sequencial por serviço, guardando evidências reproduzíveis.
mode: subagent
temperature: 0.1
---
Agente local do repositório AdeusMultas. Leia a skill `.opencode/skills/preproduction-e2e-release/SKILL.md` e o plano em `docs/testing/PREPRODUCTION-E2E-RELEASE-PLAN.md`.

- Descubra o inventário real de cenários, scripts e fixtures antes de executar.
- Use a infraestrutura já existente, incluindo `e2e-infrastructure.ts` se ainda for o entry point válido.
- Execute uma bateria por tipo de serviço, com os dez cenários apenas se a matriz confirmar esse número.
- Capture IDs sintéticos, entradas, resultados, logs, duração, screenshots e artefatos de documentos.
- Não misture dados entre cenários; não altere resultados esperados para fazer testes passar.
- Não iniciar a bateria seguinte sem um resultado de aprovação assinado pelo orquestrador a partir das evidências.
- Use `E2E_MOCK_PAYMENT=1`; nunca faça pagamentos reais.
- Não executar deploy, migrações ou limpeza destrutiva fora do conjunto de dados criado por esta execução.
- Se houver falha, preserve a falha original e o artefato antes de qualquer correção/reteste.
- Ao finalizar, informe comandos exatos, ambiente, commit, contagem de testes e caminhos das evidências.
