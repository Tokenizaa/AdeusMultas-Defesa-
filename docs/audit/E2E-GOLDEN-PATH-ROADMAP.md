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
- **Fase 4:** 🟠 PENDING.

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

**🟠 PENDING — próxima fase.**

Objetivo: executar a jornada completa exclusivamente contra produção Vercel, capturando evidências reais de criação do caso, análise, cobrança/pagamento, geração e persistência do documento, sem mocks, localhost ou estados sintéticos.

A Fase 4 só pode ser declarada concluída se todos os IDs e transições relevantes forem observados e reconciliados com o Supabase canônico.

## FASES 5–8

Permanecem `🟠 PENDING`.

## REGRA DE PARADA

**Fase 3 encerrada. A Fase 4 é a próxima fase autorizada e não deve avançar automaticamente para a Fase 5.**
