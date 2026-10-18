# Onboarding — estado do rebuild greenfield

**Atualizado:** 2026-10-18  
**Branch de implementação:** `onboarding/manual-intake-greenfield`  
**PR:** [#38](https://github.com/Tokenizaa/AdeusMultas-Defesa-/pull/38) — permanece em draft  
**Produção:** não alterada. Não há ambiente ou URL de pré-produção configurado. O smoke de produção usa exclusivamente `https://adeusmulta.defesai.com.br` e para antes de gravar se `/novo-caso-rebuild` não estiver publicado.

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
- [x] Ambiente Cloudflare `preview` separado (`adeusmulta-onboarding-pr38-preview`) para a bateria de navegador do PR.
- [x] Proteção backend `E2E_SAFE_PREVIEW=true`: bloqueia PIX e cartão antes de consultar preço, gravar ordem ou contactar gateway.
- [x] Workflow `Cloudflare Deploy` passa a publicar o Worker de preview apenas em PR do mesmo repositório e executar a suíte Playwright manual; upload de relatório como artifact.
- [x] Teste unitário prova que o preview não contata gateway nem persiste ordem, mesmo com `VENO_PRIMARY_GATEWAY=venopag` e credenciais fornecidas ao binding.
- [x] Instruções para executar a suíte somente contra o preview HTTPS da branch.

## Bateria de testes e ambiente VenoPag

O workflow `.github/workflows/cloudflare-deploy.yml` faz o seguinte em PR da mesma organização:
1. Executa os testes unitários de rotas de Worker, incluindo o contrato VenoPag e a verificação HMAC.
2. Publica a branch em um Worker Cloudflare separado: `adeusmulta-onboarding-pr38-preview`.
3. Executa `tests/onboarding-manual-rebuild.spec.ts` com Playwright contra o preview HTTPS.
4. Guarda `playwright-report/` e `test-results/` como artifact do workflow.

A configuração de produção permanece com `VENO_PRIMARY_GATEWAY=venopag` e `PAYMENT_MODE=production`. O preview também declara VenoPag como gateway primário para preservar a configuração, mas define `E2E_SAFE_PREVIEW=true`. Esse bloqueio server-side impede criação de PIX/cartão, mesmo que credenciais sejam acidentalmente vinculadas ao Worker. O preview não recebe os secrets de VenoPag nem de service role do Supabase.

**Limite financeiro:** a documentação do projeto registra que a VenoPag não tem sandbox público. A suíte de preview e os testes de contrato não movimentam dinheiro. O Golden Path que gera uma cobrança real deve ser executado separadamente, com autorização explícita para uma transação real e reconciliação posterior; não o execute como parte automática de PR.

Para execução manual contra o preview já implantado:

```bash
RUN_MANUAL_REBUILD_E2E=1 PLAYWRIGHT_BASE_URL=https://<URL-DO-PREVIEW> npx playwright test tests/onboarding-manual-rebuild.spec.ts --project=chromium-production --workers=1 --retries=0
```

Não execute a suíte de produção Golden Path para validar somente a interface: ela cria PIX real. A bateria de preview usa mocks apenas nas chamadas do navegador para testar validação, intake, recuperação, handoff e erros; os contratos backend e VenoPag são cobertos pelos testes unitários sem chamadas ao provedor.

## Jornada completa — ainda bloqueada para ativação

A página nova já conecta intake, recuperação, claim, qualificação, revisão, início de PIX e solicitação de geração após confirmação. O fluxo ainda não foi comprovado ponta a ponta contra uma integração autenticada e a VenoPag real; os gates abaixo permanecem pendentes antes de trocar a rota pública:

- [ ] Validar recuperação server-side em ambiente de integração real e testar o limite de tentativas; a recuperação por ID + token foi implementada, mas ainda depende de CI e E2E real.
- [ ] Validar em E2E real a continuidade após cadastro/login e claim; a chamada ao contrato canônico está conectada na UI, mas ainda precisa de teste autenticado contra preview e validação de concorrência.
- [x] Formulário de qualificação do requerente com validação server-side e persistência restrita de dados pessoais; endpoint dedicado exige caso vinculado ao usuário autenticado.
- [x] Retomada autenticada da jornada após reload, sem armazenar CPF/CNH/endereço no sessionStorage; estado e dados são reconsultados pelo endpoint proprietário.
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

## Execução sequencial dos sete serviços

O executor de produção agora percorre `/novo-caso-rebuild`, confere a validação dos campos, observa o POST, valida o ID canônico e o token de recuperação, confirma a análise e para na barreira de autenticação/pagamento. Não chama o gateway e não tenta marcar pagamento como aprovado. O reconciliador confere as colunas reais do Supabase, ausência de ordens financeiras e remove somente fixtures anônimas não pagas da execução.

Comandos independentes para executar manualmente, **um por vez**, após o smoke de produção e a análise do serviço anterior:

```bash
# Defina antes SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e PLAYWRIGHT_BASE_URL.
export PLAYWRIGHT_BASE_URL=https://adeusmulta.defesai.com.br
export SUPABASE_URL=https://llmxnpgjpxcvyrqjkfwb.supabase.co
export E2E_ALLOW_PERSISTENT_WRITES=true
export E2E_TEST_RUN_ID="cert-$(date -u +%Y%m%dT%H%M%SZ)-defesa-previa"
export E2E_SERVICE=defesa_previa
npx playwright test --config=playwright.e2e-certification.config.ts --workers=1 --retries=0
npx playwright test --project=chromium-production --workers=1 --retries=0 tests/e2e/services/defesa_previa.spec.ts
```

Para cada serviço seguinte, altere **somente** `E2E_SERVICE` e o sufixo do `E2E_TEST_RUN_ID`, e só execute depois de concluir a análise do serviço anterior:

- `recurso_jari`
- `recurso_cetran`
- `suspensao`
- `cassacao`
- `indicacao_condutor`
- `conversao_advertencia`

O executor de produção não gera documento porque isso exige autenticação e confirmação financeira autoritativa. A cadeia de documento é certificada separadamente pelos testes determinísticos por serviço, sem contornar `cases.is_paid). A prova real de VenoPag/webhook permanece fora desta bateria: não há sandbox público documentado e nenhuma cobrança real foi autorizada.
