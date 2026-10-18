# Matriz de validação — rota canônica do onboarding manual

**Data:** 2026-10-18  
**Repositório:** `Tokenizaa/AdeusMultas-Defesa-`  
**Branch:** `onboarding/manual-intake-greenfield`  
**PR:** [#38](https://github.com/Tokenizaa/AdeusMultas-Defesa-/pull/38)  
**Escopo:** roteamento de interface e regressão; não é certificação de produção.

## Decisão de rota

- **Canônica:** `/novo-caso`.
- **Compatibilidade:** `/novo-caso-rebuild` e `/onboarding` normalizam para `/novo-caso`.
- **Navegação pública:** CTAs e ações de criação de caso usam `/novo-caso`.
- **404:** uma rota pública desconhecida mostra a página 404, sem renderizar o formulário.
- **Produção:** não houve deploy; os resultados abaixo se referem à branch e aos testes do CI.

## Evidências do GitHub Actions

- [Manual Onboarding UI Contract Tests — run 39163188769](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/39163188769): **SUCCESS**, 9/9 testes Playwright aprovados em 21,8 s. Inclui rota canônica, normalização do alias, 404/retorno à home e seis cenários do onboarding manual.
- [CI/CD Pipeline — run 39163188846](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/39163188846): **SUCCESS**; testes unitários/auditoria, typecheck e build concluídos. O job `production-golden-path` foi ignorado.
- [Cloudflare Deploy — run 39163188775](https://github.com/Tokenizaa/AdeusMultas-Defesa-/actions/runs/39163188775): **SUCCESS** nos testes de contratos de Worker, incluindo intake anônimo e recuperação. A etapa **Build and deploy to Cloudflare** foi ignorada pela condição do workflow; não houve deploy.

## Casos e resultados

| Caso | Evidência observada | Tipo | Resultado |
|---|---|---|---|
| Abertura direta de `/novo-caso` | URL canônica, título “Informe os dados da autuação” e botão “Registrar dados” visíveis | Playwright UI | **Aprovado** |
| Acesso ao alias `/novo-caso-rebuild` | URL normalizada para `/novo-caso` e formulário visível | Playwright UI | **Aprovado** |
| Rota desconhecida | Título 404 e mensagem de não encontrada; botão retorna à home | Playwright UI | **Aprovado** |
| Formulário incompleto | Mensagens de validação e nenhum POST de criação | Playwright com APIs simuladas | **Aprovado** |
| Intake manual e recuperação | Payload esperado, ID/token de recuperação e nenhuma chamada OCR | Playwright com APIs simuladas | **Aprovado** |
| Sete serviços | Valores canônicos e no máximo uma criação por envio | Playwright com APIs simuladas | **Aprovado** |
| Handoff de login/claim | ID/token mantidos na sessão durante o handoff | Playwright com APIs simuladas | **Aprovado** |
| Recuperação após reload | Endpoint recebe token e exibe dados retornados | Playwright com APIs simuladas | **Aprovado** |
| Falha HTTP de criação | Erro visível; UI não declara caso criado | Playwright com APIs simuladas | **Aprovado** |

## Limites e estado final

- A suíte de navegador usa APIs simuladas nos cenários de intake; comprova o comportamento da UI, não persistência real em Supabase.
- Um HTTP 200 do servidor estático não prova que a rota da aplicação esteja registrada; a asserção relevante é a renderização do componente e a URL canônica.
- Esta matriz não certifica precisão jurídica, geração de minuta, RLS, pagamentos, webhooks nem a jornada integrada dos sete serviços.
- Nenhum deploy, migração, alteração em `main`, criação de caso em produção ou transação financeira foi realizado.
- O PR permanece em draft; a publicação exige autorização explícita. Só depois de deploy autorizado deve ser executado smoke de produção, inicialmente sem enviar o formulário.
