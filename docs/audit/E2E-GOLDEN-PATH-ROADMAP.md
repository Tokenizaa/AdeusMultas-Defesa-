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
- **Fase 4:** 🔴 executada parcialmente e bloqueada; deployment de produção recuperado e ambiente verificado, mas não existe evidência de uma execução E2E completa aprovada.

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

### 🔴 BLOQUEADORES PARA O GOLDEN PATH

1. Os P0 estruturais identificados na Fase 2 continuam impedindo a declaração de Golden Path aprovado: sincronização real da cobrança, upload/persistência documental e webhook idempotente/recovery.
2. Não há evidência versionada de uma conta E2E autenticável disponível para execução; as credenciais permanecem externas ao repositório.

### 🟡 RISCOS

- Fixtures históricos em `tests/e2e-fixtures.ts` contêm dados sintéticos fixos e não devem ser usados como identidade do Golden Path de produção.
- O teste deve capturar IDs reais de `case`, `analysis`, `payment` e `document`, sem inserir valores manualmente.

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
- O bloqueador de build da rodada anterior foi corrigido: `package.json` agora declara `ioredis@^6.0.0`, alinhado ao `bun.lock` e à versão estável publicada da linha 6.

### 🔴 Resultado

A execução E2E completa **não foi comprovada**. O workflow é `workflow_dispatch`/`workflow_call` e a integração disponível nesta sessão não oferece disparo manual de workflow. O ambiente de execução desta sessão não possui um executor Playwright de produção utilizável nem as credenciais externas necessárias para autenticação.

Não foram inseridos pagamentos, documentos ou estados artificiais no banco para transformar ausência de evidência em falso positivo.

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

**Fase 4 encerrada nesta rodada como BLOQUEADA. Não avançar automaticamente para a Fase 5.**
