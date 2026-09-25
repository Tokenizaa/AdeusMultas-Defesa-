# FASE 9 — Implementação da Normalização Jurídica

**Data:** 2026-09-24 | **Commit-base:** `3bcb12b7a80743229d39d0fdee0604d3c435600c`
**Natureza:** implementação completa da normalização do acervo Fase 8 no modelo jurídico — reconciliação de metadados, lineage, versionamento, temporalidade, relações e contrato de ingestão. **RAG/embeddings/chunks NÃO executados.**

## 1. Estado inicial

- Schema versionado na Fase 9.1 (`knowledge_*` + `knowledge_document_relations`), tabelas vazias (0 linhas), RLS ON.
- Acervo Fase 8: 75 arquivos físicos / 65 válidos / 3 recuperados (CONTRAN 796, Memo 753 AM, + 2 formulários AP — recuperação AP nesta fase de coleta) / 1 duplicata CE / payloads de falha preservados em disco.

## 2. Alterações realizadas

População idempotente (chaves determinísticas `SRC_*` do inventário; `ON CONFLICT (id) DO NOTHING`) via service role (proteção RLS mantida; **nenhuma policy aberta**):

| Tabela | Inseridos | Critério |
| --- | ---: | --- |
| knowledge_sources | 39 | 9 federal + 30 estadual (fontes com ≥1 documento válido no acervo) |
| knowledge_documents | 66 | 63 COLLECTED + 2 RECUPERADO + 1 DUPLICATA_EXATA (evidenciados no inventário) |
| knowledge_document_versions | 66 | 1:1 com documents; content_hash = SHA-256 do arquivo físico |
| knowledge_document_relations | 0 | **Nenhuma relação criada — ausência de evidência (regra §6/§14)** |
| knowledge_chunks / knowledge_embeddings | 0 | intactos (fora do escopo) |

Ponteiro `documents.current_version_id` preenchido (0 documentos sem versão).

## 3. Canonicalização

- **Identidade de documento** = ID canônico do inventário (`SRC_*`), garantindo: mesmo documento em URLs diferentes conserva identidade (hash ≠ identidade).
- **Identidade de versão** = `<document_id>_v1` (1ª versão do acervo); versões futuras incrementarão `_v2…`.
- **Exclusões intencionais (não são documentos jurídicos):** 6 payloads federais (NotFound/HTML) + `ctb.pdf` + `AC/defesa_previa_pf.pdf` + `AM/memo_753_2026_opttran_detran.pdf` (falha) + `BA/decreto…` (FORA_DO_ESCOPO) — 10 arquivos mantidos **somente como evidência em disco**, fora das tabelas jurídicas.

## 4. Lineage (proveniência)

Cadeia preservada por `metadata` em documents/versions: `fase8_inventory_id`, `collection_state`, `mime_hint`, `retrieved_at`, `origin_url`, `content_state`, `legal_status`, `effective_state`. Rastreabilidade: arquivo físico ↔ inventário Fase 8 ↔ registro jurídico (via `fase8_inventory_id`).

## 5. Versionamento

- 1 versão (`v1.0`) por documento do acervo; `content_hash` = SHA-256 físico; `content` NÃO armazenado (marcado `content_state: NOT_STORED_FASE9` — extração de conteúdo pertence à camada de ingestão, não a esta normalização). Nada de conteúdo fabricado.

## 6. Temporalidade

- `published_at`/`effective_from`/`effective_until` = **NULL** em todas (não comprovadas) — `NULL` ≠ "não vigente"; estados explícitos em metadata: `publication_date_known:false`, `effective_state:"UNKNOWN"`, `legal_status:"UNKNOWN"`. Nenhuma vigência inferida.

## 7. Relações normativas

- `knowledge_document_relations` criada na 9.1 com CHECK (7 tipos) + constraints (FK RESTRICT, no-self, status) e **0 linhas** — regra §14: relação sem evidência não é criada. Mecanismo pronto; população exige identificação documental posterior.

## 8. Reconciliação

- 66 documentos reconciliados com evidência do inventário; **0 UNRESOLVED** (candidatação exigiu identidade suficiente: fonte+hash+jurisdição+origem).
- CFB: `fase8_inventory_id` presente em todos os registros.

## 9. Métricas (diretamente do banco)

| Métrica | Valor |
| --- | ---: |
| sources | 39 |
| documents | 66 |
| versions | 66 |
| relations | 0 |
| documents recuperados (metadata) | 2 (CONTRAN 796, Memo 753 AM) — além dos 2 AP como COLLECTED |
| duplicata registrada (duplicate_of) | 1 (SRC_CE_DETRAN_RECURSO_JARI → SRC_CE_DETRAN_DEFESA_AUTUAR_INFRACAO) |
| documentos sem versão | 0 |
| chunks / embeddings | 0 / 0 |
| vigência UNKNOWN | 66/66 |
| jurisdição UNKNOWN | 0 (BR_FEDERAL ou UF explícita) |
| sem relação normativa | 66/66 |
| candidatos estruturais ao RAG | 66 (metadados/hash/jurisdição/proveniência presentes; conteúdo ainda não extraído) |
| bloqueados p/ RAG | 10 (9 payloads de falha + 1 fora do escopo BA) |

## 10. Inconsistências

- Nenhuma divergência de hash (inventário ↔ físico ↔ versions).
- 0 arquivos sem registro; 0 registros sem arquivo; 0 versões sem origem.
- Documentos "portal/SPA" (ex. PA, SP portal) são COLLECTED válidos (evidência de página) — entram como documentos com `content_state: NOT_STORED`; utilidade para RAG a decidir por conteúdo na fase de ingestão.

## 11. Documentos unresolved

- **0** documentos válidos unresolved. UFs bloqueadas (DF, MA, MT, PE, RN, RO, SE) não geraram documento (0) — permanecem como lacuna de coleta, não de reconciliação.

## 12. Gaps

1. Conteúdo textual dos 66 documentos não armazenado (próxima camada).
2. Vigência/legal_status UNKNOWN (66/66) — exige validação jurídica (Fase 10).
3. Relações normativas 0 — exigem análise documental com evidência.
4. 7 UFs + 13 CETRANs sem coleta; 2 documentos (CTB PDF, Defesa AC) com recuperação bloqueada.
5. RLS sem policies (padrão service-role, gap registrado na 9.1).

## 13. Contrato de ingestão RAG (futuro)

**Candidato mínimo ao RAG** (dimensional): source identificada + document identificado + version identificada + `content_hash` + arquivo válido (magic) + jurisdiction conhecida + provenance (`retrieved_at`, `origin_url`) + `collection_state ∈ {COLLECTED, RECUPERADO}` + conteúdo extraído/canonicalizado.
**Excluído:** payload inválido (`PAYLOAD_INVALIDO`/`NOT_FOUND`), fonte desconhecida, hash ausente, documento unresolved, fora do escopo (`FORA_DO_ESCOPO`), conteúdo sem proveniência.
**Não bloqueia por si só:** vigência/legal_status UNKNOWN **quando a consulta não exigir vigência** (a modulação será aplicada na camada de consulta; documento staying candidato com `legal_status: UNKNOWN`, gated por validação quando a cláusula exigir).

## 14. Validações

- Contagens conferidas via SQL (seção 9); idempotência garantida (`ON CONFLICT DO NOTHING` — re-execução não duplica).
- Nenhuma operação destrutiva; nenhuma policy criada; nenhum chunk/embedding; nenhum arquivo físico alterado.

## 15. Limitações

- 66 documentos têm metadados completos, mas **conteúdo não extraído** (limite desta fase: metadados/lineage; extração = próxima camada).
- Fontes bloqueadas não reconciliadas por inexistência de documento.
- `source_type` mapeado heuristicamente a partir do tipo documental do inventário (valores LAW/REGULATION/GOVERNMENT/JURISPRUDENCE/TECHNICAL/INTERNAL/MANUAL) — revisão opcional na validação jurídica.

## 16. Conclusão

A Fase 9 normalizou o acervo recuperável em um modelo jurídico versionado e auditável (39 fontes / 66 documentos / 66 versões com hash, jurisdição e proveniência; 0 relações inventadas; 0 dados inferidos), deixando a base **estruturalmente pronta para a futura ingestão RAG** (extração de conteúdo, chunks, embeddings — fora desta fase). **Implementação: CONCLUÍDA COM GAPS DOCUMENTADOS.** Próxima: Fase 10 (validação jurídica/cobertura) — não iniciada.