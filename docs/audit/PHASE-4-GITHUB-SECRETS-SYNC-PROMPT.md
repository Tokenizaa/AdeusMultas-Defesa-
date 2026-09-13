# Phase 4 — Prompt para sincronizar secrets do ambiente local com GitHub Actions

## Objetivo

Preparar a execução real do Golden Path de produção da Fase 4 sem colocar credenciais ou valores sensíveis no repositório.

O projeto local já possui as variáveis necessárias para o E2E de produção. O agente local deve sincronizar **os valores como GitHub Actions Secrets**, nunca commitar `.env`, arquivos de credenciais ou valores das variáveis.

## Prompt para o agente local

```text
Você está trabalhando no repositório Tokenizaa/AdeusMultas-Defesa-.

OBJETIVO: preparar a Fase 4 para executar o Golden Path REAL em produção.

IMPORTANTE:
- NÃO commite arquivos .env.
- NÃO commite valores de secrets.
- NÃO imprima valores de secrets nos logs.
- NÃO envie credenciais para código-fonte, documentação ou issues.
- Use GitHub Actions Secrets para os valores sensíveis.
- Preserve o working tree e não altere código funcional sem necessidade.

1. Verifique no ambiente local quais destas variáveis existem e possuem valor:
   PLAYWRIGHT_BASE_URL
   E2E_TEST_EMAIL
   E2E_TEST_PASSWORD
   E2E_RUN_ID (opcional; pode ser gerado pelo workflow)

2. Confirme que PLAYWRIGHT_BASE_URL aponta para produção HTTPS.
   O Golden Path deve usar produção real, nunca localhost, mock ou preview.

3. Verifique se o GitHub CLI está autenticado:
   gh auth status

4. Verifique o repositório remoto atual:
   git remote -v
   Deve apontar para Tokenizaa/AdeusMultas-Defesa-.

5. Sincronize SOMENTE os valores das três variáveis obrigatórias como GitHub Actions Secrets:
   gh secret set PLAYWRIGHT_BASE_URL --body "$PLAYWRIGHT_BASE_URL" --repo Tokenizaa/AdeusMultas-Defesa-
   gh secret set E2E_TEST_EMAIL --body "$E2E_TEST_EMAIL" --repo Tokenizaa/AdeusMultas-Defesa-
   gh secret set E2E_TEST_PASSWORD --body "$E2E_TEST_PASSWORD" --repo Tokenizaa/AdeusMultas-Defesa-

   Se o shell/ambiente não permitir a expansão segura via --body, use stdin:
   printf '%s' "$PLAYWRIGHT_BASE_URL" | gh secret set PLAYWRIGHT_BASE_URL --repo Tokenizaa/AdeusMultas-Defesa- --body -
   (e equivalente para as demais variáveis).

6. NÃO crie secret para E2E_RUN_ID se o workflow puder gerar esse identificador com:
   golden-${{ github.run_id }}

7. Depois da sincronização, valide APENAS a existência dos nomes dos secrets, sem revelar valores. Use:
   gh secret list --repo Tokenizaa/AdeusMultas-Defesa-

8. Verifique que aparecem:
   PLAYWRIGHT_BASE_URL
   E2E_TEST_EMAIL
   E2E_TEST_PASSWORD

9. Se algum secret já existir, atualize-o com o valor atual do ambiente local somente se a variável local estiver preenchida.

10. NÃO faça commit das variáveis.
    O único estado persistido deve ser no GitHub Actions Secrets.

11. Após concluir, reporte somente:
    - secrets encontrados/sincronizados por NOME;
    - se os três secrets obrigatórios estão presentes;
    - se PLAYWRIGHT_BASE_URL é HTTPS e aponta para produção;
    - SHA/branch de qualquer commit que tenha sido necessário.

    NUNCA reporte os valores de PLAYWRIGHT_BASE_URL, E2E_TEST_EMAIL ou E2E_TEST_PASSWORD.

12. Se não tiver permissão para gravar GitHub Secrets, NÃO tente contornar a proteção e NÃO coloque os valores no repositório. Informe exatamente qual permissão/ação manual falta.

RESULTADO ESPERADO:
Os três secrets obrigatórios existem no repositório GitHub e estão disponíveis para um workflow de produção. Nenhum segredo foi commitado.
```

## Critério de aceite

A sincronização só é considerada concluída quando o agente local comprovar, sem revelar valores, que estes três GitHub Actions Secrets existem:

- `PLAYWRIGHT_BASE_URL`
- `E2E_TEST_EMAIL`
- `E2E_TEST_PASSWORD`

A presença dos secrets **não fecha a Fase 4**. O fechamento exige ainda a execução do Golden Path em produção e a evidência do fluxo completo, incluindo persistência/reconciliação no Supabase.
