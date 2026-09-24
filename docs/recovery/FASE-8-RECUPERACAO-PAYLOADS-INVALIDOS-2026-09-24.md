# FASE 8 — Recuperação dos Documentos com Coleta Inválida

**Data:** 2026-09-24 | **Natureza:** coleta extremamente delimitada — 4 alvos, nenhuma exploração aberta.

**Commit-base:** `b2502941dbd271a0bbd192c8257d19c006e13c79`

## Escopo

Execução fechada para recuperação dos 4 documentos cuja coleta de primeira rodada produziu payload inválido. Sem UF bloqueada, sem segunda rodada, sem complementação, sem análise de cobertura. Arquivos inválidos originais preservados como evidência das tentativas anteriores.

## Resultado

| Alvo | Resultado | Arquivo | Fonte oficial | Bytes | SHA-256 |
| --- | --- | --- | --- | ---: | --- |
| CTB PDF | RECUPERACAO_BLOQUEADA | `federal/ctb.pdf` (preservado, payload HTML de falha) | Planalto (`www.planalto.gov.br/ccivil_03/leis/`) | 485 | `623f0a987426022735c217262f78ad0eae6e2058dc2077f725200f956031e7d6` |
| CONTRAN 796/2020 | **RECUPERADO** | `federal/contran_res_796_2020_recuperado.pdf` | CONTRAN via gov.br (`www.gov.br/transportes/.../conteudo-contran/resolucoes/Resolucao7962020.pdf`) | 84350 | `5bc7bade164377fce6abe301b8ae59a7de7a008598c3011a7fe6cb177fdd0c1d` |
| Defesa prévia AC | RECUPERACAO_BLOQUEADA | `states/AC/defesa_previa_pf.pdf` (preservado, payload HTML de falha) | DETRAN-AC (`www.detran.ac.gov.br`) | 155560 | `15950ab7e5de613d9b086baae6894f7b452d8085edefcf4459276e7aa2b7d4f7` |
| Memo 753/2026 AM | **RECUPERADO** | `states/AM/memo_753_2026_recuperado.pdf` | DETRAN-AM (`www.detran.am.gov.br/wp-content/uploads/2026/09/MEMO_N_753_2026_OPTRAN_DETRAN_Portaria.pdf`) | 284405 | `59b023ada37e71cdb21c2ed4be9dca59ec2c5cf54323f0e2c1f001deb8434439` |

## Recuperados — detalhamento

### CONTRAN 796/2020 — RECUPERADO

- **Rota 1 (falha):** URLs registradas e padrão `resolucao7962020.pdf` em `gov.br/infraestrutura` e `gov.br/transportes` → 404 JSON `{"error_type":"NotFound"}`.
- **Rota 2 (sucesso):** `https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao7962020.pdf` → HTTP 200, `application/pdf`.
- **Validação:** `file` = PDF 1.4, 2 páginas; magic `%PDF-`; metadata de criação 2020-09-09 (coerente com resolução de 2020); nome do arquivo e diretório canônicos de resoluções CONTRAN no domínio gov.br.
- Prazo: 2 rotas; evidência da tentativa (`contran_res_796_2020.pdf` 26B JSON) preservada.

### Memo 753/2026 — AM — RECUPERADO

- **Rota 1 (falha):** URL registrada `.../uploads/2026/08/MEMO_N_753_2026_OPTRAN_DETRAN_Portaria.pdf` → 404 HTML de erro.
- **Rota 2 (sucesso):** página oficial de portarias normativas do DETRAN-AM listou o arquivo em **`/uploads/2026/09/MEMO_N_753_2026_OPTRAN_DETRAN_Portaria.pdf`** (mês do diretório mudou de 08 para 09) → HTTP 200, `application/pdf`.
- **Validação:** `file` = PDF 1.7, 2 páginas; magic `%PDF-`; nome idêntico ao alvo no domínio oficial do DETRAN-AM.
- Prazo: 2 rotas; evidência da tentativa (`memo_753_2026_opttran_detran.pdf` HTML de erro) preservada.

## Bloqueados — razão objetiva

### CTB PDF — RECUPERACAO_BLOQUEADA

- Autoridade: Planalto. O servidor do Planalto respondeu `300 Multiple Choices` para `l9503compilado.pdf` (e variações de caixa), declarando explicitamente que o único documento disponível com aquele basename é `/ccivil_03/leis/l9503compilado.htm` (HTML) — **não há PDF oficial publicado pelo Planalto** para o CTB compilado.
- Rotas alternativas dentro do domínio oficial (gov.br/transportes, senatran, conteudo-contran) → 404 JSON NotFound.
- O compilado HTML oficial **já existe válido** (`federal/ctb.html`). Recuperação de PDF fora do limite de 2 rotas/domínio oficial.

### Defesa prévia AC — RECUPERACAO_BLOQUEADA

- **Rota 1:** URL registrada `https://www.detran.ac.gov.br//site/images/stories/downloads/requerimento de defesa previa.pdf` → 404 com payload HTML (mesmo da coleta original).
- **Rota 2:** página oficial `https://www.detran.ac.gov.br/infracoes-multas/multas-informacoes-de-servicos/defesa-previa/pessoa-fisica/` (HTTP 200) referencia **exatamente o mesmo PDF que retorna 404**. O recurso foi removido/realocado no site do DETRAN-AC.
- Localizar o novo caminho exigiria exploração além do limite de 2 rotas — posta para rodada própria de fontes inacessíveis.

## Inventário — atualizações (somente 4 alvos)

- `SRC_FED_PLANALTO_CTB_PDF` → `RECUPERACAO_BLOQUEADA` (arquivo de falha preservado).
- `SRC_AC_DETRAN_DEFESA_PREVIA_PF` → `RECUPERACAO_BLOQUEADA` (arquivo de falha preservado).
- `SRC_FED_CONTRAN_RESOLUCOES_INDIVIDUAL` → mantido `COLETA_FALHOU_PAYLOAD_INVALIDO` (evidência); nova linha `SRC_FED_CONTRAN_796_2020_RECUPERADO` → `RECUPERADO`.
- `SRC_AM_DETRAN_MEMO_753_2026` → mantido `COLETA_FALHOU_PAYLOAD_INVALIDO` (evidência); nova linha `SRC_AM_MEMO_753_2026_RECUPERADO` → `RECUPERADO`.
- Nenhuma classificação de cobertura de UF alterada.

## Teste final

- `git diff --check`: limpo.
- Nenhum arquivo de coleta válida anterior foi modificado; apenas os 2 novos arquivos recuperados foram adicionados; os 4 arquivos de falha originais permanecem intocados.

## Arquivos do resultado

- Novo: `legal_collected_2026_09_23/federal/contran_res_796_2020_recuperado.pdf`
- Novo: `legal_collected_2026_09_23/states/AM/memo_753_2026_recuperado.pdf`
- Preservados (não modificados): todos os demais arquivos, incluindo os 4 payloads de falha.