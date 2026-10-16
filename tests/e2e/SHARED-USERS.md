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

A infraestrutura reutiliza cinco contas sintéticas já existentes no Auth:

- `e2e+defesa_previa+01@test.local`
- `e2e+defesa_previa+02@test.local`
- `e2e+defesa_previa+03@test.local`
- `e2e+defesa_previa+04@test.local`
- `e2e+recurso_jari+01@test.local`

As contas são reutilizadas entre serviços; os casos continuam separados por serviço e cenário. Não execute esta suíte com contas reais.

## Execução

Configure as variáveis necessárias no ambiente seguro, sem adicioná-las ao repositório:

- `PLAYWRIGHT_BASE_URL`: URL HTTPS da implantação a testar.
- `SUPABASE_URL`: URL do projeto Supabase de teste.
- `SUPABASE_SERVICE_ROLE_KEY`: chave administrativa mantida somente no ambiente seguro.
- `SUPABASE_ANON_KEY`: chave pública, quando exigida pelo executor.

Execute:

```bash
npm run test:e2e:shared
```

A suíte usa um worker para evitar que os arquivos de estado/evidência da mesma execução sejam inicializados em paralelo.

## Persistência e segurança

A suíte cria casos de teste persistentes e arquivos de evidência em `tests/e2e-results/<E2E_TEST_RUN_ID>/`. Cada execução nova deve usar um `E2E_TEST_RUN_ID` novo. Não limpe automaticamente casos, perfis, usuários, resultados de auditoria ou registros financeiros. A suíte não deve efetuar pagamentos reais.
