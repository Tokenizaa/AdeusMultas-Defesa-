# FASE 8 — Validação de Cobertura Documental Nacional

**Data:** 2026-09-24 | **Natureza:** fechamento da Fase 8 — reconstrução do acervo documental oficial de trânsito após perda do banco histórico.
**Commit-base:** `c97fa2ec32dda9582f06daf71e130692d3df8647`

## 14.1 Escopo

A Fase 8 reconstruiu o acervo documental oficial de trânsito (federal + 27 UFs) como base para a recuperação da base jurídica. Este relatório consolida coleta → validação física → hash → reconciliação → recuperação de payloads → recuperação de UFs bloqueadas → validação nacional.

## 14.2 Metodologia

```
catálogo oficial → coleta → validação física → hash → reconciliação
→ recuperação de payloads → recuperação de UFs bloqueadas → validação nacional
```

Execuções: primeira rodada (`5c86690`) → auditoria (`76e5b62`) → reconciliação (`b250294`) → recuperação de 4 payloads (`49a2d34`) → auditoria dos recuperados (`d7dbb01`) → recuperação AP (`c97fa2e`) → lote bloqueadas + fechamento (esta execução).

## 14.3 Federal

| Área | Valor |
| --- | ---: |
| Arquivos físicos | 16 |
| Documentos válidos | 10 (9 COLLECTED + 1 RECUPERADO — CONTRAN 796/2020) |
| Payloads de falha | 6 (ctb.pdf, contran_res_796_2020.pdf + 4 payloads NotFound) |
| Hash corrigido | 1 (SRC_FED_CONTRAN_RESOLUCOES) |
| Fora do escopo | 0 |
| Duplicatas (grupo contran JSON) | 5 arquivos mesmo hash (falha) |

Documentos válidos federais: ctb.html (CTB compilado), senatran.html, contran_resolutions.html, prf.html, dnit.html, anttr.html, inmet.html, dou.html, stj.html + contran_res_796_2020_recuperado.pdf.

## 14.4 27 UFs

| UF | DETRAN | CETRAN | Docs físicos | Válidos | Recuperados | Bloqueios | Classificação |
| --- | --- | --- | ---: | ---: | ---: | --- | --- |
| AC | acessível | bloqueado | 4 | 3 | 0 | CETRAN (DNS) | COBERTURA_PARCIAL |
| AL | acessível | acessível | 3 | 3 | 0 | — | COBERTURA_DOCUMENTAL |
| AM | acessível | bloqueado | 6 | 5 | 1 | CETRAN (DNS) | COBERTURA_DOCUMENTAL_RECUPERADA |
| AP | acessível | bloqueado | 2 | 2 | 2 | CETRAN (DNS) | COBERTURA_PARCIAL |
| BA | — | acessível* | 1 | 0 | 0 | fora do escopo | FORA_DO_ESCOPO (sem cobertura trânsito) |
| CE | acessível | acessível | 9 | 8 | 0 | 1 duplicata | COBERTURA_DOCUMENTAL |
| DF | bloqueado | bloqueado | 0 | 0 | 0 | timeout | RECUPERACAO_BLOQUEADA |
| ES | acessível | acessível | 2 | 2 | 0 | — | COBERTURA_DOCUMENTAL |
| GO | acessível | acessível | 2 | 2 | 0 | — | COBERTURA_DOCUMENTAL |
| MG | acessível | bloqueado | 1 | 1 | 0 | CETRAN (timeout) | COBERTURA_PARCIAL |
| MS | acessível | acessível | 2 | 2 | 0 | — | COBERTURA_DOCUMENTAL |
| MT | bloqueado | bloqueado | 0 | 0 | 0 | TLS hang/timeout | RECUPERACAO_BLOQUEADA |
| PA | parcial (SPA) | bloqueado | 1 | 1 | 0 | CETRAN (timeout) | COBERTURA_PARCIAL |
| PB | acessível | acessível | 2 | 2 | 0 | — | COBERTURA_DOCUMENTAL |
| PE | bloqueado | bloqueado | 0 | 0 | 0 | Akamai 403/timeout | RECUPERACAO_BLOQUEADA |
| PI | acessível | via portal | 4 | 4 | 0 | — | COBERTURA_DOCUMENTAL |
| PR | acessível | acessível | 3 | 3 | 0 | — | COBERTURA_DOCUMENTAL |
| RJ | acessível | http | 3 | 3 | 0 | 1 alerta MIME | COBERTURA_DOCUMENTAL |
| RN | bloqueado | bloqueado | 0 | 0 | 0 | 503/timeout | RECUPERACAO_BLOQUEADA |
| RO | bloqueado | bloqueado | 0 | 0 | 0 | timeout | RECUPERACAO_BLOQUEADA |
| RR | acessível | bloqueado | 3 | 3 | 0 | CETRAN (timeout) | COBERTURA_PARCIAL |
| RS | acessível | acessível | 2 | 2 | 0 | — | COBERTURA_DOCUMENTAL |
| SC | acessível | acessível | 3 | 3 | 0 | — | COBERTURA_DOCUMENTAL |
| SE | bloqueado | bloqueado | 0 | 0 | 0 | Cloudflare 403/timeout | RECUPERACAO_BLOQUEADA |
| SP | acessível | acessível | 3 | 3 | 0 | — | COBERTURA_DOCUMENTAL |
| TO | acessível | bloqueado | 3 | 3 | 0 | CETRAN (timeout) | COBERTURA_PARCIAL |

\* BA: única fonte (LEGISLABAHIA) entregou decreto de Governo Digital — FORA_DO_ESCOPO_TRANSITO, preservado mas sem valor para cobertura de trânsito.

**Totais estaduais:** 59 arquivos físicos | 55 válidos | 3 recuperados (AM 1 + AP 2) | 1 duplicata (CE) | 7 UFs bloqueadas com 0 docs.

**Totais gerais:** 75 arquivos físicos | 65 documentos válidos (10 federal + 55 estadual).

## 14.5 Evidências recuperadas durante a Fase 8

| Documento | UF | Arquivo | SHA-256 |
| --- | --- | --- | --- |
| Resolução CONTRAN 796/2020 | Federal | `contran_res_796_2020_recuperado.pdf` | `5bc7bade…` |
| Memo Nº 753/2026 DETRAN-AM | AM | `memo_753_2026_recuperado.pdf` | `59b023ad…` |
| Requerimento de Infração | AP | `requerimento_infracao.pdf` | `7a2e6e73…` |
| Solicitação de Serviços | AP | `solicitacao_de_servicos.pdf` | `7cd67e5b…` |

## 14.6 Bloqueios

- **DNS não resolve:** CETRAN-AC, CETRAN-AM, CETRAN-AP, CETRAN-PA, CETRAN-RR, CETRAN-TO, CETRAN-DF, CETRAN-MA, CETRAN-MT, CETRAN-PE, CETRAN-RN, CETRAN-RO, CETRAN-SE.
- **Timeout/flaky:** DETRAN-DF, DETRAN-MA, DETRAN-MT, DETRAN-RO, DETRAN-RN (503), CETRAN-MG, CETRAN-PA.
- **Bot-block:** DETRAN-PE (Akamai 403), DETRAN-SE (Cloudflare 403).
- **TLS hang:** DETRAN-MT (F5 BigIP — TLS conecta, HTTP nunca responde).
- **Payload inválido (6 federal + 3 estadual):** recuperações tentadas; 2 recuperados (CONTRAN 796, Memo 753 AM), CTB PDF e Defesa Prévia AC permanecem bloqueados (fonte oficial não publica PDF: Planalto; link oficial 404: DETRAN-AC).
- **Ausência de documento oficial** (fonte acessível sem documento identificado): nenhuma nova nesta execução (as 7 UFs do lote seguiram bloqueadas).

## 14.7 Duplicatas

- Grupo `6bbcea2b…` (5 arquivos): contran.html, contran2.html, contran_res_796_2020.pdf, contran_res_7962020.pdf, contran_res_list.pdf — payloads de falha idênticos, não documentos.
- Grupo `ebaded0d…` (2 arquivos): CE `defesa_autuar_infracao_transito.html` = `recurso_jari_detran_ce.html` — duplicata registrada, ambos preservados.

## 14.8 Lacunas

1. **7 UFs sem evidência documental** (bloqueadas por infraestrutura): DF, MA, MT, PE, RN, RO, SE — exigem acesso via outro ASN/VPN/navegador real para transpor Cloudflare/Akamai/TLS, e DNS/hosts alternativos.
2. **CTB em PDF** (federal): fonte oficial (Planalto) publica apenas HTML; PDF não disponível.
3. **Defesa prévia AC**: link oficial 404 (recurso removido/realocado no site).
4. **CETRAN de 13 UFs** sem domínio acessível; resoluções estaduais dependem de recuperação futura.
5. **3 alertas MIME**: prf.html, stj.html, RJ/formularios_infracoes.html — conteúdo HTML válido, validade formal recomendada.
6. **BA** sem cobertura de trânsito (documento FORA_DO_ESCOPO).
7. Origem de todas as URLs não verificada ao vivo (orçamento de execução) — para auditoria online futura.

## 14.9 Conclusão

> **O acervo documental oficial disponível para reconstrução da base jurídica está suficientemente inventariado para encerrar a Fase 8?**

**Sim, com ressalvas.** O acervo físico recuperável foi integralmente inventariado, validado, hasheado e reconciliado (75 arquivos/65 documentos válidos). A infraestrutura de coleta está provada e fechada. Porém, **7 UFs permanecem sem evidência documental** por bloqueio de infraestrutura externa, e **13 CETRANs** seguem inacessíveis.

> **Quais lacunas permanecem abertas para etapas futuras?**

UFs bloqueadas (DF, MA, MT, PE, RN, RO, SE), CETRANs sem DNS, CTB PDF, defesa prévia AC, verificação online de origens e avaliação de cobertura jurídica por UF (etapa posterior e distinta da coleta). A ingestão jurídica (RAG) é etapa posterior, fora da Fase 8.

**Fase 8: encerrada operacionalmente — NÃO declarada cobertura nacional completa.**