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

# RECONCILIAÇÃO PÓS-FASE 0 / PRÉ-FASE 1

**Data da reconciliação:** 2026-09-08  
**Referência:** `main` em `d8e349b9ebd18212a71136d66bc17d22fdc8ff29`.

Esta seção corrige a defasagem entre a fotografia histórica da Fase 0 e o código atualmente auditável. A Fase 0 original não teve seu SHA `f29adc0` recuperado de forma independente; portanto, seu relatório continua sendo histórico. O mapa e o roadmap agora passam a considerar o estado atual de `main`.

### Mudanças posteriores à fotografia original que entram na reconciliação

| SHA | Mudança | Impacto na auditoria |
|---|---|---|
| `85b8686c7eb89557733f8b2c28890a19f12cd6e1` | hardening de produção do onboarding | reduz riscos de execução sem contratos explícitos |
| `e42f632aec5e00c210d8d58e7886a409f45e3bc3` | `/api/auth/me` canônico | contrato de autenticação atual passa a ser verificável por rota canônica |
| `f51d8b42ac7650e66c66ccf8c4428dba5789a44a` | montagem das rotas de onboarding | confirma fronteira HTTP atualmente usada pelo onboarding |
| `c162e26d10e08aeebe9bce3d37c82a498a2ac52f` | PIX/document lifecycle | adiciona o contrato atual de pagamento e geração |
| `96021cb7562067afc65fe5483077aaaa04c7fec9` | confirmação de pagamento e geração | altera a análise do pós-pagamento; precisa de prova E2E |
| `21929307824cb377ab20ee97061466e63131d7ed` | ações canônicas de pagamento/geração | atualiza endpoints consumidos pelo onboarding |
| `681b012078f709c67b70cece9e4a66d92eafef4c` | caminhos montados de pagamento | corrige a referência HTTP do fluxo atual |
| `3770ed04afbecb46c9b9f9a734de4e37ffc6c9a1` | alias `/onboarding` | entrada canônica adicional do produto |
| `03f1f4ce3e4ecaf2c1ee0c6b55b628210c1c0f62` | PagBank configurado permitido em produção | o antigo bloqueio "PagBank cidadão" precisa ser reavaliado, não repetido como fato |
| `fbc83e3c7bf10da34678bde6a738dfac5f03f472` | produção derivada do ambiente Vercel | reduz dependência de configuração manual de modo |
| `d8e349b9ebd18212a71136d66bc17d22fdc8ff29` | promoção do onboarding V2 para canônico e remoção da árvore `onboarding-v2` | invalida o mapa antigo de dois frontends concorrentes; o frontend atual é único |

### Decisões de reconciliação

1. **Onboarding frontend:** considerar `src/onboarding/` como implementação canônica atual. Não manter a descrição anterior de dois componentes de onboarding concorrentes.
2. **Backend:** ainda existem endpoints com nomenclatura `/api/onboarding-v2/*`. Isso é uma questão de nomenclatura/compatibilidade, não evidência de dois frontends; deve ser auditado na Fase 1 antes de eventual renomeação.
3. **Pagamento:** o antigo achado "checkout cidadão bloqueado por admin" está desatualizado como descrição do contrato atual; `prodAuth` agora documenta JWT de qualquer role para checkout normal. Isso ainda precisa de prova em produção.
4. **Pagamento → documento:** continua bloqueado para fins de E2E porque o webhook mantém pagamento confirmado quando a geração falha. Isso é uma política fail-closed, mas exige contrato de recuperação/UX.
5. **Análise:** o onboarding atual chama uma operação backend `startAnalysis`; o mapa antigo que tratava o frontend como segunda autoridade deve ser revalidado contra o código atual antes de concluir dualidade.
6. **Claim token:** a implementação atual persiste `defesai_onboarding_claim_token` em `sessionStorage`, mas a origem/entropia emitida pelo backend ainda precisa ser comprovada.
7. **Documento:** não há ainda prova de um `document_id` persistido como entidade separada; o estado atual retorna a defesa por caso. A relação caso → defesa → storage deve ser auditada.

### Regra de evidência

Nenhuma das mudanças acima transforma o Golden Path em PASS. Código, build ou endpoint acessível não substituem a prova vertical em produção. A Fase 1 deve auditar contratos e lineage do estado atual antes de liberar correções adicionais ou o Playwright Golden Path.

---

# FASE 0 — MAPEAMENTO FORENSE

**Objetivo:** reconstruir o fluxo real sem alterar produto.

Mapear rotas, autenticação, onboarding, estado, selectors, APIs, payloads, persistência, análise, pagamento, geração, storage, mocks/fallbacks e testes existentes.

**Regra:** read-only.

**Artefato:** `docs/audit/E2E-CONTRACT-MAP.md`

**Status:** 🟡 EXECUTADA PELO AGENTE / EVIDÊNCIA ORIGINAL NÃO RECUPERÁVEL

O agente reportou `f29adc0`, mas esse SHA não foi resolvido na referência GitHub auditada. As contagens originais não são consideradas evidência independente.

**Auditoria independente:** `docs/audit/PHASE-0-INDEPENDENT-AUDIT.md`

**Reconciliação:** o artefato `E2E-CONTRACT-MAP.md` foi atualizado para refletir o `main` atual e separar achados históricos de fatos ainda verificáveis.

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

Acompanhar obrigatoriamente `user_id`, `case_id`, `analysis_id`, `payment_id` e `document_id` (ou comprovar que algum deles não existe como entidade independente e registrar a substituição canônica).

Investigar ownership, UUID mapping, payment reference, fonte de verdade, webhook, idempotência, geração pós-pagamento, claim token e recuperação de documento.

**Regra:** diagnóstico primeiro; não corrigir produto.

**Status:** 🔵 PRÓXIMA FASE AUTORIZADA — ainda não executada

**Escopo mínimo da Fase 1:**

- confrontar `src/onboarding/` com os endpoints backend atualmente montados;
- reconstruir a linhagem desde `createDraft` até `generateDocument`;
- verificar a persistência em Supabase e comportamento após cold start;
- confrontar `analysis`/`recommendedArguments` com a entrada do `DocumentAssemblyEngine`;
- confrontar `payment_orders`, `cases.is_paid`, webhook e referência do gateway;
- verificar origem e entropia do claim token;
- verificar se geração manual e automática têm a mesma autoridade e integridade;
- identificar qualquer mock, fallback ou estado sintético que possa produzir falso PASS.

---

# FASE 2 — CORREÇÃO DOS BLOQUEADORES

**Objetivo:** corrigir defeitos comprovados sem mascará-los nos testes.

### Correções já aplicadas

#### 🟢 Persistência de casos

`src/server/db/case-repository.ts` agora exige persistência real por padrão; fallback em memória depende explicitamente de `ALLOW_IN_MEMORY_CASE_PERSISTENCE=true`.

Commit: `8a1a1cf2b0559e53c7a3e35ca0de86cbc41d30a9`

#### 🟢 Identidade canônica do usuário

Casos autenticados usam UUID canônico do JWT para criação/ownership/claim.

Commit: `f5d70687f545411d06ac793dc12a7ad6738ea2f3`

#### 🟢 ID de caso não previsível

Criação passou para `crypto.randomUUID()`.

Commit: `f5d70687f545411d06ac793dc12a7ad6738ea2f3`

### 🟡 Itens que não devem ser repetidos como bloqueadores sem revalidação

- gate administrativo do PagBank: o código atual indica JWT de qualquer role para checkout normal; falta prova E2E de produção;
- dualidade do frontend de onboarding: removida pela promoção para `src/onboarding/` em `d8e349b9`;
- nomes de endpoints `/api/onboarding-v2/*`: ainda existem no backend e precisam de decisão na Fase 1.

### 🔴 Bloqueadores de prova ainda relevantes

- pagamento real e webhook real ainda não comprovados;
- pagamento confirmado sem documento quando geração falha exige mecanismo de recuperação e prova;
- claim token ainda sem auditoria suficiente de origem/entropia;
- consistência/idempotência entre webhook e `payment_orders` ainda não comprovada;
- lineage `analysis → recommendedArguments → defense/document` ainda não comprovada de ponta a ponta;
- storage/URL final do documento ainda não comprovados como persistência real;
- qualquer artefato de teste exposto em produção ainda precisa ser auditado.

**Status:** 🟡 PARCIAL — correções emergenciais aplicadas; aguarda Fase 1.

---

# FASE 3 — PREPARAÇÃO DO AMBIENTE E TEST DATA

Preparar servidor, usuário real de teste, dados exclusivos, isolamento, acesso ao banco, captura de requests/responses, tracing e selectors estáveis.

Não versionar credenciais.

**Regra adicional:** toda validação de aceitação E2E deve ocorrer na implantação da Vercel; não usar servidor local como evidência de produção.

**Status:** 🟠 PENDING

---

# FASE 4 — GOLDEN PATH PLAYWRIGHT

Executar uma única jornada vertical real:

`primeiro acesso → auth → serviço → dados → case → análise → pagamento → autorização → geração → documento`

O teste só pode ser considerado PASS quando os IDs e dados forem preservados de ponta a ponta e a persistência for confirmada fora do estado local do navegador.

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

# ESTADO ATUAL RECONCILIADO

| Fase | Status | Evidência/Commit | Auditoria |
|---|---|---|---|
| Fase 0 — Mapeamento | 🟡 Executada / evidência original não recuperável | `f29adc0` reportado; mapa reconciliado agora | 🟡 Parcial |
| Fase 1 — Contratos/Lineage | 🔵 Próxima fase autorizada | — | 🟠 Pendente |
| Fase 2 — Correções | 🟡 Parcial / emergencial + correções posteriores | `8a1a1cf`, `f5d7068`, demais commits listados na reconciliação | 🟠 Pendente |
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
