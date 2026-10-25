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

- CI completo, incluindo Vitest, typecheck e build: **PASS**, SHA `b29d826068cac5e2af6e7c9cc9d6df491dd832ba`.  
  Execução: https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40194862271
- Workflow Cloudflare, incluindo descoberta da matriz E2E e testes de contratos/regressão de pagamentos: **PASS**, mesmo SHA.  
  Execução: https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40194862293
- Cobertura de pagamento existente e executada pelo workflow: resolução de oferta no backend, bloqueio de valor divergente informado pelo cliente, criação PIX VenoPag, HMAC, confirmação PAID, repetição de webhook, idempotência de criação, contestação, chargeback/estorno e o novo caso de evento `pending` fora de ordem.
- Commit `11ae0b8c6af756117b0d5c52d01be9f496b14fc0` + `b29d826068cac5e2af6e7c9cc9d6df491dd832ba`: valida que o `serviceType` enviado ao checkout corresponde ao `service_type` persistido no caso, tanto no PIX quanto no cartão. Divergências são recusadas antes de qualquer chamada ao gateway.
- Testes no SHA mais recente: `payments.test.ts` 23/23, `payments.regression.test.ts` 7/7 e `cases.test.ts` 22/22 aprovados no workflow Cloudflare.
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

**Próxima etapa:** onboarding e caso. A validação real de pagamento permanece um gate antes da liberação; não reabrir os testes verdes sem alteração relevante ou regressão.

## Fase 2 — Onboarding e caso

**Decisão atual: CORREÇÕES DE PERSISTÊNCIA APROVADAS EM TESTES; E2E REAL AINDA NÃO COMPROVADO.**

### Correções entregues

- Commit `2b4b1845c9d46ae293390ed63fe65cbca457e70a`: a rota de qualificação agora exige que a atualização retorne o ID do caso; se nenhuma linha for atualizada, responde `409` em vez de reportar sucesso falso.
- Commits `82ebe0e556588a88b3aa6db125e60f9cb573c8ca` e `cf2c6fb0c9e13379c1563d58de569a1478348829`: teste de regressão para atualização sem linhas afetadas e ajuste da asserção ao formato real da resposta HTTP.
- Commit `88129c252db3ee113956fd45919aac139a393d02`: a recuperação do estado de onboarding agora responde `503` quando a consulta do pagamento falha, em vez de devolver sucesso incompleto com pagamento ausente.
- Commits `edf234767f8317254b039180edb9c8754c20bab4` e `46e15e9401d7d7cc9c31c700319c140ac4ee85ac`: regressões para retomada do PIX pendente, erro de banco na retomada e fechamento correto da suíte de testes.

### Evidência verificável

- CI completo, Vitest + typecheck + build: **PASS** no SHA mais recente `b29d826068cac5e2af6e7c9cc9d6df491dd832ba`.  
  Execução: https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40194862271
- Workflow Cloudflare, incluindo a suíte de contratos/regressão de casos e pagamentos: **PASS**, SHA `b29d826068cac5e2af6e7c9cc9d6df491dd832ba`.  
  Execução: https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40194862293
- `cloudflare/routes/cases.test.ts`: 22/22 testes passaram no workflow Cloudflare, incluindo criação anônima, recuperação/claim por token, tipos de serviço, qualificação e retomada do estado de pagamento.
- Página pública `/novo-caso`: HTTP 200 e primeiro passo do onboarding renderizado em 25/10/2026. Nenhum formulário foi enviado e nenhum caso foi criado nesta verificação.

### Limites da evidência e pendências

- Os testes de contrato usam mocks de banco; ainda não comprovam a persistência real nem o isolamento de titular no Supabase de produção.
- O fluxo de autenticação/cadastro e o ciclo completo criação anônima → recuperação → claim → qualificação → retomada precisam de execução E2E autorizada com evidências de cada etapa.
- A descoberta dos 70 cenários canônicos é aprovada, mas não equivale à execução dos 70 cenários.
- Não foi feita escrita persistente contra produção: a configuração atual não confirmou um Supabase de teste para verificações diretas e a execução exige ambiente explicitamente autorizado.

**Próximo bloqueador:** comprovar o ciclo de onboarding e caso em execução E2E segura, preservando os testes unitários já aprovados. A análise jurídica não deve avançar para certificação de produção enquanto esse ciclo estiver sem evidência real.

## Fase 3 — Análise jurídica e Quality Gate

**Decisão atual: CORREÇÃO LOCALIZADA VALIDADA EM CI; FLUXO JURÍDICO INTEGRADO AINDA NÃO CERTIFICADO EM PRODUÇÃO.**

### Evidência e correção

- O código atual de `cloudflare/routes/cases.ts` já invoca `runCanonicalQualityGate` depois da geração da minuta e bloqueia a entrega com HTTP 422 quando qualquer verificação bloqueante falha. Relatórios anteriores que afirmam que a invocação não existe estão desatualizados em relação ao código atual.
- Commit `b37c26f30478f8a85f9b8af8d2c5817f350ef6c6`: corrigiu a verificação de jurisdição para que strings-placeholder (`Não informado`, `desconhecido`, `N/A` e equivalentes) não sejam tratadas como órgão autuador válido.
- Commit `1a74f76e5a1ae3ccc798a4115ab5e245236c073d`: adicionou regressões para valores ausentes/placeholders e para `DETRAN-SP`.
- CI completo, incluindo testes Vitest, typecheck e build: **PASS**. Execução: https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40196810016
- Workflow Cloudflare: **PASS** para discovery e testes de contrato. O passo de deploy foi **SKIPPED** pelo gate de publicação; isso não comprova que a correção esteja implantada em produção. Execução: https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/40196810036

### Limites e próximo bloqueador

- Não foi executada geração real de documento nem uma bateria E2E com persistência.
- A inspeção de projetos Supabase conectados encontrou apenas o projeto de produção `llmxnpgjpxcvyrqjkfwb` para este produto; não há branch de desenvolvimento Supabase listado. Portanto, a verificação de persistência real exigida pela especificação E2E está **BLOQUEADA** até existir um projeto de teste explicitamente configurado. Não foram feitas escritas sintéticas em produção nem criado projeto novo.
- A correção não resolve por si só a cobertura jurídica dos catálogos, o teste de classificação FARI, nem comprova que documentos reais passam nos gates com evidência jurídica suficiente.
- Nenhum deploy de produção foi realizado e nenhum pagamento real foi criado.

**Próxima ação:** preparar/confirmar um ambiente Supabase de teste isolado; depois executar os cenários E2E autorizados que percorrem análise, geração documental, persistência e recuperação. Não reexecutar testes unitários já verdes sem regressão ou mudança relevante.
