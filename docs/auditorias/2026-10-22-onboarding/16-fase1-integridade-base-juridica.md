# Relatório de Fase 1 — Integridade e Diagnóstico da Base Jurídica

**Projeto:** DefesAi / AdeusMultas  
**Repositório:** `Tokenizaa/AdeusMultas-Defesa-`  
**Branch:** `main`  
**Plano referência:** `docs/auditorias/2026-10-22-onboarding/15-plano-correcao-base-juridica-cinco-fases.md`  
**Data:** 23/10/2026  
**Fase:** 1 — Integridade e Diagnóstico da Base Jurídica  
**Estado:** PASS  
**Escopo:** Somente leitura (consultas SQL ao Supabase). Nenhuma alteração de código, banco, migration, ingestão, reindexação ou deploy.

---

## 1. Resumo Executivo

A base de conhecimento jurídica persistida no Supabase (`llmxnpgjpxcvyrqjkfwb`, projeto "Defesai-AdeusMultas", região `sa-east-1`, PG 17.6.1.166) está **estruturalmente íntegra**:

- 0 órfãos em todas as 5 relações referenciais verificadas (chunks↔embeddings, documentos↔versões, versões↔documentos, chunks↔versões).
- 0 chunks sem `content_hash`; 0 embeddings nulos; 0 documentos sem versão atual; 0 documentos sem fonte.
- Consistência referencial: **PASS**.

No entanto, foram identificadas inconformidades relevantes para a qualidade da recuperação jurídica:

- **39/39 fontes sem URL** (`knowledge_sources.url` NULL) — impossibilita verificação da autoridade oficial de nível de fonte.
- **66/66 versões com `effective_from = NULL` e `effective_until = NULL`** — impossibilita validação de vigência temporal da norma na data da infração.
- **1 duplicação de `content_hash` em chunks** (2 registros do CE com conteúdo idêntico).
- **1 duplicação de `content_hash` em versões** (2 registros do CE com conteúdo idêntico).
- **0 registros em `knowledge_ingestions`** — nenhuma rastreabilidade de quando/como os dados entraram.
- Provedor de embeddings: `DETERMINISTIC_LOCAL` (hash-based, não semântico), 1024 dimensões, 1 modelo distinto.

Estado da Fase 1: **PASS** (inventário completo e consistência referencial verificada).

---

## 2. Inventário Completo das Tabelas de Conhecimento

| Tabela | Total | Detalhes |
|--------|-------|----------|
| `knowledge_sources` | 39 | 39 ativas (`is_active = true`), **39 sem URL** (`url IS NULL`) |
| `knowledge_documents` | 66 | 66 ativas (`status = 'ACTIVE'`), 0 sem versão atual, 0 sem fonte |
| `knowledge_document_versions` | 66 | 0 sem `content_hash`, 0 sem `source_url`, `effective_from`/`effective_until` NULL em todas |
| `knowledge_chunks` | 58 | 0 sem `content_hash` |
| `knowledge_embeddings` | 58 | 0 nulos, 1 modelo (`defesai-legal-vectorizer-v1`), 1 dimensão (1024), provider `DETERMINISTIC_LOCAL` |
| `knowledge_ingestions` | 0 | 0 registros — nenhuma carga rastreada |

### 2.1 Fontes (knowledge_sources)

Todas as 39 fontes estão ativas e **sem URL**:

| Jurisdição | Fontes | Exemplos |
|------------|--------|----------|
| BR_FEDERAL | 10 | ANTT, CONTRAN, DNIT, DOU, INMETRO, Planalto, PRF, SENATRAN, STJ |
| AC | 2 | DETRAN-AC |
| AL | 2 | CETRAN-AL |
| AM | 2 | DETRAN-AM |
| AP | 2 | DETRAN-AP |
| CE | 4 | CETRAN-CE, DETRAN-CE |
| ES | 2 | CETRAN-ES, DETRAN-ES |
| GO | 2 | CETRAN-GO, DETRAN-GO |
| MG | 1 | DETRAN-MG |
| MS | 2 | CETRAN-MS, DETRAN-MS |
| PA | 1 | DETRAN-PA |
| PB | 2 | CETRAN-PB, DETRAN-PB |
| PI | 2 | CETRAN-PI, DETRAN-PI |
| PR | 3 | CETRAN-PR, DETRAN-PR |
| RJ | 3 | CETRAN-RJ, DETRAN-RJ |
| RR | 3 | DETRAN-RR |
| RS | 2 | CETRAN-RS, DETRAN-RS |
| SC | 3 | CETRAN-SC, DETRAN-SC |
| SP | 3 | CETRAN-SP, DETRAN-SP |
| TO | 3 | DETRAN-TO |

**Total: 39 fontes, 0 com URL preenchida.**

### 2.2 Documentos (knowledge_documents)

66 documentos, todos `ACTIVE`, todos com `current_version_id` preenchido, todos associados a uma fonte existente. Tipos de documento: Portaria, Resolução, Formulário, Regimento Interno, Serviço, Instrução de Serviço, Procedimento, Portal, Memo, Decreto, Informação Jurídica, Legislação, Diário Oficial da União, Compilação de Resoluções, Compilação do CTB, Página inicial de portal, Consulta de radares, Portal de jurisprudência.

### 2.3 Versões (knowledge_document_versions)

66 versões, todas `v1.0`, todas com `content_hash` e `source_url` preenchidos. Todas com `effective_from = NULL` e `effective_until = NULL` (sem vigência temporal definida).

### 2.4 Chunks (knowledge_chunks)

58 chunks, todos com `content_hash`, `chunk_index` a partir de 0, `article_number` NULL em todos (não há numeração de artigo extraída nos chunks).

### 2.5 Embeddings (knowledge_embeddings)

58 embeddings, todos com:
- `provider`: `DETERMINISTIC_LOCAL`
- `model`: `defesai-legal-vectorizer-v1`
- `dimensions`: 1024
- `embedding`: não nulo

---

## 3. Consistência Referencial (PASS)

Todas as 5 relações verificadas retornaram **0 órfãos**:

| Relação | Consulta | Resultado | Status |
|---------|----------|-----------|--------|
| chunks → embeddings | chunks sem embedding correspondente | 0 | PASS |
| embeddings → chunks | embeddings sem chunk correspondente | 0 | PASS |
| documentos → versões | documentos cuja `current_version_id` não existe em versões | 0 | PASS |
| versões → documentos | versões cujo `document_id` não existe em documentos | 0 | PASS |
| chunks → versões | chunks cujo `document_version_id` não existe em versões | 0 | PASS |

---

## 4. Duplicações de content_hash

### 4.1 Chunks (1 duplicação)

| content_hash | qtd | document_id | chunk_index |
|--------------|-----|-------------|-------------|
| `73740653fc24bbc04b1ccc887f7f8f35d7fffe39b5b91ec8bcff5173c492a112` | 2 | `SRC_CE_DETRAN_DEFESA_AUTUAR_INFRACAO` | 0 |
| | | `SRC_CE_DETRAN_RECURSO_JARI` | 0 |

Dois documentos distintos do DETRAN-CE ("Defesa de autuação de infração de trânsito" e "Recurso JARI - DETRAN-CE") possuem chunks com `content_hash` idêntico. Isso sugere conteúdo duplicado ou não diferenciado entre os dois serviços.

### 4.2 Versões (1 duplicação)

| content_hash | qtd | document_id | version |
|--------------|-----|-------------|---------|
| `ebaded0d43931826c3a02c1527d57fe916bbc4ec78d24dbf304020ece1ea818a` | 2 | `SRC_CE_DETRAN_DEFESA_AUTUAR_INFRACAO` | v1.0 |
| | | `SRC_CE_DETRAN_RECURSO_JARI` | v1.0 |

Mesmo par de documentos do DETRAN-CE com versões de conteúdo idêntico.

---

## 5. Histórico de Ingestão (knowledge_ingestions)

**0 registros.** Nenhuma carga de ingestão foi rastreada no banco, embora os dados estejam presentes nas tabelas. Não é possível determinar quando, como ou por quem os documentos, chunks e embeddings foram inseridos.

---

## 6. Vigência e URLs

| Item | Quantidade | Status |
|------|------------|--------|
| Fontes com URL (`knowledge_sources.url`) | 0 / 39 | ❌ Todas sem URL |
| Versões com `source_url` | 66 / 66 | ✅ Todas com URL |
| Versões com `effective_from` | 0 / 66 | ❌ Todas NULL |
| Versões com `effective_until` | 0 / 66 | ❌ Todas NULL |

Observação: as versões possuem `source_url` (URL do documento oficial), mas as fontes (`knowledge_sources`) não possuem URL de nível de autoridade. Além disso, nenhuma versão tem vigência temporal definida, impossibilitando validar se a norma estava em vigor na data da infração.

---

## 7. Entregáveis da Fase 1

| Entregável | Status | Onde está |
|------------|--------|-----------|
| Inventário completo das tabelas de conhecimento com contagens | Concluído | Seções 2.1-2.5 deste relatório |
| Relatório de consistência referencial (PASS/FAIL por relação) | Concluído | Seção 3 deste relatório |
| Lista de fontes sem URL e documentos sem versão vigente | Concluído | Seções 2.1 e 6 deste relatório |
| Registro de duplicações de `content_hash` | Concluído | Seção 4 deste relatório |
| Avaliação de rastreabilidade de ingestão | Concluído | Seção 5 deste relatório |

---

## 8. Critérios Objetivos de Aceite — Fase 1

| Critério | Resultado | Status |
|----------|-----------|--------|
| 100% das tabelas de conhecimento inventariadas com contagens | 6 tabelas inventariadas | PASS |
| 100% das relações referenciais verificadas (0 órfãos não explicados) | 0 órfãos em 5 relações | PASS |
| Duplicações de `content_hash` documentadas com justificativa ou correção planejada | 1 duplicação em chunks, 1 em versões (documentados) | PASS |
| Fontes com e sem URL identificadas explicitamente | 39/39 sem URL | PASS |
| Histórico de ingestão avaliado (presentes ou ausentes com justificativa) | 0 registros (ausente, documentado) | PASS |

**Estado da Fase 1: PASS**

---

## 9. Inconformidades Identificadas (para correção em fases posteriores)

| ID | Descrição | Impacto | Prioridade | Fase sugerida para correção |
|----|-----------|---------|------------|----------------------------|
| F1-INC-01 | 39/39 fontes sem `url` | Proveniência de fonte oficial não verificável | Alta | Fase 2 (recuperação/relevância) |
| F1-INC-02 | 66/66 versões sem `effective_from`/`effective_until` | Não é possível validar vigência da norma | Alta | Fase 3 (elegibilidade/fundamentos) |
| F1-INC-03 | 1 duplicação de `content_hash` em chunks (2 docs do CE) | Conteúdo possivelmente duplicado entre documentos distintos | Média | Fase 1 (diagnóstico já feito) / Fase 2 |
| F1-INC-04 | 1 duplicação de `content_hash` em versões (2 docs do CE) | Conteúdo possivelmente duplicado entre versões distintas | Média | Fase 1 (diagnóstico já feito) / Fase 2 |
| F1-INC-05 | 0 registros em `knowledge_ingestions` | Sem rastreabilidade de carga de dados | Média | Fase 5 (monitoramento) |
| F1-INC-06 | Provedor de embeddings `DETERMINISTIC_LOCAL` (não semântico) | Busca vetorial semântica não agrega valor real | Alta | Fase 2 (decisão de estratégia) |

---

## 10. Condições de Avanço para Fase 2

A Fase 1 está **PASS**. Os critérios para avançar para a Fase 2 estão atendidos:

- [x] Inventário completo das tabelas de conhecimento.
- [x] Consistência referencial verificada (0 órfãos).
- [x] Duplicações documentadas.
- [x] Fontes com/sem URL identificadas.
- [x] Histórico de ingestão avaliado.

**Próxima execução:** Fase 2 (Recuperação Jurídica e Relevância), com escopo próprio, critérios de aceite e autorização explícita. Não avançar automaticamente para a Fase 2 sem nova autorização.

---

## 11. Registro de Rastreabilidade

| Item | Valor |
|------|-------|
| Identificador | FASE-1-2026-10-23 |
| Data | 23/10/2026 |
| Fase | 1 — Integridade e Diagnóstico da Base Jurídica |
| Descrição | Diagnóstico completo da base jurídica persistida no Supabase |
| Evidência | Consultas SQL de leitura executadas no projeto `llmxnpgjpxcvyrqjkfwb` |
| Impacto | Base estruturalmente íntegra, mas com lacunas de proveniência, vigência e rastreabilidade |
| Prioridade | Alta (para itens F1-INC-01, F1-INC-02, F1-INC-06) |
| Decisão | Fase 1 concluída com estado PASS; avançar para Fase 2 somente com nova autorização |
| Responsável | Agente executor (auditoria) |
| Ação corretiva | Nenhuma alteração realizada nesta fase (apenas diagnóstico) |
| Testes e resultado | 5 relações referenciais verificadas (0 órfãos); contagens de todas as tabelas |
| Estado atual | PASS |
| Commit | Pendente (será incluído no commit da Fase 1) |
| Pendências | Correção das inconformidades F1-INC-01 a F1-INC-06 em fases posteriores |
| Vínculo com outros registros | Relatório de auditoria: `14-arquitetura-conhecimento-juridico-production.md`; Plano: `15-plano-correcao-base-juridica-cinco-fases.md` |

---

**Fim do relatório de Fase 1.** Nenhuma alteração funcional, deploy, commit ou alteração de banco foi realizada nesta execução além da documentação de diagnóstico. O estado é **PASS** e a Fase 1 está concluída, aguardando autorização para a Fase 2.
