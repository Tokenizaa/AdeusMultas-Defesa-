# Checkpoint de Certificação E2E — DefesAi

**Status:** checkpoint pré-go-live  
**Especificação operacional:** `docs/testing/E2E-CERTIFICACAO-CANONICA.md` (única fonte de verdade para os 70 cenários)  
**Governança geral:** `AGENTS.md` (branch `main`, sem branches/PRs, `tsc --noEmit` limpo)  
**SHA de referência:** `f6343db`  
**Data:** 22/10/2026

---

## 1. Estado Atual da Suíte E2E

### 1.1 Cobertura da matriz de 70 cenários

| Serviço canônico | Cenários mapeados (01–10) | Arquivo spec | Status |
|---|---|---|---|
| `defesa_previa` | 10 | `tests/e2e-reconstruction/defesa_previa.spec.ts` | Implementado (parcial) |
| `recurso_jari` | 10 | `tests/e2e-reconstruction/recurso_jari.spec.ts` | Implementado (parcial) |
| `recurso_cetran` | 10 | `tests/e2e-reconstruction/recurso_cetran.spec.ts` | Implementado (parcial) |
| `suspensao` | 10 | `tests/e2e-reconstruction/suspensao.spec.ts` | Implementado (parcial) |
| `cassacao` | 10 | `tests/e2e-reconstruction/cassacao.spec.ts` | Implementado (parcial) |
| `indicacao_condutor` | 10 | `tests/e2e-reconstruction/indicacao_condutor.spec.ts` | Implementado (parcial) |
| `conversao_advertencia` | 10 | `tests/e2e-reconstruction/conversao_advertencia.spec.ts` | Implementado (parcial) |
| **Total** | **70/70** | — | **Mapeado, não executado** |

**Observação:** todos os 70 cenários têm correspondência nos specs existentes, mas a cobertura é classificada como **parcial** porque:

1. Não há verificação direta de banco Supabase (apenas validações via HTTP/API)
2. `E2E_TEST_RUN_ID` não é usado nos asserts/evidências dos specs
3. Nenhum cenário foi executado (não há evidências PASS/FAIL/BLOCKED)
4. Não há confirmação explícita de projeto Supabase de teste

### 1.2 Spec fora do escopo canônico

| Arquivo | Problema | Decisão |
|---|---|---|
| `tests/e2e-reconstruction/admin-pricing-edit.spec.ts` | Dados hardcoded reais (`olfnetto@gmail.com`, `Netto@964212$`), hard sleeps (`page.waitForTimeout`), não usa `E2E_TEST_RUN_ID`, não verifica banco, não pertence aos 7 serviços canônicos | **Não commitar** (permanece untracked). Tratar como fora do escopo canônico. |

### 1.3 Configuração do runner

- `playwright.config.ts`: `testDir: ./tests/e2e-reconstruction`, `workers: 1`, `fullyParallel: false`, `retries: 0`, `forbidOnly: true`
- `PLAYWRIGHT_BASE_URL`: obrigatório (localhost não é fallback)
- `E2E_ALLOW_PERSISTENT_WRITES=true`: obrigatório para criar casos persistentes (bloqueia escrita se ausente)
- `E2E_TEST_RUN_ID`: usado em `support.ts` para gerar `runId` e dados sintéticos via `synthetic()`
- Evidências: `artifacts/e2e-results` (output), `artifacts/e2e-report` (HTML report)

---

## 2. Ordem de Trabalho (Seção 8 da Especificação Canônica)

### Passo 1 — Consolidar e validar a matriz de 70 cenários contra o código (PENDENTE)

Confrontar cada um dos 70 cenários com o código atual para confirmar que os endpoints existem e se comportam conforme esperado:

- `POST /api/cases/anonymous` (criação de caso)
- `GET/POST /api/cases/anonymous/{id}/recover` (recuperação por claim token)
- `POST /api/payments/pix/create` (pagamento sandbox — retorna 401 sem token)
- Fluxo de onboarding/wizard (`/novo-caso`, seletores `#service-option-`, `#stage-option-`, `#category-card-`)

**Critério:** se um comportamento não existir ou o contrato for contraditório, registrar bloqueio; não inventar endpoint nem expectativa.

### Passo 2 — Resolver contradições documentais ou registrar bloqueios (PENDENTE)

Verificar se `situationId`, `stageId`, `categoryId` usados nos specs correspondem aos seletores reais da UI. Registrar divergências como bloqueios, não corrigir produto automaticamente.

### Passo 3 — Implementar suíte e runner canônicos únicos (PENDENTE)

Manter a estrutura atual (`tests/e2e-reconstruction/` com `playwright.config.ts`). Não copiar infraestrutura antiga. Isolar `admin-pricing-edit.spec.ts` do escopo canônico.

### Passo 4 — Validar configuração e descoberta dos 70 cenários sem escritas persistentes (PENDENTE)

Rodar com `E2E_ALLOW_PERSISTENT_WRITES` não definido (ou diferente de `true`) para confirmar que a suíte é descoberta e que cenários que exigem escrita são bloqueados de forma controlada.

### Passo 5 — Executar primeiro um cenário autorizado e revisar evidências (PENDENTE)

Validar um cenário por serviço e conferir trace/screenshot/video em `artifacts/e2e-results`.

### Passo 6 — Executar os dez cenários de cada serviço sequencialmente (PENDENTE)

Execução sequencial por serviço (compatível com `workers: 1` e `fullyParallel: false`).

### Passo 7 — Publicar relatório consolidado (PENDENTE)

70 cenários esperados, executados, aprovados, reprovados e bloqueados. Identificar SHA exato testado e ambiente usado. `BLOCKED` não conta como `PASS`.

---

## 3. Critérios de Conclusão da Certificação (Seção 7)

A bateria só pode ser declarada concluída quando:

- [ ] Os 70 cenários oficiais existem e foram descobertos pelo runner
- [ ] Cada serviço possui exatamente dez cenários únicos
- [ ] Todos os cenários executados têm resultado e evidência rastreáveis
- [ ] Não há `FAIL` ou `BLOCKED` ocultado, ignorado ou convertido em sucesso
- [ ] Os gates de integridade, segurança e pagamento aplicáveis passaram
- [ ] Resíduos e efeitos persistentes foram relatados; nenhuma limpeza destrutiva foi executada automaticamente
- [ ] O relatório identifica o SHA exato testado e o ambiente usado

---

## 4. Requisitos Obrigatórios de Execução (Seção 5)

- [ ] Dados sintéticos identificados por `E2E_TEST_RUN_ID` novo por execução
- [ ] Até cinco identidades sintéticas reutilizáveis para fluxo autenticado
- [ ] Um caso separado por cenário e execução; nunca reutilizar caso para dez cenários
- [ ] Não criar usuário/caso durante descoberta ou listagem dos testes
- [ ] Não apagar automaticamente usuários, casos, pagamentos, evidências ou dados persistidos
- [ ] URL e projeto Supabase de teste explicitamente configurados; interromper se o alvo não puder ser confirmado
- [ ] Bloquear pagamentos reais por padrão; sandbox/test adapter só conforme contrato real e configuração segura
- [ ] Executar sequencialmente por serviço

---

## 5. Checklist de Checkpoint Pré-Go-Live

| Item | Status | Observação |
|---|---|---|
| `tsc --noEmit` zero erros | ✅ | Validado em `f6343db` |
| 179 testes unitários passando | ✅ | Conforme relatório anterior |
| 70 cenários E2E mapeados | ✅ | Todos nos specs existentes |
| 70 cenários E2E executados com evidência | ❌ | Pendente (Passo 5-7) |
| Relatórios de auditoria commitados | ✅ | `f6343db` (7 relatórios) |
| Correções P1 (A-06, A-08, M-1) aplicadas | ✅ | P1.5, P1.6, P1.14 em `f6343db` |
| Runbooks deploy + incidente criados | ✅ | `docs/deploy-runbook.md`, `docs/incident-runbook.md` |
| `.wrangler/` no `.gitignore` | ✅ | Adicionado em `f6343db` |
| Scripts debug .mjs descartados | ✅ | Removidos em `f6343db` |

---

## 6. Bloqueios Identificados

| ID | Descrição | Impacto | Resolução necessária |
|---|---|---|---|
| E2E-B-01 | Nenhum dos 70 cenários foi executado (sem evidência PASS/FAIL/BLOCKED) | Certificação não pode ser declarada | Executar Passos 4-7 da seção 8 |
| E2E-B-02 | Falta validação direta de banco Supabase nos specs | Cobertura parcial vs especificação | Adicionar verificações de persistência real no banco |
| E2E-B-03 | `E2E_TEST_RUN_ID` não usado nos asserts/evidências dos specs | Falta rastreabilidade por execução | Incluir `E2E_TEST_RUN_ID` nos specs |
| E2E-B-04 | `admin-pricing-edit.spec.ts` com dados hardcoded reais | Fora do escopo canônico, risco de vazamento | Manter untracked; não commitar |

---

## 7. Próxima Ação Recomendada

Executar o **Passo 4** da seção 8: validar configuração e descoberta dos 70 cenários sem escritas persistentes, definindo `PLAYWRIGHT_BASE_URL` para um ambiente de teste e `E2E_ALLOW_PERSISTENT_WRITES` diferente de `true`.

```
PLAYWRIGHT_BASE_URL=https://<ambiente-de-teste> npx playwright test --config playwright.config.ts --list
```

Isso confirma que todos os 70 cenários são descobertos pelo runner sem gravar dados persistentes.

---

*Este checkpoint deve ser revisado e atualizado após cada execução da bateria E2E. Não substituem `docs/testing/E2E-CERTIFICACAO-CANONICA.md` nem `AGENTS.md`.*
