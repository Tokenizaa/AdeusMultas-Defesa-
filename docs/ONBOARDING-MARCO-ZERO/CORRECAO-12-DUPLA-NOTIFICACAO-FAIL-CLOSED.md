# Correção 12 — dupla notificação: impedir aprovação sem dados da segunda notificação

**Data:** 2026-10-29  
**Branch:** `main`  
**Commits de código:** `748d1ec8b9a1f46e0f7b22adf1d3cc5f15a4faf6`, `3646b739f2f86a1ace046d88cfff6918c014f0cd`, `2e903f047a85f8716a2ebc8d0beb897d21ae4819`  
**Status:** correção conservadora implementada; CI, revisão do catálogo de validação jurídica e E2E ainda pendentes. Não houve deploy de produção.

## 1. Causa raiz

O teste `src/core/rules/rule-engine.test.ts` esperava `PASS` para `RULE_CONSTITUTIONAL_DUE_PROCESS` quando o caso tinha `notificationExpeditionDate` e `notificationDeliveryDate`. O formulário identifica essas datas como expedição e entrega/recebimento da **Notificação de Autuação (NA)**.

Esse par de datas não demonstra, por si só, que a **Notificação de Imposição de Penalidade (NIP)** foi expedida. A Súmula 312 do STJ exige verificar as notificações da autuação e da aplicação da penalidade; o CTB trata separadamente da expedição da notificação da autuação (art. 281, § 1º, II) e da notificação da imposição da penalidade (art. 282).

Fontes oficiais consultadas:
- Súmula 312 do STJ: https://scon.stj.jus.br/SCON/sumstj/doc.jsp?b=SUMU&i=365&l=100&operador=AND&ordenacao=-%40NUM&p=false&tipo=SUMULA
- Código de Trânsito Brasileiro compilado, arts. 281 e 282: https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm

## 2. Correção implementada

Em `src/core/rules/rule-engine.ts`:

- Quando há dados da Notificação de Autuação, a verificação de dupla notificação agora permanece `DATA_GAP`.
- A lacuna passa a identificar `penaltyNotificationExpeditionDate`, deixando explícito que falta informação separada sobre a Notificação de Imposição de Penalidade.
- A mensagem não declara que houve violação nem que a dupla notificação foi cumprida; orienta a conferir o documento oficial da penalidade.
- A data de entrega da NA não é mais usada como fundamento para marcar `PASS`.

Em `src/components/onboarding/steps/FreeAnalysisResultStep.tsx`:

- O identificador da lacuna recebe rótulo legível: “registro da Notificação de Imposição de Penalidade”.

Em `src/core/rules/rule-engine.test.ts`:

- O cenário com data de expedição e sem data de entrega continua em `DATA_GAP`.
- Foi substituído o teste incorreto que esperava `PASS` com duas datas da NA por uma regressão que exige `DATA_GAP` e ausência de conclusão sobre a segunda notificação.

## 3. Limites e pendências

Esta é uma correção **fail-closed intermediária**. O formulário e o modelo de persistência ainda não têm um campo próprio para a data/documento da NIP. Por isso, a regra não consegue concluir essa verificação e deve permanecer pendente quando existe informação de NA.

- [x] Remover o falso `PASS` baseado apenas nas datas da NA.
- [x] Adicionar regressão de motor para impedir a aprovação indevida.
- [x] Tornar a nova lacuna legível na tela de resultado.
- [ ] Atualizar `src/core/onboarding/legal-validation.ts`, cujo texto de claim/requisitos ainda descreve incorretamente a prova como “não entrega da NA”. Esse catálogo permanece inconsistente com a correção e deve ser corrigido antes de certificar a tarefa.
- [ ] Definir e implementar coleta separada da NIP, incluindo tipos, payload, persistência e migração de banco, antes de permitir que o motor conclua `PASS`.
- [ ] Executar CI no SHA atual e corrigir eventuais falhas.
- [ ] Validar em navegador o texto exibido no detalhe de verificações.
- [ ] Não executar deploy de produção sem autorização explícita.

## 4. Critério de conclusão

A tarefa não está completa enquanto o catálogo de validação jurídica continuar com a afirmação antiga, enquanto a coleta/persistência da NIP não tiver decisão explícita e enquanto o CI não confirmar os testes. A proteção imediata contra falso `PASS` está no código; isso não equivale a certificar a análise de dupla notificação.
