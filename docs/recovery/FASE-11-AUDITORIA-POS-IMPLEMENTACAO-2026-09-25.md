# FASE 11 — Auditoria Pós-Implementação

**Data:** 2026-09-25 | **Checkpoint:** `5cc22b2d8f46b507d3a8f746b3f81b9baf9f1cff`
**Natureza:** auditoria dos gaps pós-Fase 11 — somente leitura/documentação. Sem DELETE/DROP/TRUNCATE/RESET, sem reprocessamento, sem OCR, sem alteração RLS/provider.

## 1. Checkpoint
`5cc22b2d8f46b507d3a8f746b3f81b9baf9f1cff` = `HEAD` = `origin/main` ✓

## 2. Estado do banco (verificado por queries)
39 sources · 66 documents · 66 versions · **58 chunks** · **58 embeddings** · 0 relations · 7/7 RLS ON · sem_versao = 0 · órfãos (chunks/embeddings/versions) = 0.

## 3. Integridade
- Chunk IDs: **58 únicos** (count = distinct id) ✓
- Embedding IDs: **58 únicos** ✓
- Chunks órfãos: 0 · Embeddings órfãos: 0 · Versions órfãs: 0 ✓
- Provenance íntegra: `chunk → version → document → source` (join sem NULLs) ✓

## 4. Hash duplicado (CE)
- `content_hash = 73740653fc24bbc04b1ccc887f7f8f35d7fffe39b5b91ec8bcff5173c492a112`, 2 ocorrências:
  - `chk_SRC_CE_DETRAN_DEFESA_AUTUAR_INFRACAO_0000` (document `SRC_CE_DETRAN_DEFESA_AUTUAR_INFRACAO`)
  - `chk_SRC_CE_DETRAN_RECURSO_JARI_0000` (document `SRC_CE_DETRAN_RECURSO_JARI`, metadata `duplicate_of → SRC_CE_DETRAN_DEFESA_AUTUAR_INFRACAO`)
- Evidência: arquivos físicos byte-idênticos (ambos `ebaded0d…`, 2009 B); conteúdo extraído idêntico; mesma source (DETRAN-CE); títulos diferentes (identidade de registro distinta na Fase 9).
- **Classificação: Caso B — um documento registrado como duplicata exata do outro.** Já classificada na Fase 9 (`DUPLICATA_EXATA` no inventário + `duplicate_of` em metadata). Nenhuma alteração de banco; ambos preservados; nenhuma consolidação nesta rodada.
- Métrica corrigida: **duplicate chunk IDs = 0** · **content_hash compartilhado = 1** (entre 2 documentos CE, um marcado `duplicate_of`) · orphan chunks = 0. **ID único ≠ conteúdo único.**

## 5. Embeddings (provider efetivo)
```
provider   = DETERMINISTIC_LOCAL
model      = defesai-legal-vectorizer-v1
dimensions = 1024
count      = 58
```
Provider primário **NVIDIA** (nvidia/nv-embedqa-e5-v5) estava disponível; o ambiente desta execução utilizou o **fallback determinístico local**. Documentação Fase 11 atualizada (addendum). Embeddings não substituídos nem reprocessados.

## 6. Golden Path
- Query "defesa prévia multa": **in-process pós-ingestão → OK (5 resultados, provenance `SRC_AP_DETRAN_REQUERIMENTO_INFRACAO`)** — conforme Fase 11.
- Query "suspensão cassação CNH": 5 resultados, **nenhum** de fonte bloqueada (DF/MA/MT/PE/RN/RO/SE fora do acervo) ✓.
- **Limitação registrada:** em processo novo (retrieval por leitura no banco), `searchService` retorna 0 — a função RPC `match_knowledge_chunks` **não existe** no schema; sem ela o retrieval cross-process não consulta pgvector. É **gap documental/infra** (criar RPC = fora do escopo desta auditoria; registrado para etapa própria). Sem nova função agora.

## 7. Testes
`npx vitest run src/core/knowledge/fase11-pipeline.test.ts` → **6/6 passed** (novos: IDs únicos com content_hash compartilhado entre docs distintos; provenance íntegra).

## 8. Gaps remanescentes
- RPC `match_knowledge_chunks` ausente (retrieval cross-process via pgvector pendente).
- OCR dos 13 PDFs scan (extração VAZIO — não indexados).
- Validação humana de vigência/status jurídico (66).
- RLS sem policies (padrão service-role).
- Relações jurídicas (0 — exigem evidência).
- Verificação online das origens.

## 9. Conclusão
Sem inconsistência não resolvida de integridade nos dados; único ponto de atenção (hash compartilhado CE) já era classificada como duplicata exata na Fase 9 e preservada. **FASE 11 — AUDITADA E FECHADA** (com os gaps acima documentados). Fase 12 não iniciada.