# FASE 9 — Roadmap de Implementação (Normalização Jurídica)

**Data:** 2026-09-24 | **Natureza:** roadmap da futura implementação da Fase 9 — **não iniciada nesta execução**.

> **[ESTADO HISTÓRICO ANTERIOR]** — Este documento foi criado na execução de especificação (checkpoint `c4ea4a7`). A Fase 9 foi **implementada posteriormente como pacote único** (checkpoint `6649cb3`); ver seção STATUS DE IMPLEMENTAÇÃO e `FASE-9-IMPLEMENTACAO-NORMALIZACAO-2026-09-24.md`. Os trechos abaixo descrevem o momento da especificação.
**Depende de:** `FASE-9-ESPECIFICACAO-NORMALIZACAO-JURIDICA-2026-09-24.md`.

## Fase 9.1 — Modelo e Migration

- **Objetivo:** fechar o drift de migrations das 6 tabelas `knowledge_*` (existem no DB, não versionadas) e aditar a tabela de relações.
- **Escopo:** migrations idempotentes de baseline (`knowledge_sources`, `knowledge_documents`, `knowledge_document_versions`, `knowledge_chunks`, `knowledge_embeddings`, `knowledge_ingestions`), criação de `knowledge_document_relations` (aditiva), verificação das policies RLS das tabelas knowledge, decisões D-6 (updated_at em versions; FK de ingestions).
- **Entradas:** tabelas auditadas (0 linhas), schema descrito nesta execução, migrations existentes.
- **Saídas:** migrations versionadas no repo; policies RLS mapeadas e documentadas.
- **Validações:** `supabase db diff` limpa; rebuild com migrations do zero funciona; RLS habilitado em todas.
- **Critérios de conclusão:** `supabase reset` + `db push` reproduz as 6+1 tabelas; nenhuma alteração destrutiva; policies documentadas.

## Fase 9.2 — Canonicalização e Lineage

- **Objetivo:** estabelecer o formato canônico do content (normalização de texto) e o lineage source→document→version→arquivo→hash→URL→data.
- **Escopo:** reuso de `content-normalizer.ts` e `hash-generator.ts` (calculateSha256Sync); especificar formato de content (texto normal + marcadores de cabeçalho/norma) sem chunking ainda.
- **Entradas:** acervo físico Fase 8; inventário; normalizer/hash existentes.
- **Saídas:** pipeline de canonicalização documentado; regra de lineage.
- **Validações:** hash canônico estável por arquivo; lineage reversível (arquivo→registro→inventário).
- **Critérios de conclusão:** 100% dos 65 válidos passíveis de canonicalização; lineage auditável por documento.

## Fase 9.3 — Versionamento e Temporalidade

- **Objetivo:** modelar versions + estados temporais (published_at, effective_from/until, retrieved_at) com regra de NEVER-inferencia.
- **Escopo:** inserção de versions por documento; estados `VIGENTE/VIGENCIA_DESCONHECIDA/…`; two-version lineage para recuperados (invalida+recuperada).
- **Entradas:** spec §10/§16; inventário com datas de coleta; arquivos recuperados.
- **Saídas:** documento de estado temporal; primeiros registros-piloto (ex. CONTRAN 796/2020).
- **Validações:** vigência default = DESCONHECIDA; recuperados com 2 versions; nenhum NULL como "não vigente".
- **Critérios de conclusão:** piloto completo para federal + 2 estaduais; regras auditáveis.

## Fase 9.4 — Reconciliação do Acervo

- **Objetivo:** popular a base canônica a partir do inventário físico (75 arquivos/65 válidos), preservando evidências de falha e bloqueios.
- **Escopo:** migração guiada por inventário (inventory_id ↔ source/document/version); registro de collection_state (COLLECTED/RECUPERADO/PAYLOAD_INVALIDO/RECUPERACAO_BLOQUEADA); duplicatas via duplicate_of; fora-do-escopo (BA) sem entrada RAG.
- **Entradas:** inventário Fase 8, arquivos físicos, spec §5/§12/§17/§18.
- **Saídas:** base canônica populada; relatório de reconciliação.
- **Validações:** contagem da base = inventário (65 válidos + evidências); zero payload no caminho RAG; rastreabilidade por inventory_id.
- **Critérios de conclusão:** reconciliação 100% do acervo; divergências registradas como pendências.

## Fase 9.5 — Validação e Critérios de Ingestão

- **Objetivo:** validar a base e fixar o contrato de ingestão (Fase 11) sem executá-la.
- **Escopo:** checagens de aceitação da spec §20; classificação de confiança por dimensão; mapeamento document↔procedure (metadata, só com evidência); lista de bloqueios e validação-humana.
- **Entradas:** base populada (9.4), spec §12/§15/§19/§20.
- **Saídas:** checklist de aceitação preenchido; contrato de ingestão pronto; relatório de validação.
- **Validações:** importar apenas o que satisfaz o contrato (simulação em staging); não contaminar conteúdo jurídico com payloads.
- **Critérios de conclusão:** checklist 100% atendido; contrato aprovado; Fase 9 declarável CONCLUÍDA (implementação) — liberando Fase 10/11 (ingestão RAG).

---
**Nota:** quantidade de fases mantida em 5 (modelo/migration → canonicalização/lineage → versionamento/temporalidade → reconciliação → validação/ingestão) conforme auditoria; evitada fragmentação em micro-fases.
## STATUS DE IMPLEMENTAÇÃO (2026-09-24)

| Fase | Status | Evidência |
| --- | --- | --- |
| Fase 9.1 — Modelo e Migration | ✅ CONCLUÍDA | migration `20260924233015_fase_9_1_knowledge_schema.sql` + relations criada |
| Fase 9.2 — Canonicalização e lineage | ✅ CONCLUÍDA (parcial por desenho) | IDs `SRC_*` → documents/versions; metadata de proveniência; content NÃO extraído (decisão: camada de ingestão) |
| Fase 9.3 — Versionamento e temporalidade | ✅ CONCLUÍDA | 66 versions (v1.0, content_hash); temporalidade UNKNOWN explícita |
| Fase 9.4 — Reconciliação do acervo | ✅ CONCLUÍDA | 39 sources / 66 docs / 66 versions; 0 unresolved; duplicata CE marcada; payloads excluídos |
| Fase 9.5 — Validação e contrato de ingestão | ✅ CONCLUÍDA | critérios §20 satisfeitos; contrato dimensional definido; chunks/embeddings intactos |

Relações (9.5/metadata): mecanismo pronto, **0 relações** — confirmação documental pendente (não inventar). Relatório: `FASE-9-IMPLEMENTACAO-NORMALIZACAO-2026-09-24.md`.

**Conclusão:** Fase 9 implementada como pacote único — **CONCLUÍDA COM GAPS DOCUMENTADOS**.
