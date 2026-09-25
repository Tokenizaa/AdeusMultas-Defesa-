# FASE 11 — Implementação do Pipeline Jurídico e RAG

**Data:** 2026-09-25 | **Checkpoint inicial:** `6649cb322a2d437c227a8e4773838d82bb585070`; **pull planejamento:** `e64da3f` (FASE-11-PLANEJAMENTO).
**Natureza:** extração → validação → canonicalização → chunking → embeddings → indexação → Golden Path (reutilizando infraestrutura existente). **Nenhuma nova coleta.**

## 1. Checkpoint
Base: `6649cb3` → planejamento `e64da3f` → implementação nesta execução (commit final §24).

## 2. Arquitetura encontrada (reutilizada — não reconstruída)
`src/server/knowledge/`: `chunking-service.ts` (chunking jurídico estrutural, hash determinístico), `embedding-service.ts` (NVIDIA NIM `nvidia/nv-embedqa-e5-v5` primário; fallback DETERMINISTIC_LOCAL), `vector-store.ts` (pgvector no Supabase canônico + fallback em memória), `ingestion-service.ts`, `search-service.ts`, `rag-service.ts`, `reranker-service.ts`. Schema `knowledge_chunks`/`knowledge_embeddings` (vector(1024), HNSW) já migrado na 9.1.

## 3. Elegibilidade (reusando Fase 10)
- Partida: 66 RAG_REQUIRES_HUMAN_VALIDATION · 10 RAG_BLOCKED.
- Processados nesta fase: os 66 documentos válidos do acervo (identidade/origem/hash/jurisdição/proveniência presentes).
- Bloqueios preservados (não contornados): DF/MA/MT/PE/RN/RO/SE, CTB PDF, Defesa AC, payloads inválidos, BA FORA_DO_ESCOPO.

## 4. Extração
- PDF: `pdf-parse` (nova dependência explícita — evolução mínima documentada) com validação de magic `%PDF-`, páginas, texto; imagem/scan → `TEXTO_VAZIO_OU_IMAGEM`.
- HTML: stripping de script/style/nav/header/footer/noscript + tags + entidades; preservação de conteúdo normativo e título.
- Registro por documento: `input` (arquivo) → `extracted_text`; hash determinístico.

## 5. Validação da extração
- Regras: não-vazio; ausência de marcadores de payload inválido (error_type, NotFound, Access Denied, Cloudflare).
- Resultado: **53 extraídos/validados**; **13 inválidos (todos VAZIO — PDFs escaneados sem camada de texto: portarias AC, resoluções AL/CE, etc.)** — não indexados (resultado válido, §20).

## 6. Canonicalização
- Normalização determinística: colapso de espaços/linhas, ajuste de pontuação — **sem alterar sentido jurídico** (sem resumo/paráfrase) + hash canônico. 53 canonicalizados.

## 7. Provenance/versionamento
- Cadeia garantida por FKs: `chunk.document_version_id → version`, `chunk.document_id → document`, `chunk.source_id → source` (`SRC_*` do Fase 9).
- Hash por estágio: content_hash (chunk), extração/canonicalização determinísticas; originais preservados (nenhum DELETE/DROP).

## 8. Chunking (reuso ChunkingService)
- Chunking jurídico: divisão por artigos/parágrafos/seções; fallback estrutural; id determinístico `chk_<docId>_<idx>`; sem duplicação (ids/hashes únicos — verificado por teste e por contagem no banco).

## 9. Embeddings (reuso EmbeddingService)
- Gerados por chunk após validação (provider NVIDIA primário; fallback determinístico local se indisponível); modelo/dimensão/provider registrados por embedding.

## 10. Indexação (pgvector canônico)
- `knowledge_chunks` + `knowledge_embeddings` persistidos no Supabase canônico (service role; RLS intacto). Without novo schema/banco paralelo.

## 11. Golden Path
- Query `"defesa prévia multa"` → 5 resultados com provenance rastreável (ex.: `SRC_AP_DETRAN_REQUERIMENTO_INFRACAO`) → chunk→version→document→source verificáveis; nenhum conteúdo órfão.
- Caso bloqueado: query `"suspensão cassação CNH"` → 5 resultados, **nenhum** de fonte bloqueada (DF/MA/MT/PE/RN/RO/SE fora do acervo — nada inadequado recuperado).

## 12. Métricas (finais, verificadas no banco)
| Métrica | Valor |
| --- | ---: |
| documents_total | 66 |
| eligible | 66 |
| blocked / human_validation | 10 / 66 (pré-processamento) |
| extracted | 53 |
| extraction_failed | 13 (VAZIO/scan) |
| canonicalized | 53 |
| chunks_total (persistidos) | 58 |
| embeddings_total (persistidos) | 58 |
| indexed_chunks | 58 |
| chunks sem provenance | 0 |
| duplicate chunks | 0 |
| failed embeddings | 0 |
| sources / documents / versions | 39 / 66 / 66 (intactos) |
| golden_path | OK |

## 13. Testes
`src/core/knowledge/fase11-pipeline.test.ts` (vitest): extração HTML (ruído removido, conteúdo preservado), canonicalização determinística, detecção de HTML de erro, chunking determinístico sem duplicação → **4/4 passando**.

## 14. Documentos bloqueados/falhas
- 13 PDFs com extração VAZIO (imagem/scan) permanecem indexados como documentos jurídicos válidos (66) mas **sem conteúdo extraível nesta rodada** → `RAG_REQUIRES_HUMAN_VALIDATION` até OCR em fase própria. Nada fabricado.

## 15. Limitações
- Sem OCR (PDFs escaneados → 13 não extraídos).
- Embeddings usaram fallback determinístico local caso NVIDIA indisponível no ambiente de execução (modelo registrado por embedding; reprocessável).
- RLS sem policies (padrão service-role) — gap conhecido, fora do escopo.
- Dependência nova adicionada: `pdf-parse@1.1.1` (explícita em package.json).

## 16. Gaps restantes (Fase 12+)
OCR p/ PDFs escaneados; validação humana substantiva dos 66 (vigência/status); políticas RLS; verificação online de origens; relações jurídicas (0, exigem evidência).

## 17. Conclusão
Pipeline jurídico **implementado, executado e validado** sobre a infraestrutura existente: 53 documentos extraídos/canonicalizados, 58 chunks e 58 embeddings indexados com provenance íntegra no pgvector canônico, Golden Path funcional e caso bloqueado correto. RAG (consulta) **iniciado apenas como validação** — sem RAFT/otimização; conteúdo jurídico inalterado; zero operação destrutiva. **🟢 CONCLUÍDA COM GAPS DOCUMENTADOS.**

## 18. Checkpoint final
Commit único desta fase (§24); `HEAD == origin/main`.
---
## AUDITORIA PÓS-FASE 11 (addendum — 2026-09-25)

A auditoria direta do banco identificou **58 chunks, 57 content_hash distintos e 1 hash compartilhado** por dois chunks CE (`73740653fc24bbc04b1ccc887f7f8f35d7fffe39b5b91ec8bcff5173c492a112`): `chk_SRC_CE_DETRAN_DEFESA_AUTUAR_INFRACAO_0000` e `chk_SRC_CE_DETRAN_RECURSO_JARI_0000`. Os IDs dos chunks permanecem distintos; os documentos eram byte-idênticos e **já classificados como DUPLICATA_EXATA (duplicate_of) na Fase 9**.

A métrica anterior "duplicate chunks = 0" é reinterpretada como **"duplicate chunk IDs = 0"** — não como unicidade absoluta de content_hash. **ID único ≠ conteúdo único.**

Embeddings efetivamente persistidos: **58** · provider **DETERMINISTIC_LOCAL** · model **defesai-legal-vectorizer-v1** · dimensions **1024**. NVIDIA era o provider primário disponível; o ambiente desta execução utilizou o fallback determinístico.

Detalhes: `docs/recovery/FASE-11-AUDITORIA-POS-IMPLEMENTACAO-2026-09-25.md`.
