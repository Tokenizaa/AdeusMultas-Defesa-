# Delegação ao agente local — Fase 4 da certificação greenfield

**Repositório:** `Tokenizaa/AdeusMultas-Defesa-`  
**Branch:** `rebuild/preproduction-certification-greenfield`  
**PR:** #40 — manter em draft; não fazer merge.  
**Ponto de partida:** o HEAD mais recente da branch `rebuild/preproduction-certification-greenfield` no momento em que o agente iniciar; sincronize antes de alterar arquivos.

## Objetivo

Executar a Fase 4: bateria serial completa de certificação por serviço, somente depois de comprovar os pré-requisitos e aprovar o piloto ponta a ponta. Trabalhe sobre o código atual e a suíte greenfield. Os testes E2E aposentados foram removidos e **não podem ser recuperados, adaptados ou usados como modelo**.

## Portão de entrada obrigatório

Antes de qualquer escrita ou jornada de navegador:

1. Confirme que o checkout está na branch indicada e sincronizado com o commit mais recente do PR #40. Não alterar `main`.
2. Leia `docs/testing/CERTIFICACAO-PRE-PRODUCAO-GREENFIELD.md` e `docs/testing/FASE-4-AGENTE-LOCAL.md`.
3. Execute os testes unitários e o typecheck; diagnostique e corrija os erros na branch, sem mascarar falhas, desabilitar verificações ou excluir testes válidos.
4. Obtenha uma URL HTTPS de pré-produção isolada, confirmada pelo responsável. **Não substitua por localhost, preview arbitrário nem produção.** A configuração Playwright já rejeita a URL de produção conhecida.
5. Confirme que pagamentos estão bloqueados no servidor e que o ambiente não tem credenciais ativas de gateway. Não simular confirmação de pagamento por update direto no banco, token forjado, flag de cliente ou chamada manual.
6. Confirme a disponibilidade de exatamente sete identidades persistentes U1–U7, com credenciais fornecidas via secrets/variáveis protegidas. Não crie 70 contas; não registre segredos em arquivos, terminal capturado, artifacts ou logs.
7. Execute o cadastro/login e a reconciliação inicial das sete identidades somente no ambiente isolado.
8. Execute um único piloto com um usuário/caso e valide no servidor a criação, análise, geração do documento pelo fluxo autorizado do ambiente, Quality Gate, persistência e recuperação após novo login.

**Se qualquer item falhar ou não puder ser provado, marque a Fase 4 como BLOCKED, registre o motivo e pare. Não inicie a bateria dos sete serviços.** Não contorne o gate de pagamento. A ausência de sandbox de gateway não autoriza uma cobrança real.

## Serviços canônicos confirmados no código

Os identificadores abaixo devem corresponder exatamente a `src/core/onboarding/rules-matrix.ts`. Não substitua os nomes de serviço por rótulos de interface:

1. `defesa_previa` — Notificação de Autuação (Art. 281 CTB)
2. `recurso_jari` — Recurso JARI, 1ª instância
3. `recurso_cetran` — Recurso CONTRAN/CETRAN, 2ª instância
4. `suspensao_cnh` — Suspensão da CNH / Lei Seca
5. `cassacao_cnh` — Cassação da CNH (PCDD)
6. `indicacao_condutor` — Indicação de Real Condutor (Art. 257, § 7º)
7. `conversao_advertencia` — Conversão em Advertência (Art. 267 CTB)

## Bateria serial após aprovação do piloto

Execute um serviço por vez, com `workers=1` e `retries=0`, usando somente os contratos e a UI atuais:

1. `defesa_previa`
2. `recurso_jari`
3. `recurso_cetran`
4. `suspensao_cnh`
5. `cassacao_cnh`
6. `indicacao_condutor`
7. `conversao_advertencia`

Em cada serviço, percorra os cenários aplicáveis das sete identidades, sem criar uma identidade por serviço. Pare no primeiro gate obrigatório FAIL/BLOCKED; não avance para o serviço seguinte até produzir evidência e aprovação explícita do serviço atual.

Para cada caso, registre run ID, commit SHA, ambiente, usuário lógico, serviço, ID do caso, AIT sintético exclusivo, IDs de análise/documento, Quality Gate, recuperação após novo login e reconciliação server-side. Redija dados pessoais e segredos.

## Segurança e limites

- Proibido abrir ou usar `https://adeusmulta.defesai.com.br` como alvo de certificação greenfield.
- Proibidos deploys, merges, migrações, alteração de configuração/segredos de produção, cobranças reais e alterações em dados de produção.
- Não criar, atualizar nem excluir registros manualmente para fazer um teste passar.
- Não executar cleanup destrutivo automático. Qualquer limpeza aprovada deve usar IDs exatos da execução e demonstrar reconciliação antes/depois.
- Não declarar documento gerado com base apenas em HTTP 200, texto da UI, fixture, mock ou teste do motor isolado.
- Não adaptar testes antigos: a evidência precisa vir da jornada e dos contratos atuais.

## Entrega exigida

Atualize o relatório de certificação com PASS/FAIL/BLOCKED/NOT_RUN por gate, evidências reproduzíveis e motivo de cada bloqueio. Faça commits apenas nesta branch. Mantenha o PR em draft e encerre com um resumo factual do que foi executado, o que passou, o que falhou e o que ficou bloqueado. A certificação global permanece **não aprovada** enquanto houver qualquer gate obrigatório BLOCKED, FAIL ou NOT_RUN.
