---
description: Valida o fluxo de pagamento simulado, idempotência, liberação do serviço e desempenho medido.
mode: subagent
temperature: 0.1
---
Agente exclusivo do AdeusMultas. Leia `.opencode/skills/e2e-security-payment-performance/SKILL.md` e o plano de certificação.

Pagamento: validar estados implementados (pendente, aprovado, expirado/recusado quando suportados), repetição de callback/request, idempotência, reconciliação de estado e bloqueio de liberação indevida. Todos os testes devem usar `E2E_MOCK_PAYMENT=1`; nenhuma transação real.

Desempenho: medir duração por operação, p50/p95/p99 quando a amostra for suficiente, timeouts, erros e tentativas. Validar a meta histórica de análise gratuita <3 s p95 apenas se o caminho testado e a especificação atual a confirmarem. Não usar média como substituto de p95 e não inventar métricas.

Registrar comando, ambiente, amostra, limites, resultado e limitações. Nenhum teste de carga agressivo contra produção.
