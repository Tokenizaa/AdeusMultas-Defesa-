# Matriz de validação — rota canônica do onboarding manual

**Data:** 2026-10-18  
**Repositório:** `Tokenizaa/AdeusMultas-Defesa-`  
**Branch:** `onboarding/manual-intake-greenfield`  
**PR:** [#38](https://github.com/Tokenizaa/AdeusMultas-Defesa-/pull/38)  
**Escopo:** roteamento de interface e regressão local; não é certificação de produção.

## Decisão de rota

- **Canônica:** `/novo-caso`.
- **Compatibilidade:** `/novo-caso-rebuild` e `/onboarding` normalizam para `/novo-caso`.
- **Navegação pública:** CTAs e ações de criação de caso devem usar `/novo-caso`.
- **404:** qualquer rota pública desconhecida deve mostrar a página 404, sem renderizar o formulário.
- **Produção:** não foi feito deploy; o comportamento desta branch não deve ser atribuído ao site publicado.

## Testes adicionados/ajustados

| Caso | Evidência esperada | Tipo | Estado |
|---|---|---|---|
| Abertura direta de `/novo-caso` | URL canônica, título “Informe os dados da autuação” e botão “Registrar dados” visíveis | Playwright UI | Aguardando CI após commit |
| Acesso ao alias `/novo-caso-rebuild` | Navegador normaliza a URL para `/novo-caso` e exibe o formulário | Playwright UI | Aguardando CI após commit |
| Rota desconhecida | Título 404 e mensagem de não encontrada; botão retorna à home | Playwright UI | Aguardando CI após commit |
| Validação do formulário e ausência de POST em formulário incompleto | Nenhum POST de criação | Playwright com APIs simuladas | Regressão prévia reportada: aprovado; reexecutar no CI |
| Criação manual, token de recuperação e ausência de OCR | Payload esperado; nenhum endpoint OCR chamado | Playwright com APIs simuladas | Regressão prévia reportada: aprovado; reexecutar no CI |
| Sete serviços no formulário | Valores canônicos e no máximo uma criação por envio | Playwright com APIs simuladas | Regressão prévia reportada: aprovado; reexecutar no CI |
| Handoff de login/claim | ID/token mantidos na sessão durante handoff | Playwright com APIs simuladas | Regressão prévia reportada: aprovado; reexecutar no CI |
| Recuperação após reload | Endpoint recebe o token e apresenta os dados retornados | Playwright com APIs simuladas | Regressão prévia reportada: aprovado; reexecutar no CI |
| Falha HTTP de criação | Erro visível; caso não é declarado criado | Playwright com APIs simuladas | Regressão prévia reportada: aprovado; reexecutar no CI |

## Limites

- Os testes de navegador usam APIs simuladas para os cenários de intake. Eles validam o comportamento da UI, não persistência real em Supabase.
- Um HTTP 200 do servidor estático não prova que a rota da aplicação esteja registrada; a asserção relevante é a renderização do componente correto e a URL canônica.
- Esta matriz não certifica precisão jurídica, geração de minuta, RLS, pagamentos, webhooks nem a jornada integrada dos sete serviços.
- Não houve deploy, migração, alteração em `main`, criação de caso em produção ou transação financeira nesta atividade.

## Próxima decisão

Aguardar CI e revisar o diff. Se os testes passarem, manter o PR em draft enquanto a equipe decide quando autorizar a publicação. Somente após deploy autorizado deve ser repetido um smoke de produção, primeiro validando a renderização da rota e sem submeter o formulário.
