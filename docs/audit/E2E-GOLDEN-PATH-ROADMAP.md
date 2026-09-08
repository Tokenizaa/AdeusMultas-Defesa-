# E2E GOLDEN PATH — ROADMAP DE AUDITORIA E EXECUÇÃO

**Produto:** Adeus Multa  
**Objetivo:** provar uma jornada vertical real, coerente e auditável, do primeiro acesso ao documento final persistido.

## Regra operacional

Uma fase por vez. Cada fase produz evidência, atualiza este documento, faz commit e para. A próxima fase só é liberada após revisão dos auditores.

## Estado atual

- **Fase 0:** 🟡 parcial/histórica; evidência original não recuperável.
- **Fase 1:** 🔴 concluída com bloqueadores.
- **Fase 2:** 🟡 executada parcialmente; bloqueadores estruturais corrigidos, Golden Path ainda bloqueado.
- **Fase 3:** 🟡 executada parcialmente; ambiente Vercel/produção verificável, harness preparado, mas execução E2E real ainda bloqueada por configuração de ambiente e P0 remanescentes da Fase 2.
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

**🟡 EXECUTADA PARCIALMENTE — pronta para preparação, mas não para execução do Golden Path.**

### 🟢 CONFIRMADO

- Implantação de produção Vercel disponível e `READY`.
- `GET /api/health` em `https://www.defesai.shop` respondeu HTTP 200.
- Playwright agora exige explicitamente `PLAYWRIGHT_BASE_URL` em HTTPS e não inicia servidor local.
- Harness de dados do Golden Path exige `PLAYWRIGHT_BASE_URL`, `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD` e aceita `E2E_RUN_ID` para isolamento lógico.
- Nenhuma credencial foi adicionada ao repositório.

### 🔴 BLOQUEADORES

1. A resposta de produção observada em `/api/health` referencia o Supabase `llmxnpgjpxcvyrqjkfwb`, enquanto a base canônica auditada das Fases 1–2 é `sgomwklorpzdwdubtmgg`. A execução E2E não pode usar essa produção como prova de lineage até a configuração ser reconciliada.
2. Os quatro P0 da Fase 2 continuam impedindo a declaração de Golden Path.
3. Não há evidência versionada de uma conta E2E autenticável disponível para execução; as credenciais são deliberadamente externas ao repositório.

### 🟡 RISCOS

- Fixtures históricos em `tests/e2e-fixtures.ts` contêm dados sintéticos fixos e não devem ser usados como identidade do Golden Path de produção.
- O teste deve capturar IDs reais de `case`, `analysis`, `payment` e `document`, sem inserir valores manualmente.

### 🟠 PENDÊNCIAS

- Configurar a Vercel para o Supabase canônico `sgomwklorpzdwdubtmgg`.
- Disponibilizar conta E2E dedicada por variáveis seguras da execução.
- Concluir P0 da Fase 2.
- Na Fase 4, executar exclusivamente contra a implantação Vercel/produção.

### Artefatos da Fase 3

- `playwright.config.ts`
- `tests/golden-path-production-data.ts`
- `docs/audit/PHASE-3-ENVIRONMENT-TEST-DATA.md`

## FASES 4–8

Permanecem `🟠 PENDING`.

## REGRA DE PARADA

**Fase 3 encerrada neste ponto. Não executar a Fase 4 automaticamente.**
