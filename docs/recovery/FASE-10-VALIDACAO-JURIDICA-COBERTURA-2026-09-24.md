# FASE 10 — Validação Jurídica e Cobertura Nacional

**Data:** 2026-09-24 | **Checkpoint inicial:** `6649cb322a2d437c227a8e4773838d82bb585070`
**Natureza:** validação documentada da base normalizada (39/66/66) + matriz de cobertura + fechamento dos gaps de reprodutibilidade e coerência documental. **RAG/embeddings/chunks não iniciados.**

## 1. Objetivo
Verificar, com rastreabilidade, o que está confirmado, parcial, bloqueado ou pendente de validação humana no acervo normalizado; fechar a lacuna de reprodutibilidade da carga; corrigir documentação histórica de forma aditiva.

## 2. Checkpoint inicial
`6649cb322a2d437c227a8e4773838d82bb585070` (main, Fase 9, working tree limpa).

## 3. Escopo
Somente validação/auditoria/documentação + artefato de reprodutibilidade. Proibido: coleta, RAG, embeddings, chunks, indexação, DROP/DELETE/TRUNCATE, políticas públicas, novas migrations.

## 4. Metodologia
1. Sincronizar checkpoint; 2. confirmar estado real do banco (queries); 3. validar integridade físico↔hash↔registro (amostra completa dos recuperados + contagens); 4. construir matriz de validação por dimensão (§6) e matriz nacional de cobertura (§9); 5. classificar RAG por documento (§14); 6. versionar artefato determinístico (Gap 1); 7. corrigir documentação aditiva (Gap 2); 8. report.

## 5. População dos 66 documentos
- sources=**39** (9 BR_FEDERAL + 19 UFs com documento) | documents=**66** | versions=**66** | relations=**0** | chunks=**0** | embeddings=**0**.
- `current_version_id`: 66/66 íntegro (1 documento → 1 versão; `sem_versao=0`).
- RLS: **7/7 ON**; políticas públicas: 0 criadas nesta fase; rows deletadas: 0; hashes alterados: 0; inventory_ids perdidos: 0.

## 6. Matriz de validação (dimensões por documento)
Regras globais (todos os 66):
- `jurisdiction`: CONFIRMED (BR_FEDERAL ou UF explícita) — 66/66.
- `authority`/`source_id`/`title`/`origin_url`/`content_hash`/`lineage`: CONFIRMED via inventário Fase 8 (fase8_inventory_id).
- `document_number`: PARTIALLY_CONFIRMED (extraível do título para resoluções/portarias/decretos; ausente p/ páginas/portais) — sinalizado, sem inferência.
- `publication_date`: UNKNOWN (não comprovada; `publication_date_known:false`).
- `effective_from`/`effective_until`: UNKNOWN (não inferidas).
- `legal_status`: UNKNOWN (66/66) — exige validação humana substantiva (Fase de validação jurídica própria).
- `authenticity` (arquivo): CONFIRMED para 66 documentos válidos (magic/file já auditados na Fase 8 — VALIDO/VALIDO_COM_ALERTA); 3 alertas MIME (prf.html, stj.html, RJ/formularios) permanecem PARTIALLY_CONFIRMED (conteúdo HTML válido, MIME JS).
- `traffic_relevance`: CONFIRMED para 65; **OUT_OF_SCOPE para 0** — BA não entra (ver §11); 0 documentos do acervo jurídico com irrelevância conhecida além de BA (excluída).
- `procedure_coverage`: ver §12.
- `relations`: UNKNOWN/ausentes — 0 relações (sem evidência; correto).
- `collection_state`: CONFIRMED (COLLECTED/RECUPERADO/DUPLICATA_EXATA).
- `content_state`: NOT_STORED (extração = camada de ingestão).

## 7. Matriz nacional de cobertura

### Federal
| Fonte | Acesso | Documentos | Cobertura | Procedimentos sustentáveis |
| --- | --- | --- | --- | --- |
| Planalto (CTB) | OK | 1 (html) | PARCIAL (CTB disponível; PDF não publicado) | base normativa |
| SENATRAN/CONTRAN | OK | 2 (compilação + Res 796/2020 recup.) | PARCIAL | normas CONTRAN |
| PRF/DNIT/ANTT | OK | 3 (portais recursos) | PARCIAL (portais, não atos) | recurso/defesa (canal) |
| INMETRO | OK | 1 (consulta radares) | PARCIAL (ferramenta) | defesa técnica |
| DOU | OK | 1 (diário oficial) | PARCIAL (canal) | publicação |
| STJ | OK | 1 (jurisprudência) | PARCIAL (teses) | argumentos |
| **Federal** | | **10 docs válidos** | **PARCIAL** | |

### 27 UFs
| UF | Fonte(s) c/ doc | Docs válidos | Acesso | Cobertura documental |
| --- | --- | ---: | --- | --- |
| AC | DETRAN | 3 | parcial | PARCIAL (CETRAN DNS) |
| AL | CETRAN | 3 | OK | CONFIRMADA (resoluções) |
| AM | DETRAN | 5 | parcial | PARCIAL (CETRAN DNS; +1 recup.) |
| AP | DETRAN | 2 | parcial | PARCIAL (CETRAN DNS) |
| BA | — | 0 | — | FORA_DO_ESCOPO_TRANSITO |
| CE | DETRAN+CETRAN | 8 | OK | CONFIRMADA (1 duplicata) |
| DF | — | 0 | BLOQUEADO | BLOQUEADA_POR_ACESSO |
| ES | DETRAN+CETRAN | 2 | OK | CONFIRMADA |
| GO | DETRAN+CETRAN | 2 | OK | CONFIRMADA |
| MA | — | 0 | BLOQUEADO | BLOQUEADA_POR_ACESSO |
| MT | — | 0 | BLOQUEADO | BLOQUEADA_POR_ACESSO |
| MS | DETRAN+CETRAN | 2 | OK | CONFIRMADA |
| MG | DETRAN | 1 | parcial | PARCIAL (CETRAN timeout) |
| PA | DETRAN | 1 | parcial | PARCIAL (portal SPA; CETRAN DNS) |
| PB | DETRAN+CETRAN | 2 | OK | CONFIRMADA |
| PE | — | 0 | BLOQUEADO | BLOQUEADA_POR_ACESSO |
| PI | DETRAN+CETRAN | 4 | OK | CONFIRMADA (via portal) |
| PR | DETRAN+CETRAN | 3 | OK | CONFIRMADA |
| RJ | DETRAN+CETRAN | 3 | OK | CONFIRMADA (1 alerta MIME) |
| RN | — | 0 | BLOQUEADO | BLOQUEADA_POR_ACESSO |
| RO | — | 0 | BLOQUEADO | BLOQUEADA_POR_ACESSO |
| RR | DETRAN | 3 | parcial | PARCIAL (CETRAN DNS) |
| RS | DETRAN+CETRAN | 2 | OK | CONFIRMADA |
| SC | DETRAN+CETRAN | 3 | OK | CONFIRMADA |
| SE | — | 0 | BLOQUEADO | BLOQUEADA_POR_ACESSO |
| SP | DETRAN+CETRAN | 3 | OK | CONFIRMADA |
| TO | DETRAN | 3 | parcial | PARCIAL (CETRAN DNS) |

Totais: 12 UFs CONFIRMADA · 7 PARCIAL (AC, AM, AP, MG, PA, RR, TO) · 7 BLOQUEADA_POR_ACESSO (DF, MA, MT, PE, RN, RO, SE) · 1 FORA_DO_ESCOPO (BA).

## 8. Situação dos 27 estados
Resumo na tabela anterior. 19 UFs com ≥1 documento válido; 7 bloqueadas; 1 fora do escopo. **Nenhuma UF declarada COBERTURA JURÍDICA COMPLETA** — cobertura documental ≠ cobertura normativa (vigência/status jurídico UNKNOWN).

## 9. Federal
10 documentos válidos (9 COLLECTED + 1 RECUPERADO). Payloads de falha federais (6) preservados como evidência, fora do modelo jurídico.

## 10. CETRANs
Acessíveis/coletados: AL, CE, ES, GO, MS, PB, PI, PR, RJ, RS, SC, SP (12). Via portal/arquivo: PI, MS (sejusp), RJ (http). **Bloqueados por DNS/indisponibilidade: AC, AM, AP, DF, MA, MG, MT, PA, PE, RN, RO, RR, SE, TO (14)** + MT timeout. Bloqueios preservados como BLOQUEADA_POR_ACESSO.

## 11. CONTRANDIFE
Sem objeto próprio no acervo Fase 8/Fase 9 (não consta nas fontes coletadas): **SEM_EVIDENCIA**. Registrado como lacuna (fonte não perseguida nesta fase).

## 12. Procedimentos (suporte documental)
| Procedimento | Evidência no acervo | Classificação |
| --- | --- | --- |
| Defesa Prévia | formulários/páginas AC(bloqueado), CE, GO, MG, PB, PI, PR, RR, RS, SC, SP, TO, RJ(forms), ES(recurso) | PARTIALLY_CONFIRMED (nacional: parcial; por UF conforme tabela) |
| JARI | CE (recurso jari, duplicata), RR, PR (recursos), PA (portal JARI implícito) | PARTIALLY_CONFIRMED |
| CETRAN (recurso) | RR (recurso ao CETRAN), RJ (resoluções), SP (legislação/atos), PR/RS/SC resoluções | PARTIALLY_CONFIRMED |
| Suspenção da CNH | sem documento específico no acervo | UNKNOWN |
| Cassação da CNH | sem documento específico | UNKNOWN |
| Indicação de real condutor | formulário RR (recurso autuação), CNH cidadã não coberta | UNKNOWN/PARTIALLY_CONFIRMED (RR) |
| Conversão em advertência | sem documento específico | UNKNOWN |
Regra: **nenhum procedimento é declarado CONFIRMED nacionalmente**; evidência é pontual por UF. Template/regra de produto NÃO conta como evidência de cobertura.

## 13. Documentos recuperados
- CONTRAN 796/2020 — hash validado `5bc7bade…` (bate); origin_url nova; metadata recovered=true; versão original inválida preservada.
- Memo 753/2026 AM — hash validado `59b023ad…`; recovered=true; original inválido preservado.
- Formulários AP (2) — COLLECTED na recuperação AP (não marcados recovered; documentados como evidência da rodada bloqueadas).

## 14. Documentos inválidos preservados
`federal/contran_res_796_2020.pdf` (26B), `federal/ctb.pdf` (485B HTML), `states/AC/defesa_previa_pf.pdf`, `states/AM/memo_753_2026_opttran_detran.pdf` + 4 payloads NotFound federais — todos preservados em disco, **fora** de knowledge_documents (evidência de coleta, não conteúdo jurídico).

## 15. Relações jurídicas
`knowledge_document_relations` = **0** linhas. Nenhuma relação inventada (títulos/números/cobertura não geram relação sem evidência). Mecanismo pronto (CHECK 7 tipos, FK RESTRICT, no-self, status).

## 16. Classificação RAG (containment — sem iniciar RAG)
- **RAG_REQUIRES_HUMAN_VALIDATION: 66** — todos os documentos têm identidade/hash/origem/jurisdição válidas (estruturais), **mas** `content_state=NOT_STORED` (conteúdo não extraído) e `legal_status=UNKNOWN` — condicionam ingestão (extração de conteúdo + validação de vigência quando a consulta exigir).
- **RAG_BLOCKED: 10** — 9 payloads de falha + 1 fora do escopo (BA).
- RAG_ELIGIBLE imediato: **0** (nada é ingerível hoje; camada de ingestão futura).
- Proibido nesta fase: chunks/embeddings/vector/indexação/retrieval — não executados.

## 17. Reproducibilidade (Gap 1 — fechado)
Artefato versionado: **`supabase/recovery/FASE-9-RECONCILIACAO-DETERMINISTICA.sql`**
- Determinístico/idempotente (ON CONFLICT DO NOTHING), auditável, sem DELETE/DROP, sem policies.
- Reproduz `inventário Fase 8 → sources/documents/versions → hashes → lineage → metadata → 39/66/66` + ponteiro current_version + SELECT de validação.
- **Limitação documentada:** IDs canônicos e hashes derivam do inventário Fase 8 e dos arquivos físicos; reprodução 100% autônoma para carga idêntica exige esses insumos versionados (inventário: sim, no repo; arquivos físicos: sim, no repo — portanto reprodutível). Deve ser testado em banco de prova antes do canônico.

## 18. Validação Supabase
Verificado por query: 39/66/66; current_version integro 66/66; relations 0; chunks 0; embeddings 0; RLS 7/7 ON; sem_versao 0. Hashes dos recuperados conferidos em disco. Nenhuma alteração adicional ao banco nesta fase (somente leitura + artefato).

## 19. Segurança/RLS
7/7 RLS ON; 0 policies públicas criadas; padrão service-role preservado. Gaps de segurança (Fase 4) permanecem fora do escopo — registrado.

## 20. Limitações
- Vigência/status jurídico dos 66 UNKNOWN (não inferido) — validação jurídica substantiva é etapa própria.
- Cobertura por procedimento parcial; suspensão/cassação/conversão sem evidência direta.
- 1 CONTRANDIFE sem evidência (lacuna registrada).
- Conteúdo textual ainda não extraído (bloqueio deliberado da camada de ingestão).
- 3 alertas MIME mantidos (conteúdo válido).

## 21. Gaps restantes
1. Validação jurídica substantiva dos 66 (datas/vigência/status/revogação) — humana.
2. Extração de conteúdo + chunking/embeddings/indexação (Fase 11, bloqueada).
3. Fontes bloqueadas (7 UFs; 14 CETRANs; CTB PDF; Defesa AC) — coleta/recuperação futura.
4. CONTRANDIFE sem evidência.
5. RLS sem policies (gap conhecido, fora do escopo).
6. Relações normativas: exigem análise documental com evidência (0 hoje).

## 22. Conclusão
A base normalizada **39/66/66 é íntegra, rastreável e estruturalmente pronta**; cobertura nacional é **documental e parcial** (12 UFs confirmadas documentalmente, 7 parciais, 7 bloqueadas, BA fora do escopo), **não** confirmada como cobertura jurídica completa. Nenhuma inferência de vigência/status; nenhuma relação fabricada; RAG intacto (0 chunks/embeddings). Artefato de reprodutibilidade versionado; documentação histórica corrigida aditivamente (Gap 2). **FASE 10 — 🟢 CONCLUÍDA COM GAPS DOCUMENTADOS.**

## 23. Checkpoint final
`HEAD = origin/main` (SHA registrado no relatório final do agente / §commit).