# Onboarding — estado do rebuild greenfield

**Atualizado:** 2026-10-18  
**Branch de implementação:** `onboarding/manual-intake-greenfield`  
**PR:** [#38](https://github.com/Tokenizaa/AdeusMultas-Defesa-/pull/38) — permanece em draft  
**Produção:** não alterada; nenhuma migração ou deploy executado.

## Decisão vigente

O onboarding novo coleta dados manualmente e **não usa OCR**. A pessoa informa cada fato com instruções sobre onde encontrá-lo; campos ausentes não são inferidos. A decisão está registrada em `docs/product/onboarding/DECISAO-ONBOARDING-MANUAL-SEM-OCR-2026-10-18.md`.

## Implementado nesta branch

- [x] Revisão do estado de `main`: `/novo-caso` continua usando o wizard existente.
- [x] Decisão canônica de coleta manual sem OCR.
- [x] Validação e normalização dos campos manuais.
- [x] Página greenfield isolada em `/novo-caso-rebuild`, sem upload nem chamada de OCR.
- [x] Criação anônima integrada ao contrato `POST /api/cases/anonymous`.
- [x] Tratamento de respostas HTTP não exitosas e validação do ID retornado antes de confirmar o registro.
- [x] Armazenamento de ID e token de recuperação na sessão; os dados do caso continuam no servidor.
- [x] Handoff de login/cadastro e botão de claim autenticado pela rota canônica `POST /api/cases/:id/claim`; após sucesso confirmado pelo servidor, a sessão auxiliar é limpa e a pessoa segue para `/cases`.
- [x] Testes unitários existentes de normalização/validação.
- [x] Testes do endpoint para token válido/inválido e rate limit em `cloudflare/routes/cases.test.ts`.
- [x] Nova suíte Playwright isolada para validação de formulário, payload manual, recuperação após reload, falha da API e ausência de chamadas OCR: `tests/onboarding-manual-rebuild.spec.ts`.
- [x] Instruções para executar a suíte somente contra o preview HTTPS da branch.

## Como preparar e executar os testes de preview

A suíte usa respostas HTTP simuladas para validar o comportamento de interface e **não cria registros no Supabase**. Ela não substitui os testes de integração do endpoint real.

1. Aguarde uma implantação de preview HTTPS correspondente à branch do PR.
2. Configure `PLAYWRIGHT_BASE_URL` com a URL HTTPS desse preview.
3. Execute a suíte isolada:

```bash
RUN_MANUAL_REBUILD_E2E=1 PLAYWRIGHT_BASE_URL=https://<URL-DO-PREVIEW> npx playwright test tests/onboarding-manual-rebuild.spec.ts --project=chromium-production
```

4. Para a suíte normal, mantenha `RUN_MANUAL_REBUILD_E2E` ausente; os testes específicos do preview ficam ignorados por padrão.
5. Registre o resultado do CI para lint/typecheck, testes unitários e build. Não marque a suíte como aprovada antes de observar o resultado real.

## Jornada completa — ainda bloqueada para ativação

A página atual comprova apenas a criação do registro. Ela ainda não oferece a jornada completa de produção. Os itens abaixo permanecem pendentes e devem ser implementados e testados antes de trocar a rota pública:

- [ ] Validar recuperação server-side em ambiente de integração real e testar o limite de tentativas; a recuperação por ID + token foi implementada, mas ainda depende de CI e E2E real.
- [ ] Validar em E2E real a continuidade após cadastro/login e claim; a chamada ao contrato canônico está conectada na UI, mas ainda precisa de teste autenticado contra preview e validação de concorrência.
- [x] Formulário de qualificação do requerente com validação server-side e persistência restrita de dados pessoais; endpoint dedicado exige caso vinculado ao usuário autenticado.
- [x] Tela de revisão explícita dos dados de autuação e requerente antes de iniciar o checkout.
- [ ] Diagnóstico jurídico apresentado apenas com resultados efetivamente retornados pelo motor canônico; sem inventar artigos, teses, documentos ou probabilidade de êxito.
- [x] Integração inicial ao fluxo de preço/PIX existente: cobrança iniciada sob ação explícita do usuário, preço e valor vêm da resposta do servidor, dados PIX incompletos/simulados são recusados e a consulta autenticada só considera `PAID` como confirmação.
- [ ] Validar em sandbox a criação da ordem e o ciclo real de webhook/status, incluindo pendente, pago, cancelado e estornado.
- [x] UI só solicita geração após o endpoint de status retornar `PAID`; o backend também bloqueia a rota de geração quando `cases.is_paid` não está confirmado.
- [ ] Validar que o webhook autoritativo atualiza `cases.is_paid` e a ordem de pagamento no mesmo fluxo de integração de sandbox.
- [ ] Checklist/documento final derivado dos dados e da análise persistidos no servidor.
- [ ] E2E de ponta a ponta em ambiente de teste: criação, falha/retentativa, reload, claim válido/inválido, revisão, pagamento pendente/aprovado/recusado, geração e leitura do documento.
- [ ] Reconciliação de registros criados nos testes e limpeza restrita aos IDs/identificadores exclusivos da execução.
- [ ] Revisão técnica e jurídica do fluxo final.
- [ ] Substituir `/novo-caso` somente após todas as verificações anteriores passarem.

## Restrições de segurança e validação

- Não realizar deploy de produção, migração ou alteração de dados reais durante a preparação.
- Não executar cobrança real em E2E. Usar sandbox ou mocks explicitamente identificados; simulação nunca pode ser apresentada como pagamento real.
- Não declarar análise, pagamento ou minuta concluídos com base apenas na resposta de criação do caso.
- Não chamar o endpoint autenticado de claim sem sessão válida e token emitido pelo servidor.
- A suíte Playwright adicionada cobre o comportamento do preview com API simulada; ela não prova a integração real com Supabase, o fluxo de pagamento ou a geração final.

**Estado honesto (2026-10-18):** intake manual, recuperação protegida, claim, qualificação, revisão, criação de PIX e solicitação de geração condicionada ao pagamento estão conectados na branch. Ainda é obrigatório observar o CI do commit final, validar o webhook/status em sandbox e executar E2E autenticado real. O PR deve continuar em draft e a rota pública atual deve permanecer intacta.
