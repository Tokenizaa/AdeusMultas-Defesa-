# E2E GOLDEN PATH — ROADMAP DE AUDITORIA E EXECUÇÃO

**Produto:** Adeus Multa  
**Objetivo:** provar uma jornada vertical real, coerente e auditável, do primeiro acesso ao documento final persistido.

## Regra operacional

Uma fase por vez. Cada fase produz evidência, atualiza este documento, faz commit e para. A próxima fase só é liberada após revisão dos auditores.

## Estado atual

- **Fase 0:** 🟡 parcial/histórica; evidência original não recuperável.
- **Fase 1:** 🔴 concluída com bloqueadores.
- **Fase 2:** 🟡 executada parcialmente; bloqueadores estruturais corrigidos, Golden Path ainda bloqueado.
- **Fase 3:** 🟢 concluída; ambiente de produção reconciliado com o Supabase canônico e referências ao projeto obsoleto removidas do código ativo.
- **Fase 4:** 🔴 execução real iniciada, primeiro bloqueador do harness identificado e corrigido; Golden Path de negócio ainda não comprovado.

## FASE 1 — RESULTADO

A auditoria de contratos e data lineage foi executada sobre o `main` reconciliado.

Artefatos:
- `docs/audit/PHASE-1-CONTRACT-LINEAGE-AUDIT.md`
- `docs/audit/E2E-CONTRACT-MAP.md`

## FASE 2 — RESULTADO

**🟡 EXECUTADA PARCIALMENTE — não libera o Golden Path.**

Foram aplicados RLS/ownership, FK e identidade documental, triggers de garantia e remoção do falso estado `ready`. Permanecem os P0 de sincronização real da cobrança, upload/persistência documental e webhook idempotente.

Artefato:
- `docs/audit/PHASE-2-BLOCKER-CORRECTIONS.md`

## FASE 3 — PREPARAÇÃO DO AMBIENTE E TEST DATA

**🟢 CONCLUÍDA — ambiente de produção reconciliado e pronto para a próxima fase, sem declarar o Golden Path aprovado.**

### 🟢 CONFIRMADO

- Implantação de produção Vercel disponível e `READY`.
- `GET /api/health` em `https://www.defesai.shop` respondeu HTTP 200.
- Produção agora referencia exclusivamente o Supabase canônico `sgomwklorpzdwdubtmgg`.
- A referência ao projeto Supabase obsoleto `llmxnpgjpxcvyrqjkfwb` não foi encontrada no código pesquisável do repositório.
- `playwright.config.ts` exige explicitamente `PLAYWRIGHT_BASE_URL` em HTTPS e não inicia servidor local.
- Harness de dados do Golden Path exige `PLAYWRIGHT_BASE_URL`, `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD` e aceita `E2E_RUN_ID` para isolamento lógico.
- Nenhuma credencial foi adicionada ao repositório.

### 🟡 EVOLUÇÃO PARA A FASE 4

A execução real posterior confirmou que as credenciais externas existem e chegam ao GitHub Actions como secrets, que o runner consegue instalar dependências/Chromium e que o alvo de produção é alcançável. O bloqueio inicial de "executor/credenciais indisponíveis" deixou de ser o bloqueador operacional observado.

### Artefatos da Fase 3

- `playwright.config.ts`
- `tests/golden-path-production-data.ts`
- `docs/audit/PHASE-3-ENVIRONMENT-TEST-DATA.md`

## FASE 4 — GOLDEN PATH E2E

**🔴 EXECUTADA PARCIALMENTE — BLOQUEADA.**

### 🟢 Evidência obtida em 2026-09-09

- `GET https://www.defesai.shop/api/health` respondeu HTTP 200 após o deployment `dpl_DVXqj5PYNjwHGzq4myEQuT9ykusN`.
- O deployment `dpl_DVXqj5PYNjwHGzq4myEQuT9ykusN`, commit `8aa42558986071828d75c53dd5f8ac40e13d7d0a`, terminou `READY` em produção.
- O CSP de produção referencia o Supabase canônico `sgomwklorpzdwdubtmgg.supabase.co`.
- `GET /novo-caso` respondeu HTTP 200.
- O banco canônico mantém 9 `cases`, 0 `payment_orders` e 0 `documents`; não há evidência de uma cadeia completa caso → análise → cobrança → pagamento → documento.
- O workflow `Golden Path — Production` foi efetivamente executado contra produção no run `34372940368`.
- As etapas de infraestrutura, secrets, instalação do Playwright e verificação do alvo passaram.
- O teste falhou concretamente no login porque `getByLabel(/E-mail do Condutor ou Administrador/i)` não correspondia ao markup real.
- O snapshot real de produção comprovou que o input é exposto como `input[type="email"]` e `input[type="password"]`.
- O harness foi corrigido em `be582e52589588fe62a4a1c1c69ad55da692b565`.
- O PR de consolidação foi o `#13`, posteriormente incorporado ao `main`.

### 🔴 Resultado atual

A primeira execução real não chegou à criação do caso e, portanto, não produziu `payment_order`, pagamento ou documento. O bloqueador atual é a necessidade de **executar novamente o workflow com o harness corrigido**.

A integração GitHub disponível nesta sessão não expõe uma operação de `workflow_dispatch`. A alteração do artefato de auditoria foi preparada no `main` para servir de evento controlado de push, mas a conexão utilizada para escrever no repositório não fornece garantia de disparo de Actions após esse tipo de escrita. Portanto, não foi declarado sucesso nem simulada uma segunda execução.

### Critério de saída

A Fase 4 somente poderá ser aprovada após uma execução real que produza e reconcilie:

- `cases.id`
- identidade/versionamento da análise
- `payment_orders.id` / `payment_attempts.id`
- confirmação real do PIX
- `documents.id`
- `storage_path` e/ou `document_url` válidos

Artefato:
- `docs/audit/PHASE-4-GOLDEN-PATH-E2E.md`

## FASES 5–8

Permanecem `🟠 PENDING`.

## REGRA DE PARADA

**Fase 4 permanece BLOQUEADA. Não avançar para a Fase 5 até o Golden Path real ser aprovado.**
