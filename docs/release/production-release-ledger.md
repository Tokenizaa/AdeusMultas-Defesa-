# Registro único de liberação — AdeusMultas / DefesAI

**Branch:** `main`  
**Produção:** https://adeusmulta.defesai.com.br  
**Estado do registro:** em andamento; não é autorização de liberação pública.

## Fase 1 — Pagamentos (VenoPag)

**Decisão atual: PARCIALMENTE VALIDADA — não liberar ainda.**

### Correção entregue

- Commit `3a6f4bbe40d3eceb3edf9ee61097b1f165bd0273`: impede que um evento VenoPag `pending` fora de ordem rebaixe uma ordem já confirmada como `PAID`. O evento contraditório é registrado como ignorado e a ordem paga é preservada.
- Commit `5ffcc55477c4064c690879082ef31fea881a2053`: adiciona regressão para o cenário.
- Commit `f2cd0107a811e76bbba874995c568a4119ede119`: corrige o mock do encadeamento de atualização de `webhook_events` para refletir a API Supabase utilizada pelo código.

### Evidência verificável

- CI completo, incluindo Vitest, typecheck e build: **PASS**, SHA `f2cd0107a811e76bbba874995c568a4119ede119`.  
  Execução: https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40194366295
- Workflow Cloudflare, incluindo descoberta da matriz E2E e testes de contratos/regressão de pagamentos: **PASS**, mesmo SHA.  
  Execução: https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40194366341
- Cobertura de pagamento existente e executada pelo workflow: resolução de oferta no backend, bloqueio de valor divergente informado pelo cliente, criação PIX VenoPag, HMAC, confirmação PAID, repetição de webhook, idempotência de criação, contestação, chargeback/estorno e o novo caso de evento `pending` fora de ordem.
- Verificação pública sem escrita: `GET /api/health` respondeu HTTP 200 em 25/10/2026; o Worker reportou banco conectado e gateway `venopag` configurado para produção.

### Limites da evidência

- Os testes de pagamento usam mocks para provedor e persistência; não comprovam, sozinhos, uma transação real nem a execução da RPC contra o banco de produção.
- A verificação de saúde não identifica o SHA do código implantado.
- O workflow Cloudflare aprovado **não implantou** este SHA: o deploy de produção continua protegido pelo gate explícito `[DEPLOY-PRODUCTION]`.
- Não foi criado nem pago PIX real. O teste real controlado continua reservado para depois que os bloqueios anteriores forem resolvidos e com autorização explícita.

### Critérios de pagamento ainda pendentes

1. Confirmar a versão efetivamente implantada e sua correspondência com o SHA aprovado antes de qualquer publicação.
2. Comprovar o fluxo de ponta a ponta entre oferta/preço, ordem PIX, webhook HMAC real e persistência/atualização do caso no banco.
3. Confirmar o tratamento operacional de falha ambígua na criação da cobrança e o procedimento de reconciliação sem gerar uma segunda cobrança.
4. Executar uma única validação PIX real controlada, somente após os demais bloqueios serem resolvidos e mediante autorização explícita.
5. Anexar evidências da transação, webhook e estado persistido, sem incluir credenciais ou dados pessoais reais.

**Próxima fase:** onboarding e caso, após encerrar as correções pendentes de pagamento; não reabrir os testes verdes sem alteração relevante ou regressão.
