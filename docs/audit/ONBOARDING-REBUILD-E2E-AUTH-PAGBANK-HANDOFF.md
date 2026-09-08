# Handoff — E2E autenticado + PagBank

## Objetivo

Fechar a validação real do novo onboarding greenfield, usando uma sessão Supabase legítima do usuário de teste `nettofarias01@gmail.com`, sem criar autenticação paralela e sem expor senha, token ou segredo no código.

## Estado conhecido

- O onboarding novo está em `src/onboarding-v2/`.
- A aplicação usa uma única camada de autenticação HTTP: `authFetch`.
- O draft anônimo recebe um `claimToken` próprio, distinto do `caseId`.
- O servidor aceita o `claimToken` somente para o caso correspondente.
- O pagamento usa as rotas canônicas `/api/pix/create` e `/api/pix/status/:txId`.
- A geração usa `/api/cases/:id/generate-defense`.
- O deployment atual da Vercel está operacional, mas o teste direto sem sessão encontrou `401` no fluxo de pagamento.
- Ainda não está comprovado que uma sessão Supabase de usuário consegue atravessar o checkout e chegar ao PagBank.

## Variáveis de ambiente — regra para o agente local

O agente local **pode e deve usar o `.env` local existente** para executar os testes, inclusive as variáveis necessárias do PagBank, desde que o arquivo permaneça fora do Git.

Regras obrigatórias:

- Nunca copiar o conteúdo do `.env` para arquivos versionados.
- Nunca colocar secrets em código, documentação, testes, screenshots ou logs.
- Nunca imprimir valores completos de tokens, client secrets, access tokens, certificados ou chaves privadas.
- Se precisar registrar configuração, registrar somente nomes das variáveis e `configured=true/false`.
- Confirmar que `.env`, `.env.local` e equivalentes estão no `.gitignore`.

### Sincronização com Vercel

O agente local deve verificar se as variáveis necessárias para o runtime estão cadastradas no projeto Vercel `defesai`.

Se alguma variável necessária estiver ausente, **pode cadastrá-la na Vercel usando o CLI/API autorizado disponível no ambiente local**, sem revelar seu valor no relatório.

Preferir a sincronização segura a partir do ambiente local, por exemplo usando o fluxo oficial do Vercel CLI para adicionar variáveis de ambiente. Não criar arquivo com secrets para commit.

Antes de alterar Vercel:

1. identificar exatamente quais nomes de variáveis o código PagBank realmente consome;
2. comparar presença local × Vercel;
3. cadastrar somente as variáveis necessárias;
4. aplicar aos ambientes corretos (`production` e/ou `preview`) conforme o teste;
5. não alterar variáveis não relacionadas;
6. redeployar depois da alteração;
7. verificar o deployment e os logs sem expor secrets.

Se o CLI exigir autenticação e o agente não possuir acesso autorizado, não improvisar credenciais. Informar exatamente qual operação ficou bloqueada.

## O que o agente local deve fazer

1. **Reproduzir o problema primeiro.**
   - Rodar a aplicação na branch atual.
   - Executar testes existentes.
   - Verificar o fluxo novo sem alterar código.
   - Confirmar exatamente onde ocorre o `401`.

2. **Auditar o contrato de pagamento.**
   - Inspecionar `src/server/routes/payments.ts`.
   - Inspecionar `src/server/integrations/gateway.ts` e `src/server/integrations/pagbank.ts`.
   - Inspecionar a montagem das rotas em `src/server/app.ts`.
   - Determinar por que um cliente autenticado recebe bloqueio no checkout.
   - A regra de admin do PagBank não pode ser usada como substituto de autorização do proprietário do caso.
   - Não remover autenticação: corrigir para autenticação + autorização adequada do caso.

3. **Garantir autorização canônica.**
   - Para usuário autenticado, o servidor deve obter a identidade do JWT Supabase.
   - O `caseId` deve ser validado contra o usuário/case ownership ou contra o claim token válido quando o fluxo ainda for anônimo.
   - Dados comerciais sensíveis não devem depender de identidade enviada pelo browser quando podem ser derivados do caso.
   - Não aceitar `userId`, `role`, `amount` ou identidade privilegiada enviados pelo cliente como autoridade.

4. **Validar configuração do gateway sem expor segredo.**
   - Usar o `.env` local para testes quando disponível.
   - Comparar com a configuração da Vercel.
   - Não imprimir tokens, client secrets, access tokens ou valores completos de variáveis.
   - Verificar somente presença/configuração e comportamento do gateway.
   - Determinar se o ambiente é sandbox/teste ou produção antes de criar qualquer cobrança.
   - Nunca criar uma cobrança real em produção sem confirmação explícita do usuário.

5. **Executar o E2E autenticado.**
   - Usar o usuário Supabase existente `nettofarias01@gmail.com`.
   - A autenticação deve ocorrer normalmente pelo Supabase; não criar senha hardcoded, sessão fake, JWT fake ou header `x-user-*`.
   - Se o ambiente local possuir sessão autenticada legítima, usar essa sessão.
   - Se a autenticação exigir interação manual, parar exatamente nesse ponto e informar o passo necessário, sem solicitar senha ao agente remoto.

6. **Validar o fluxo completo.**

```text
login Supabase
  ↓
novo onboarding
  ↓
draft canônico
  ↓
evidência/OCR
  ↓
análise canônica
  ↓
qualificação
  ↓
revisão
  ↓
checkout
  ↓
/api/pix/create
  ↓
PagBank
  ↓
/api/pix/status/:txId
  ↓
pagamento aprovado
  ↓
/api/cases/:id/generate-defense
  ↓
documento pronto
```

7. **Testar falhas importantes.**
   - usuário não autenticado tentando pagar caso de outro usuário → negar.
   - usuário autenticado tentando pagar caso alheio → negar.
   - claim token inválido → negar.
   - `caseId` inexistente → negar.
   - gateway indisponível → erro explícito, sem falso pagamento.
   - geração falhando → não marcar documento como pronto.
   - reload durante onboarding → recuperar somente o estado que o contrato permite.

8. **Corrigir somente o necessário.**
   - Não reutilizar código do onboarding legado.
   - Não criar nova camada de autenticação.
   - Não introduzir fallback silencioso.
   - Não simular aprovação de pagamento.
   - Não alterar contratos canônicos sem evidência de incompatibilidade.

9. **Testes e evidências obrigatórios.**
   - `npm run lint`
   - `npm run test:unit`
   - testes E2E relevantes
   - build de produção
   - evidência do status HTTP de cada etapa crítica
   - registrar `caseId`, `txId` e IDs de teste somente se não forem segredos; não registrar tokens ou credenciais.

10. **Commit.**
    - Fazer commits pequenos e objetivos.
    - Mensagem sugerida: `fix(onboarding): authorize authenticated checkout and verify pagbank flow`
    - No final, informar SHA, testes executados e resultado real.

## Critério de conclusão

A tarefa só pode ser considerada concluída quando houver evidência de que:

- a sessão Supabase legítima autentica o usuário;
- o caso é associado corretamente à identidade/claim;
- o checkout não exige papel de administrador indevidamente;
- o `/api/pix/create` chega ao gateway configurado;
- o status da transação é consultável;
- pagamento aprovado não é simulado;
- a geração ocorre somente após as condições canônicas;
- nenhum segredo aparece em logs, testes, commits ou artefatos.

Se não for possível completar a última etapa por falta de sessão autenticada/interação manual, **não inventar sucesso**. Entregar o ponto exato de bloqueio e deixar o código preparado para a continuação.
