# Suíte E2E por serviço com usuários compartilhados

## Objetivo

Executar os cenários por tipo de serviço sem criar uma conta por cenário. A suíte mantém os sete grupos comerciais existentes e seus dez cenários cada (70 cenários no total), reutilizando cinco contas sintéticas persistentes.

## Grupos de serviço

- `defesa_previa`
- `recurso_jari`
- `recurso_cetran`
- `suspensao`
- `cassacao`
- `indicacao_condutor`
- `conversao_advertencia`

Cada arquivo de serviço executa seus dez cenários em sequência, registra evidências individuais e produz um resumo do serviço. O `TEST_RUN_ID` separa os artefatos de cada execução.

## Contas compartilhadas

A infraestrutura mantém exatamente cinco contas sintéticas compartilhadas no Auth:

- `e2e+defesa_previa+01@test.local`
- `e2e+defesa_previa+02@test.local`
- `e2e+defesa_previa+03@test.local`
- `e2e+defesa_previa+04@test.local`
- `e2e+recurso_jari+01@test.local`

As contas são reutilizadas entre serviços; os casos continuam separados por serviço e cenário. Não execute esta suíte com contas reais.

## Execução

Configure as variáveis necessárias no ambiente seguro, sem adicioná-las ao repositório:

- `PLAYWRIGHT_BASE_URL`: URL HTTPS da implantação a testar.
- `SUPABASE_URL`: URL explícita do projeto Supabase de teste.
- `E2E_ALLOW_PERSISTENT_WRITES=true`: confirmação explícita de que você autorizou a suíte a criar casos persistentes.
- `SUPABASE_SERVICE_ROLE_KEY`: chave administrativa mantida somente no ambiente seguro.
- `SUPABASE_ANON_KEY`: chave pública, quando exigida pelo executor.

O mock do PIX é ativado por padrão no executor E2E. Não habilite pagamentos reais para executar a matriz de 70 cenários; testes de gateway real devem ser isolados e autorizados separadamente.

Execute:

```bash
npm run test:e2e:shared
```

A suíte usa um worker para evitar que os arquivos de estado/evidência da mesma execução sejam inicializados em paralelo. Para execução local, use `npm run test:e2e:managed-local`; o gerenciador reutiliza Vite/Wrangler saudáveis, inicia somente quando ambos estão ausentes e nunca encerra processos por padrão.

## Persistência e segurança

A infraestrutura recusa iniciar sem `SUPABASE_URL` explícita e `E2E_ALLOW_PERSISTENT_WRITES=true`. Ela mantém cinco identidades e prepara os 70 cenários em memória; cada cenário cria seu caso real ao percorrer a interface pública. Não semeie 70 linhas em `cases` como preparação. Quando existe `initial-state.json` para o mesmo `E2E_TEST_RUN_ID`, a suíte reutiliza estado e casos já registrados e normaliza as identidades para cinco em memória. Evidências ficam em `tests/e2e-results/<E2E_TEST_RUN_ID>/`. Não limpe automaticamente casos, perfis, usuários, resultados de auditoria ou registros financeiros. A suíte não efetua pagamentos reais por padrão. O executor só permite a rota real de PIX quando `E2E_ALLOW_REAL_PAYMENT=true`; não use essa variável na matriz compartilhada.
