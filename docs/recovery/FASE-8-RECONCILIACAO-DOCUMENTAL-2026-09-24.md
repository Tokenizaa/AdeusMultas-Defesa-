# FASE 8 — Reconciliação Documental Pós-Auditoria

**Data:** 2026-09-24 | **Natureza:** reconciliação de inventário e controle documental — **sem raspagem, sem acesso a sites, sem download, sem alteração de arquivos físicos coletados.**

## 1. Commit-base

```
5c86690e95102a506eadfd5b279ac2273fc8e150  (fim da primeira rodada nacional)
76e5b624713fd4b0ece185e4227e79b3f6d49b6f  (auditoria de integridade)
```

Esta reconciliação parte do estado pós-auditoria (`76e5b62`) e produz esta execução.

## 2. Achados da auditoria (origem)

Relatório: `docs/recovery/FASE-8-AUDITORIA-INTEGRIDADE-69-ARQUIVOS-2026-09-24.md`

- 71 arquivos físicos (15 federal + 56 estadual) — não 69. Título do relatório mantém padrão "69-ARQUIVOS"; contagem real = 71.
- 50 válidos sem ressalva; 3 alertas MIME (prf.html, stj.html, RJ/formularios_infracoes.html); 9 inválidos.
- Duplicatas exatas: 2 grupos (5× contran JSON `6bbcea…`; 2× CE `ebaded…`).
- 12 arquivos sem registro no inventário (4 federais + 8 CE).
- 1 hash divergente (SRC_FED_CONTRAN_RESOLUCOES).
- 5 documentos registrados como COLLECTED cujo payload é falha/página HTML (não o ato jurídico).
- BA: decreto de Estratégia de Governo Digital fora do escopo de trânsito.

## 3. Alterações realizadas (somente documentação/inventário)

### 3.1 Inventário — `FASE-8-INVENTARIO-DOCUMENTAL-OFICIAL-2026-09-23.md`

| Item | Alteração |
|---|---|
| Hash CONTRAN | `SRC_FED_CONTRAN_RESOLUCOES` corrigido para `abbbe54018dde4f96fa27d3402e42f95e0ea93d754452ec7809f62a8249c13f0` |
| CE (8 arquivos) | Registrados: defesa_autuar_infracao_transito.html, regimento_interno_cetran_ce_2020.pdf, resolucao_cetran_ce_001_2013.pdf, 001_2014, 003_2019, 005, 006 = COLLECTED; recurso_jari_detran_ce.html = DUPLICATA_EXATA |
| Órfãos federais (4) | Registrados como `COLETA_FALHOU_PAYLOAD_NOT_FOUND` (payload 26B `{"error_type":"NotFound"}`) |
| Payloads de falha (5) | `federal/ctb.pdf`, `federal/contran_res_796_2020.pdf`, `states/AC/defesa_previa_pf.pdf`, `states/AM/memo_753_2026_opttran_detran.pdf`, `states/BA/decreto_legislabahia_23792_2025.pdf` → `COLETA_FALHOU_PAYLOAD_INVALIDO` |
| BA | `SRC_LEGISLATIVO_BA_DECRETO_23792_2025` → `FORA_DO_ESCOPO_TRANSITO` |
| Estatísticas | Federal 10→9; AC 4→3; AM 5→4; BA 1→0; CE 7→8 (duplicata não contabilizada) |
| Seção nova | `## Reconciliação Pós-Auditoria (2026-09-24)` registrando fatos da auditoria |

### 3.2 Controle — `plan/progress.md`

- Registro `FASE 8 — RECONCILIAÇÃO DOCUMENTAL: CONCLUÍDA` (ver seção 8).

## 4. Arquivos que permaneceram intocados

Todos os arquivos em `docs/recovery/legal_collected_2026_09_23/` (federal/ e states/*) permanecem **exatamente como coletados na primeira rodada** — nenhum foi modificado, renomeado, movido ou apagado nesta reconciliação.

## 5. Payloads de erro

- 4 órfãos federais (26B cada, `{"error_type": "NotFound"}`): `contran.html`, `contran2.html`, `contran_res_7962020.pdf`, `contran_res_list.html` → `COLETA_FALHOU_PAYLOAD_NOT_FOUND`.
- 5 payloads inválidos já registrados (arquivo com extensão .pdf mas conteúdo HTML/JSON): `ctb.pdf` (HTML 485B), `contran_res_796_2020.pdf` (JSON 26B), `AC/defesa_previa_pf.pdf` (HTML), `AM/memo_753_2026_opttran_detran.pdf` (HTML), `BA/decreto_legislabahia_23792_2025.pdf` (HTML) → `COLETA_FALHOU_PAYLOAD_INVALIDO`.
- Os arquivos permanecem preservados como evidência da tentativa de coleta.

## 6. Duplicata

`states/CE/recurso_jari_detran_ce.html` — SHA-256 `ebaded0d43931826c3a02c1527d57fe916bbc4ec78d24dbf304020ece1ea818a` — é **duplicata exata** de `states/CE/defesa_autuar_infracao_transito.html` (mesmo hash). Registrada explicitamente como `DUPLICATA_EXATA`; não contabilizada como documento independente. **Nenhum dos dois foi apagado.**

## 7. Correção de hash

- Registro `SRC_FED_CONTRAN_RESOLUCOES` (arquivo `federal/contran_resolutions.html`): hash registrado estava malformado (`abb e54018dde4…`, espaço + caractere ausente). Corrigido para o SHA-256 físico real: `abbbe54018dde4f96fa27d3402e42f95e0ea93d754452ec7809f62a8249c13f0`.
- `plan/progress.md` verificado/atualizado se o hash aparecer (ver seção 10).

## 8. Situação do inventário após reconciliação

- Linhas no inventário (bloco Federal): 15 (11 COLLECTED → 9 COLLECTED + 2 COLETA_FALHOU_PAYLOAD_INVALIDO + 4 COLETA_FALHOU_PAYLOAD_NOT_FOUND).
- CE no inventário: 9 linhas (8 COLLECTED + 1 DUPLICATA_EXATA), cobrindo os 9 arquivos físicos CE.
- ARQUIVO_SEM_REGISTRO remanescente: **0**.
- REGISTRO_SEM_ARQUIVO: **0**.
- Hash divergente remanescente: **0**.
- Alertas MIME (3): registrados, mantidos como válidos: `prf.html`, `stj.html`, `RJ/formularios_infracoes.html`.

## 9. Itens deliberadamente deixados para futura recuperação

Recuperação dos documentos pretendidos cuja coleta falhou (a definir em rodada própria, fora desta execução):

1. CTB PDF (`federal/ctb.pdf`) — payload HTML.
2. Resolução CONTRAN 796/2020 (`federal/contran_res_796_2020.pdf` e orfãos `contran*.html/pdf`) — payload JSON NotFound.
3. Defesa prévia AC (`states/AC/defesa_previa_pf.pdf`) — payload HTML.
4. Memo DETRAN-AM 753/2026 (`states/AM/memo_753_2026_opttran_detran.pdf`) — payload HTML.
5. Decreto BA 23.792/2025 (`states/BA/decreto_legislabahia_23792_2025.pdf`) — payload HTML **e** fora do escopo de trânsito (não é candidato a recuperação para cobertura de trânsito).
6. UFs bloqueadas (AP, DF, MA, MT, PE, RN, RO, SE) e fontes parciais — segunda rodada, posterior.
7. Verificação online de origens (todas marcadas `ORIGEM_NAO_VERIFICADA_NESTA_AUDITORIA`).

## 10. Confirmação — nenhuma nova raspagem

- Nenhum site acessado nesta execução.
- Nenhum documento baixado.
- Nenhum arquivo de `legal_collected_2026_09_23/` modificado (verificado via `git status`/`git diff`).
- Apenas documentação/inventário alterada: `FASE-8-INVENTARIO-DOCUMENTAL-OFICIAL-2026-09-23.md`, `plan/progress.md` e este relatório.

## 11. Resumo verificável

| Métrica | Valor |
|---|---|
| Arquivos físicos | 71 (15 federal + 56 estadual) |
| Válidos (sem ressalva) | 50 |
| Alertas MIME | 3 |
| Inválidos | 9 |
| Duplicatas exatas | 2 grupos (5 federal + 2 CE) |
| Registros sem arquivo | 0 |
| Arquivos sem registro | 0 (após reconciliação) |
| Hashes divergentes | 0 (após correção) |
| Payloads de falha registrados | 9 (4 NOT_FOUND + 5 INVALIDO) |
| Nova raspagem | nenhuma |