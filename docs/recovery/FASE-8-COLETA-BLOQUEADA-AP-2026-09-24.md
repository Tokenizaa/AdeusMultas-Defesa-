# FASE 8 — Recuperação/Coleta Documental — AP (Amapá)

**Data:** 2026-09-24 | **Natureza:** recuperação de UF bloqueada na primeira rodada — escopo exclusivamente AP.
**Commit-base:** `d7dbb0132af73b3249af13477d06b34482dfe276`

## 1. Objetivo

Tentar recuperar fontes/documentos oficiais de trânsito do Amapá (AP) que ficaram bloqueados/inacessíveis na primeira rodada nacional (na época: DETRAN-AP 404, CETRAN-AP sem resposta).

## 2. Fontes oficiais investigadas

- DETRAN-AP: `https://www.detran.ap.gov.br/` (domínio oficial)
- CETRAN-AP: `https://www.cetran.ap.gov.br/` (domínio oficial)
- Rota arquivada do CETRAN-AP no domínio DETRAN-AP: `https://sisget.detran.ap.gov.br/detranap/institucional-bkp/cetranap/`

## 3. URLs e rotas tentadas

| Rota | URL | Resultado HTTP | MIME |
|---|---|---|---|
| DETRAN-AP raiz | `https://www.detran.ap.gov.br/` | 200 (JS redirect `location.href=.../detranap`) | text/html |
| DETRAN-AP portal | `https://www.detran.ap.gov.br/detranap/` | 200 | text/html; charset=UTF-8 |
| Página Infrações | `https://www.detran.ap.gov.br/detranap/menu-servicos/menu-infracoes/` | 200 | text/html |
| Formulário 1 | `https://www.detran.ap.gov.br/detranap/wp-content/uploads/2026/04/requerimento-infracao.pdf` | 200 | application/pdf |
| Formulário 2 | `https://www.detran.ap.gov.br/detranap/wp-content/uploads/2026/04/solicitacao-de-servicos.pdf` | 200 | application/pdf |
| CETRAN-AP raiz | `https://www.cetran.ap.gov.br/` / `http://...` | 000 (DNS não resolve) | — |
| CETRAN-AP arq. | `https://sisget.detran.ap.gov.br/detranap/institucional-bkp/cetranap/` | 404 | text/html |

## 4. Documentos recuperados (DETRAN-AP)

| Arquivo | Bytes | MIME | Magic | SHA-256 |
|---|---|---|---:|---|---|
| `states/AP/requerimento_infracao.pdf` | 117163 | application/pdf (PDF 1.7, 1 pág) | `%PDF-` | `7a2e6e7383a31724eedd7e2d498714cafcf50071b9cdb61d46f5c49e0e5ca953` |
| `states/AP/solicitacao_de_servicos.pdf` | 126503 | application/pdf (PDF 1.7, 1 pág) | `%PDF-` | `7cd67e5be101a37aea5f9e1cb1d4823a6cfb4906b2b046f3cded7c9bf54f4c49` |

Data da coleta: 2026-09-24T22:34:00Z.

## 5. Documentos que permaneceram bloqueados

- **CETRAN-AP:** domínio `cetran.ap.gov.br` (e `www.`) **não resolve DNS** em 2026-09-24. Rota arquivada `sisget.detran.ap.gov.br/detranap/institucional-bkp/cetranap/` (referenciada na página institucional) retorna **404**.
- Classificação: `RECUPERACAO_BLOQUEADA` para CETRAN-AP.

## 6. Limitações objetivas

- Apenas formulários de DETRAN-AP foram localizados; não foram encontrados nesta passagem resoluções/portarias/instruções do CETRAN-AP (fonte sem DNS).
- A coleta cobre formulários administrativos de infrações; **não** indica cobertura jurídica completa do AP.

## 7. Classificação final de AP

- **AP: PROCESSADA — COBERTURA PARCIAL** (2 formulários oficiais de DETRAN-AP coletados; CETRAN-AP permanece bloqueado por DNS).

## 8. Inventário e controle

- Inventário: seção `### Estaduais - Amapá (AP)` criada com 2 registros COLLECTED; blocos bloqueados AP atualizados (DETRAN-AP recuperado; CETRAN-AP RECUPERACAO_BLOQUEADA); stats `### Estadual (AP)` adicionadas.
- `plan/progress.md`: `AP: PROCESSADA — COBERTURA PARCIAL`.
- Nenhuma outra UF foi tocada; nenhum arquivo histórico foi alterado.