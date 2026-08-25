# Checkpoint Template — Loop Engineering
## Como usar
- Fim de cada fase: G0 → G1 → … → G6
- Preenchido pelo orquestrador usando dados de disco (features.json + evidências)
- Commite na branch `gov/<FASE>` antes de solicitar aprovação humana

---

# Checkpoint: `<FASE>`

**Data:** YYYY-MM-DD
**Fase:** `<FASE>`
**Features desta fase:**

| ID | Título | Resultado |
|----|--------|-----------|
| G<N>-XX | … | ✅ PASS / ❌ FAIL |

## Critérios de Aceite por Feature

Cada `G<N>-XX` satisfez **todos** os itens de `acceptance` em `plan/features.json`?

- [ ] G<N>-01
- [ ] G<N>-02 …

## Invariantes Violadas

| Invariante | Estado | Ação tomada |
|------------|--------|-------------|
| RLS enabled na tabela profiles | mantida | — |
| `getSession()` nunca usado em código de produção | mantida | — |
| … | … | … |

## Evidências Coletadas

Caminhos em `loop/evidence/<FASE>/`:
- `G<N>-XX.md`
- …

## Bloqueios e Decisões

Listar itens que precisam de intervenção humana ou que foram adiados.

## Resultado

- [ ] **COMPLETO** — todas as features PASS, invariantes mantidas, pronto para merge
- [ ] **INCOMPLETO** — bloqueado por: [descrever]

## Aprovação Humana

- [ ] `loop/checkpoints/<FASE>.approved` — criado
- [ ] `loop/checkpoints/<FASE>.rejected` — criado

---

> Gerado por gov-loop-orchestrator. Não editar manualmente — use o orquestrador.