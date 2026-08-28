# ADR-011: Remoção dos componentes legacy/mortos do módulo de Prospecção B2B (frontend)

- **Status**: Accepted
- **Data**: 2026-08-27
- **Autor**: @documentacao (Context Manager) — decisão validada por @frontend (evidências de grep) e @supervisor
- **Contexto**: Componentes mortos do módulo de Prospecção B2B exportados por barrel sem nenhum importador em runtime

---

## Problema

O módulo de Prospecção B2B (`/admin/marketing/prospecting/*`) possui **dois conjuntos distintos de componentes** que coexistem sem integração:

### Conjunto VIVO (runtime real)
- `src/components/marketing/components/ProspectingPage.tsx` — importado **diretamente** por `src/App.tsx` (linha 31: `import { ProspectingPage } from './components/marketing/components/ProspectingPage'`; linha 250: `{currentPath.startsWith('/admin/marketing/prospecting') && <ProspectingPage />}`). É o único componente roteado do diretório.
- `src/components/marketing/prospecting/*` — as **tabs** (`ProspectingLeadsTab.tsx`, `ProspectingCollectionTab.tsx`, `ProspectingNav.tsx`, etc.) importadas por `ProspectingPage.tsx` via `../prospecting` (relativo a `components/`). É onde foram feitas as alterações recentes (badge `advogado_transito`, filtro de fonte dinâmico, drawer).

### Conjunto MORTO (sem nenhum importador em runtime)
- `src/components/marketing/components/ProspectingLeadsPage.tsx`
- `src/components/marketing/components/ProspectingCollectionPage.tsx`
- Barrel `src/components/marketing/components/index.ts` — exporta ambos (linhas 3 e 5), além de `ProspectingLayout`, `ProspectingCampaignsPage`, `ProspectingAutomationPage`, `ProspectingPage`.

### Evidências verificadas (2026-08-27, grep em `src/`)

1. **Zero imports em runtime** dos dois componentes: `grep -rn "ProspectingLeadsPage\|ProspectingCollectionPage" src/` → única ocorrência é o barrel `index.ts` (que **não é importado por ninguém**: `grep -rn "marketing/components'" src/` → 0 matches; `App.tsx` importa `ProspectingPage` pelo caminho direto, não pelo barrel).
2. **Rota viva usa as tabs, não as páginas**: `ProspectingPage.tsx` monta `ProspectingLeadsTab`, `ProspectingCollectionTab` etc. vindas de `../prospecting` — não `ProspectingLeadsPage`/`ProspectingCollectionPage`.
3. **O evento `marketing:leads:invalidate` é cíclico entre os mortos**: dispatch em `ProspectingCollectionPage.tsx` (linha 98) e listener em `ProspectingLeadsPage.tsx` (linhas 105-106) — não se conecta a nenhuma tab viva. O diff não-commitado nos dois arquivos (~16 linhas adicionadas) é work-in-progress interno ao cluster morto, sem valor funcional em runtime.
4. **Histórico Git**: ambos os arquivos foram tocados por **um único commit** (`554d89f feat: implement autonomous B2B prospecting module`), além do diff não-commitado atual da working tree. Nada a preservar além do que o git já registra.
5. **Cluster adjacente também órfão (observação)**: `ProspectingCampaignsPage.tsx` e `ProspectingAutomationPage.tsx` só aparecem no barrel; `ProspectingLayout.tsx` só é consumido por arquivos mortos (`ProspectingAutomationPage` + `ProspectingCollectionPage`). Fora do escopo desta ADR — ver "Follow-up".

---

## Decisão

**DELETAR** (não arquivar) os dois componentes mortos e **deletar o barrel inteiro**:

1. `src/components/marketing/components/ProspectingLeadsPage.tsx` — delete.
2. `src/components/marketing/components/ProspectingCollectionPage.tsx` — delete.
3. `src/components/marketing/components/index.ts` — delete (órfão: zero importadores; o único export vivo, `ProspectingPage`, é importado diretamente por `App.tsx`, sem depender do barrel).

### Por que DELETE e não ARCHIVE (contraponto ao precedente ADR-008/`agents/`)

O precedente `agents/` usou **archive-in-place** porque: (a) continha definições `.md` com valor de referência, (b) implementações `.ts` parciais já excluídas do build, (c) 31 erros TS pré-existentes que vazavam para o typecheck. **Nenhuma dessas condições se aplica aqui**:

| Critério | `agents/` (ADR-008) | Este caso |
|----------|---------------------|-----------|
| Valor de referência | Definições `.md` + scaffolds parciais | Nenhum — lógica de tabs já reimplementada em `prospecting/` (vivo) |
| Relação com build | Excluído do typecheck | Compila hoje; deletar remove do bundle de verdade |
| Erros TS vazando | 31 erros | Zero erros associados |
| Consumidores | Zero (rg "agents/" src/) | Zero (grep em src/) |
| Histórico | Vários commits | **1 único commit** (`554d89f`) |

O git é o registro canônico do que foi deletado: `git log 554d89f`, `git show 554d89f:src/components/marketing/components/ProspectingLeadsPage.tsx`. Qualquer ressureição é `git revert`/`git show` — sem perda real.

---

## Alternativas consideradas

1. **Manter como está** — rejeitada. Dead code permanente: confunde agents (qual fonte é canônica?), infla bundle (Vite inclui apenas o que é importado — como o barrel é órfão, o impacto de bundle é nulo, mas o ruído de manutenção é real) e mantém um ciclo de evento (`marketing:leads:invalidate`) sem qualquer consumidor vivo.
2. **Arquivar (mover para `archive/` ou diretório morto)** — rejeitada. Mover exigiria reescrita de import paths e/ou exclusão no tsconfig para um diretório morto; com 1 commit de histórico e zero valor de referência, o custo supera o benefício. O precedente ADR-008 justificava archive por valor de `.md` + erros TS pré-existentes — ausentes aqui.
3. **Deletar apenas os 2 arquivos e podar o barrel (remover 2 linhas)** — viável, mas inferior: o barrel continua órfão (zero importadores) exportando 3 componentes igualmente mortos + 1 vivo que não usa o barrel. Deletar o barrel inteiro é a opção mais limpa e honesta.
4. **DELETAR (escolhida)** — conforme acima.

---

## Consequências

### Positivas
- **Menos dead code**: desaparecem 2 páginas + barrel nunca importado (~37 KB de fonte não-bundlada).
- **Fonte única de verdade**: `ProspectingPage.tsx` + tabs `prospecting/` passam a ser os únicos componentes de Prospecção no frontend — fim da ambiguidade que confundia agents e devs.
- **Sem risco de ressureição acidental**: o ciclo de evento morto (`marketing:leads:invalidate`) deixa de existir.
- **Zero regressão esperada**: rota `/admin/marketing/prospecting/*` continua renderizando `ProspectingPage` (import direto do `App.tsx` não depende do barrel).

### Negativas
- **Git history é o único registro**: qualquer ressureição futura depende de `git show`/`git revert` (aceitável — histórico preservado no commit `554d89f`).
- **Diff não-commitado será perdido**: a working tree contém ~16 linhas não-commitadas nos dois arquivos mortos (event listener cíclico). O plano de execução recomenda commitar o diff antes do delete (ou aceitar a perda — as alterações são internas ao cluster morto e não conectam com runtime).
- **Observação tangencial**: `ProspectingCampaignsPage.tsx`, `ProspectingAutomationPage.tsx` e `ProspectingLayout.tsx` ficam órfãos após o barrel-sumisse — ver Follow-up.

---

## Plano de execução seguro (para @refactor-cleaner)

> Evidência antes de afirmação. Este plano será executado em etapa subsequente — esta ADR **não modifica código**.

1. **Pré-flight (confirmar zero imports)** — já verificado em 2026-08-27, re-executar para garantir:
   ```bash
   grep -rn "ProspectingLeadsPage\|ProspectingCollectionPage" src/ | grep -v "components/index.ts"
   # → 0 matches esperados
   grep -rn "from '.*marketing/components'" src/ | grep -v "components/"
   # → 0 matches esperados (barrel órfão)
   ```
2. **Preservar diff não-commitado** (decisão explícita do usuário): ou `git stash push` dos 2 arquivos (para depois validar se algum trecho foi reimplementado nas tabs vivas), ou commit prévio do diff para manter o histórico completo antes do delete.
3. **Deletar**:
   ```bash
   git rm src/components/marketing/components/ProspectingLeadsPage.tsx \
           src/components/marketing/components/ProspectingCollectionPage.tsx \
           src/components/marketing/components/index.ts
   ```
4. **Verificar typecheck**: `npx tsc --noEmit` → exit 0 (sem erros, sem regressão).
5. **Verificar build**: `npm run build` (ou `npx vite build`) → sucesso.
6. **Smoke E2E (Playwright)** da rota `/admin/marketing/prospecting/leads` (e navegação entre tabs leads/collection/automation/queue): página renderiza, tabs vivas funcionam, nenhum erro de console.
7. **Verificação final**: `grep -rn "ProspectingLeadsPage\|ProspectingCollectionPage" src/` → 0 matches.

### Critério de sucesso
Tudo que funcionava continua funcionando: rota `/admin/marketing/prospecting/*` renderiza via `ProspectingPage` + tabs `prospecting/`, `tsc --noEmit` = 0 erros, build verde, smoke E2E da rota passa. Nada útil perdido (lógica do cluster morto não conecta com runtime).

---

## Follow-up (fora do escopo desta ADR)

O mesmo cluster `components/` contém outros órfãos aparentes, a auditar por @refactor-cleaner em decisão própria:
- `ProspectingCampaignsPage.tsx` — só exportado pelo barrel (deletado por esta ADR).
- `ProspectingAutomationPage.tsx` — só exportado pelo barrel; importa `ProspectingLayout`.
- `ProspectingLayout.tsx` — consumido apenas por arquivos mortos (`ProspectingAutomationPage` + `ProspectingCollectionPage`).

Qualquer remoção posterior desses 3 exige nova verificação de grep + esta ADR como referência de precedente (não exige ADR novo se seguir o mesmo padrão documentado e o critério de zero imports).

---

## Referências

- `src/App.tsx` linhas 31 e 250 (import e render direto de `ProspectingPage`)
- `src/components/marketing/components/ProspectingPage.tsx` linhas 13-22 (import das tabs de `../prospecting`)
- `src/components/marketing/components/index.ts` (barrel órfão, linhas 1-6)
- `src/components/marketing/components/ProspectingCollectionPage.tsx` linha 98 (dispatch `marketing:leads:invalidate`)
- `src/components/marketing/components/ProspectingLeadsPage.tsx` linhas 105-106 (listener `marketing:leads:invalidate`)
- Commit `554d89f feat: implement autonomous B2B prospecting module` (único commit que toca os arquivos mortos)
- ADR-008-Agent-Topology-Unification.md (precedente archive-in-place de `agents/`, contraposto na seção "Decisão")