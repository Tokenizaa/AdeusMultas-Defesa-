# Checkpoint: G0

**Data:** 2026-08-24
**Fase:** G0
**SHA da fase:** `05472be` (branch `main`)
**Features desta fase:** 3 de 3 — todas PASS

| ID | Título | Resultado |
|----|--------|-----------|
| G0-01 | Estrutura de governança inicial | ✅ PASS |
| G0-02 | Suítes de invariantes | ✅ PASS |
| G0-03 | Estado inicial do projeto (progress.md + snapshot) | ✅ PASS |

---

## Critérios de Aceite

- [x] `loop/CHECKPOINT.md` existe (template de phase-stop)
- [x] `loop/loop.config.json` válido (JSON parseável, smoke command, invariants_glob)
- [x] `plan/features.json` com ≥1 feature (14 features em G0–G6)
- [x] `loop/inbox.items.md` inicializado com 2 itens
- [x] `tests/invariants/` com 3 suítes (ratchet ativo via PreToolUse + pre-commit)
- [x] `plan/progress.md` com estado inicial do projeto

## Invariantes Violadas

| Invariante | Estado |
|------------|--------|
| RLS habilitado em `profiles` | mantida |
| `getSession()` jamais em produção (só `getUser()`) | mantida |
| `.env` nunca commitado | mantida |

Todos os testes de invariantes estão verde na baseline — nenhuma violação.

## Evidências Coletadas

Caminhos em `loop/evidence/G0/`:
- `G0-01.md` — estrutura de governança criada
- `G0-02.md` — 3 suítes ratchet implementadas
- `G0-03.md` — estado inicial documentado

## Bloqueios e Decisões

### Bloqueio remanescente (pré-governança)

**WARNING:** 19 produção files estavam alterados em working tree no início da sessão
(antes da criação do `loop/`). Essas alterações são **outside de governança** — existiam
antes do baseline e foram preservadas via `git stash push -u -m "orphan 2026-08-24T05:43:42Z pre-gov-baseline"`.

Esses arquivos pertencem a sessões que operavam sem governança. Para incorporá-los de forma
segura, cada um deve ser:
1. Identificado (qual feature/PR original)
2. Re-verificado contra invariantes e acceptance criteria
3. Commitado via Loop Engineering com feature correspondente no `plan/features.json`

Itens de inbox bloqueando features:
- `INBOX-01`: Confirmar `SUPABASE_SERVICE_ROLE_KEY` em produção (bloqueia G1-03)
- `INBOX-02`: Validar credenciais PagBank testnet (bloqueia G5-01)

## Resultado

- [x] **COMPLETO** — todas as features PASS, invariantes mantidas, baseline commitada

## Aprovação Humana

Para destravar as próximas sessões:
```
touch loop/checkpoints/G0.approved
```

Ou, se decidir rejeitar a estrutura atual:
```
touch loop/checkpoints/G0.rejected
```

> A presença de `loop/checkpoints/G0.rejected` causa BLOCKED até que o item correspondente
> seja respondido na inbox.

---
_Gerado pelo gov-loop-orchestrator em 2026-08-24T05:43:42Z. Não editar manualmente — use o orquestrador._