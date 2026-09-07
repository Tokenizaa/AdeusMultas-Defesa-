# E2E GOLDEN PATH — ROADMAP DE AUDITORIA E EXECUÇÃO

**Produto:** Adeus Multa  
**Objetivo:** provar uma jornada vertical real, coerente e auditável, do primeiro acesso ao documento final persistido.

## Regra operacional

Uma fase por vez. Cada fase produz evidência, atualiza este documento, faz commit e para. A próxima fase só é liberada após revisão dos auditores.

## Fluxo oficial

```text
FASE 0 — MAPEAMENTO FORENSE
        ↓
FASE 1 — AUDITORIA DE CONTRATOS E DATA LINEAGE
        ↓
FASE 2 — CORREÇÃO DOS BLOQUEADORES
        ↓
FASE 3 — PREPARAÇÃO DO AMBIENTE E TEST DATA
        ↓
FASE 4 — GOLDEN PATH PLAYWRIGHT
        ↓
FASE 5 — VALIDAÇÃO DE PERSISTÊNCIA E DOCUMENTO
        ↓
FASE 6 — HARDENING / REGRESSÃO
        ↓
FASE 7 — MATRIZ DE SERVIÇOS E VARIAÇÕES
        ↓
FASE 8 — GATE FINAL E HANDOFF
```

---

# FASE 0 — MAPEAMENTO FORENSE

**Objetivo:** reconstruir o fluxo real sem alterar produto.

Mapear rotas, autenticação, onboarding, estado, selectors, APIs, payloads, persistência, análise, pagamento, geração, storage, mocks/fallbacks e testes existentes.

**Regra:** read-only.

**Artefato esperado:** `docs/audit/E2E-CONTRACT-MAP.md`

**Status:** 🟡 EXECUTADA PELO AGENTE / EVIDÊNCIA ORIGINAL NÃO RECUPERÁVEL

O agente reportou `f29adc0`, mas esse SHA não está resolvível na referência GitHub auditada. Portanto, as contagens informadas pelo agente não são consideradas evidência independente.

**Auditoria independente:** `docs/audit/PHASE-0-INDEPENDENT-AUDIT.md`

---

# FASE 1 — AUDITORIA DE CONTRATOS E DATA LINEAGE

**Objetivo:** confrontar o fluxo real sem corrigir ainda.

Validar:

```text
USER
 ↓
CASE
 ↓
SUPABASE / COLD START
 ↓
ANALYSIS
 ↓
PAYMENT
 ↓
WEBHOOK
 ↓
AUTHORIZATION
 ↓
DEFENSE DRAFT
 ↓
DOCUMENT
 ↓
STORAGE
```

Acompanhar obrigatoriamente `user_id`, `case_id`, `analysis_id`, `payment_id` e `document_id`.

Investigar ownership, UUID mapping, payment reference, fonte de verdade, webhook e geração pós-pagamento.

**Regra:** diagnóstico primeiro; não corrigir produto.

**Status:** 🟠 PENDING

---

# FASE 2 — CORREÇÃO DOS BLOQUEADORES

**Objetivo:** corrigir defeitos comprovados sem mascará-los nos testes.

### Correções emergenciais já aplicadas após a auditoria independente

#### 🟢 Persistência de casos

`src/server/db/case-repository.ts`

O fallback em memória deixou de ser implícito. Agora somente ocorre quando:

`ALLOW_IN_MEMORY_CASE_PERSISTENCE=true`

Sem Supabase e sem essa flag, a operação falha explicitamente. Falha no carregamento do Supabase também não é convertida silenciosamente em lista vazia.

Commit:

`8a1a1cf2b0559e53c7a3e35ca0de86cbc41d30a9`

#### 🟢 Identidade canônica do usuário

`src/server/routes/cases.ts`

Casos autenticados agora exigem `user.id` UUID canônico. Ownership não usa mais email como segunda identidade. Criação e claim gravam o UUID autenticado como `userId`.

#### 🟢 IDs de caso não previsíveis

A criação de caso passou de combinação `Date.now() + Math.random()` para `crypto.randomUUID()`.

Commit:

`f5d70687f545411d06ac793dc12a7ad6738ea2f3`

### 🔴 Bloqueadores ainda não corrigidos

- PagBank com gate administrativo precisa ser resolvido como contrato de produto;
- geração automática pós-pagamento ainda pode deixar pagamento confirmado sem documento;
- claim token ainda precisa ser auditado e, se necessário, substituído por token criptograficamente aleatório;
- webhook/persistência de `payment_orders` ainda precisa de contrato transacional/idempotente comprovado;
- análise dual ainda precisa ser confrontada;
- TestFillButton e demais riscos de exposição ainda precisam ser confirmados.

**Importante:** as correções emergenciais acima não equivalem à conclusão da Fase 1. Elas foram aplicadas porque eram problemas suficientemente claros para correção segura.

**Status:** 🟡 PARCIAL — correções emergenciais aplicadas; diagnóstico completo ainda pendente.

---

# FASE 3 — PREPARAÇÃO DO AMBIENTE E TEST DATA

Preparar servidor, usuário real de teste, dados exclusivos, isolamento, acesso ao banco, captura de requests/responses, tracing e selectors estáveis.

Não versionar credenciais.

**Status:** 🟠 PENDING

---

# FASE 4 — GOLDEN PATH PLAYWRIGHT

Executar uma única jornada vertical real:

`primeiro acesso → auth → serviço → dados → case → análise → pagamento → autorização → geração → documento`

O teste só pode ser considerado PASS quando os IDs e dados forem preservados de ponta a ponta.

**Status:** 🟠 PENDING

---

# FASE 5 — VALIDAÇÃO DE PERSISTÊNCIA E DOCUMENTO

Provar no banco/storage que o caso, análise, pagamento e documento pertencem ao mesmo usuário/caso e que o conteúdo final corresponde aos dados de entrada.

**Status:** 🟠 PENDING

---

# FASE 6 — HARDENING / REGRESSÃO

Reexecutar o Golden Path em estado limpo, eliminar retries artificiais, validar isolamento e estabilidade.

**Status:** 🟠 PENDING

---

# FASE 7 — MATRIZ DE SERVIÇOS E VARIAÇÕES

Expandir somente após o Golden Path base estar comprovado, respeitando a cobertura real de serviços, procedimentos, UFs e órgãos.

Classificação:

`SUPPORTED / PARTIAL / UNSUPPORTED / NOT_TESTED`

**Status:** 🟠 PENDING

---

# FASE 8 — GATE FINAL E HANDOFF

Consolidar auditoria, correções, testes, evidências, lineage, matriz e limitações.

Golden Path final só pode ser 🟢 PASS se houver evidência de:

```text
🟢 usuário autenticado
🟢 caso real criado
🟢 caso persistido
🟢 dados preservados
🟢 análise ligada ao caso
🟢 pagamento ligado ao caso
🟢 autorização real
🟢 documento real gerado
🟢 documento ligado ao mesmo caso/usuário
🟢 conteúdo coerente
🟢 storage persistido
🟢 URL final acessível
🟢 ausência de fallback/fake
```

**Status:** 🟠 PENDING

---

# PROTOCOLO VISUAL

- 🟢 `PASS` — comprovado;
- 🔴 `FAIL` — defeito concreto;
- 🟡 `WARNING` — risco;
- 🟠 `PENDING` — não comprovado;
- ⚫ `BLOCKED` — dependência externa;
- 🔵 `INFO` — descoberta.

Nunca usar PASS apenas porque build, TypeScript ou teste isolado passou.

---

# ESTADO ATUAL

| Fase | Status | Evidência/Commit | Auditoria |
|---|---|---|---|
| Fase 0 — Mapeamento | 🟡 Executada / evidência original não recuperável | `f29adc0` reportado | 🟡 Parcial |
| Fase 1 — Contratos/Lineage | 🟠 PENDING | — | 🟠 PENDING |
| Fase 2 — Correções | 🟡 Parcial / emergencial | `8a1a1cf`, `f5d7068` | 🟠 PENDING |
| Fase 3 — Ambiente | 🟠 PENDING | — | 🟠 PENDING |
| Fase 4 — Golden Path | 🟠 PENDING | — | 🟠 PENDING |
| Fase 5 — Persistência/Documento | 🟠 PENDING | — | 🟠 PENDING |
| Fase 6 — Hardening | 🟠 PENDING | — | 🟠 PENDING |
| Fase 7 — Matriz | 🟠 PENDING | — | 🟠 PENDING |
| Fase 8 — Gate Final | 🟠 PENDING | — | 🟠 PENDING |

---

# REGRA PARA O AGENTE LOCAL

Antes de qualquer execução, consultar este documento.

Executar somente a fase delegada.

Ao terminar uma fase:

1. atualizar este roadmap;
2. produzir os artefatos;
3. validar o resultado;
4. fazer commit;
5. informar SHA;
6. parar.

O agente não deve avançar automaticamente para a próxima fase.

**Este arquivo é a referência operacional compartilhada entre agente local e auditores.**
