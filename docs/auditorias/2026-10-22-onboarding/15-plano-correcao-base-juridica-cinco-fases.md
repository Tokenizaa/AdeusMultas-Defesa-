# Plano de Correção da Base Jurídica — Cinco Fases

**Projeto:** DefesAi / AdeusMultas  
**Repositório:** `Tokenizaa/AdeusMultas-Defesa-`  
**Branch:** `main`  
**Relatório base:** `docs/auditorias/2026-10-22-onboarding/14-arquitetura-conhecimento-juridico-production.md`  
**Data:** 23/10/2026  
**Escopo:** Documentação, governança e rastreabilidade Git. Nenhuma correção funcional nesta execução.

---

## Regra Permanente de Rastreabilidade

Toda recomendação técnica relevante, inconformidade, risco, decisão, pendência e resultado de validação identificado durante o trabalho deve ser registrado no repositório Git.

Cada registro deverá, conforme aplicável, informar:

- identificador ou referência;
- data e fase;
- descrição do achado;
- evidência verificável;
- impacto e prioridade;
- decisão tomada e justificativa;
- responsável ou agente executor;
- ação corretiva;
- testes e resultado;
- estado atual;
- commit que introduziu a alteração;
- pendências e vínculo com outros registros.

A documentação deve ser versionada e commitada. Quando houver implementação, o registro deverá permitir localizar os commits e testes correspondentes. Quando uma recomendação não for implementada, deverá existir justificativa rastreável. Não registrar como concluída uma atividade que apenas foi planejada.

Relatórios, decisões e pendências não podem existir exclusivamente na memória da conversa ou em arquivos locais não versionados.

---

## Visão Geral das Cinco Fases

| Fase | Objetivo central | Status |
|------|------------------|--------|
| Fase 1 | Integridade e diagnóstico da base jurídica | Planejada (próxima execução) |
| Fase 2 | Recuperação jurídica e relevância | Planejada |
| Fase 3 | Elegibilidade das teses e validação dos fundamentos | Planejada |
| Fase 4 | Montagem da minuta e Quality Gate | Planejada |
| Fase 5 | Certificação, produção e monitoramento | Planejada |

**Próxima execução:** Fase 1 apenas, com escopo próprio, critérios de aceite e autorização explícita. Não executar a Fase 1 funcional nesta tarefa.

---

## Fase 1 — Integridade e Diagnóstico da Base Jurídica

### 1.1 Objetivo e Escopo
Inventariar fontes, documentos, versões, chunks, embeddings, vigência, URLs, relações referenciais, cobertura e histórico de ingestão. Reconciliar inconsistências sem presumir que dados ausentes sejam prova de invalidade.

### 1.2 Diagnóstico e Pré-requisitos (do relatório de auditoria)
- Fontes: 39 ativas, 100% sem `url` (R-02, P1).
- Documentos: 66, todos ativos, 0 sem versão atual, 0 sem fonte.
- Versões: 66, 0 sem `content_hash`, 0 sem `source_url`.
- Chunks: 58, 0 sem `content_hash`.
- Embeddings: 58, 0 nulos, 1 modelo (`DETERMINISTIC_LOCAL`), 1024 dimensões.
- `knowledge_ingestions`: 0 registros (R-05, P2).
- RPC `match_knowledge_chunks`: existe com índice HNSW, não chamada pelo Worker.
- Consistência referencial: 0 órfãos em ambas as direções; 1 duplicação de `content_hash` em chunks; 1 duplicação em versões.

### 1.3 Atividades Concretas
1. Listar todas as `knowledge_sources` com `id, name, authority, jurisdiction, url, is_active`.
2. Listar todos os `knowledge_documents` com `id, source_id, title, document_type, jurisdiction, status, current_version_id`.
3. Listar todos os `knowledge_document_versions` com `id, document_id, version, content_hash, source_url, effective_from, effective_until`.
4. Listar todos os `knowledge_chunks` com `id, document_version_id, document_id, source_id, jurisdiction, article_number, chunk_index, content_hash`.
5. Listar todos os `knowledge_embeddings` com `id, chunk_id, provider, model, dimensions`.
6. Verificar consistência referencial (chunks↔embeddings, documentos↔versões, versões↔documentos, chunks↔versões).
7. Detectar duplicações de `content_hash`.
8. Verificar se `knowledge_ingestions` possui registros de carga.
9. Documentar quais fontes possuem URL oficial verificável e quais não possuem.

### 1.4 Arquivos, Componentes e Tabelas Envolvidas
| Item | Status | Referência |
|------|--------|------------|
| `knowledge_sources` | Confirmado | Tabela existente no Supabase |
| `knowledge_documents` | Confirmado | Tabela existente no Supabase |
| `knowledge_document_versions` | Confirmado | Tabela existente no Supabase |
| `knowledge_chunks` | Confirmado | Tabela existente no Supabase |
| `knowledge_embeddings` | Confirmado | Tabela existente no Supabase |
| `knowledge_ingestions` | Confirmado | Tabela existente, 0 registros |
| `match_knowledge_chunks` (RPC) | Confirmado | Função existente, assinatura verificada |
| `cloudflare/rag-adapter.ts` | Confirmado | Usa `knowledge_chunks` diretamente, não a RPC |
| `src/server/knowledge/ingestion-service.ts` | Confirmado | Não chama em produção |

### 1.5 Entregáveis
- Inventário completo das tabelas de conhecimento com contagens.
- Relatório de consistência referencial (PASS/FAIL por relação).
- Lista de fontes sem URL e documentos sem versão vigente.
- Registro de duplicações de `content_hash`.
- Avaliação de rastreabilidade de ingestão.

### 1.6 Critérios Objetivos de Aceite
- [ ] 100% das tabelas de conhecimento inventariadas com contagens.
- [ ] 100% das relações referenciais verificadas (0 órfãos não explicados).
- [ ] Duplicações de `content_hash` documentadas com justificativa ou correção planejada.
- [ ] Fontes com e sem URL identificadas explicitamente.
- [ ] Histórico de ingestão avaliado (presentes ou ausentes com justificativa).

### 1.7 Testes e Evidências Exigidos
- Consultas SQL de leitura (contagens, joins, agrupamentos) salvas como evidência no repositório.
- Não executar ingestão, reindexação ou escrita.

### 1.8 Riscos e Dependências
- Risco: presumir que dados ausentes invalidam a base. Mitigação: reconciliar sem presumir invalidade.
- Dependência: acesso de leitura ao Supabase (confirmado).

### 1.9 Condições de PASS / FAIL / BLOCKED
- **PASS:** Inventário completo e consistência referencial verificada, entregáveis gerados.
- **FAIL:** Inconsistências referenciais não resolvidas ou tabelas ausentes.
- **BLOCKED:** Sem acesso de leitura ao Supabase ou credenciais ausentes.

### 1.10 Retorno a Fases Anteriores
Não aplicável (primeira fase).

### 1.11 Autorização Necessária
- Alterações de banco/migrations: requer autorização explícita (não nesta fase).
- Leitura de dados: autorizada (já executada na auditoria).

---

## Fase 2 — Recuperação Jurídica e Relevância

### 2.1 Objetivo e Escopo
Avaliar busca lexical, vetorial e híbrida usando casos de referência. Verificar modelo, dimensões, compatibilidade dos embeddings, filtros jurídicos e métricas de recuperação. Não ativar uma estratégia sem evidência de adequação.

### 2.2 Diagnóstico e Pré-requisitos
- Busca atual: lexical PostgREST sobre `knowledge_chunks.content` (`cloudflare/rag-adapter.ts:124-180`).
- Embeddings: `DETERMINISTIC_LOCAL`, 1024 dims, não semânticos (R-04, P2).
- RPC `match_knowledge_chunks`: existe, não usada pelo Worker (R-03, P2).
- Índice HNSW: presente (`idx_k_embeddings_vector_hnsw`).
- Casos de referência: 28 casos (relatório 09-fluxo-completo.md), não executados E2E.

### 2.3 Atividades Concretas
1. Executar busca lexical com amostras de teses reais do `ARGUMENTS_CATALOG` contra os 58 chunks.
2. Medir taxa de `provenanceStatus: 'SUPPORTED'` vs `'UNSUPPORTED'`.
3. Avaliar se embeddings `DETERMINISTIC_LOCAL` são adequados para busca semântica jurídica.
4. Testar RPC `match_knowledge_chunks` com vetores de consulta e verificar retorno.
5. Definir critérios de relevância jurídica (correspondência de artigo CTB/resolução, `official_url`, vigência).
6. Documentar decisão: manter lexical, adotar híbrida, ou não ativar vetorial sem evidência.

### 2.4 Arquivos, Componentes e Tabelas Envolvidos
| Item | Status | Referência |
|------|--------|------------|
| `cloudflare/rag-adapter.ts` | Confirmado | Busca lexical em produção |
| `src/server/knowledge/vector-store.ts` | Confirmado | Não chamado em produção |
| `src/server/knowledge/search-service.ts` | Confirmado | Não chamado em produção |
| `src/server/knowledge/rag-service.ts` | Confirmado | Não chamado em produção |
| `match_knowledge_chunks` (RPC) | Confirmado | Existe, não usada pelo Worker |
| `knowledge_embeddings` | Confirmado | 58 registros, DETERMINISTIC_LOCAL |

### 2.5 Entregáveis
- Relatório de taxa de recuperação lexical por tese.
- Avaliação de adequação dos embeddings para busca semântica.
- Decisão documentada sobre estratégia de recuperação (lexical/vetorial/híbrida).
- Critérios de relevância jurídica definidos.

### 2.6 Critérios Objetivos de Aceite
- [ ] Taxa de `SUPPORTED` medida com casos de referência.
- [ ] Adequação dos embeddings avaliada com base em evidência, não preferência tecnológica.
- [ ] Decisão de estratégia documentada com justificativa.
- [ ] Critérios de relevância jurídica definidos e aplicáveis.

### 2.7 Testes e Evidências Exigidos
- Consultas de busca lexical com amostras de teses reais.
- Teste da RPC `match_knowledge_chunks` (leitura apenas).
- Não ativar busca vetorial sem evidência de adequação.

### 2.8 Riscos e Dependências
- Risco: ativar busca vetorial com embeddings não semânticos. Mitigação: exigir evidência antes de ativar.
- Dependência: resultados da Fase 1 (integridade da base).

### 2.9 Condições de PASS / FAIL / BLOCKED
- **PASS:** Estratégia de recuperação decidida com evidência, critérios de relevância definidos.
- **FAIL:** Estratégia decidida sem evidência ou critérios ausentes.
- **BLOCKED:** Sem casos de referência executáveis ou sem acesso aos chunks.

### 2.10 Retorno a Fases Anteriores
Retornar à Fase 1 se inconsistências referenciais impedirem a avaliação de recuperação.

### 2.11 Autorização Necessária
- Alterar estratégia de recuperação em código: requer autorização (não nesta fase).
- Avaliar e documentar: autorizado.

---

## Fase 3 — Elegibilidade das Teses e Validação dos Fundamentos

### 3.1 Objetivo e Escopo
Definir o vínculo rastreável entre fatos, regras determinísticas, teses, requisitos jurídicos, evidências e fontes. Tratar explicitamente fatos ausentes, contraindicações e resultados inconclusivos. Não permitir que similaridade textual seja tomada como prova de sustentação jurídica.

### 3.2 Diagnóstico e Pré-requisitos
- `ExpertRuleEngine.evaluate` é autoridade da elegibilidade (`src/core/rules/rule-engine.ts:681-1012`).
- `ARGUMENTS_CATALOG` tem 52 teses (ARG-001 a ARG-052).
- 44 teses não mapeadas em `LEGAL_THESES_VALIDATION` (auditoria 07-revisao-juridica.md).
- 9 teses usadas pelo motor mas não mapeadas na validação jurídica.
- `provenanceStatus` computada por correspondência lexical (não prova de sustentação jurídica).

### 3.3 Atividades Concretas
1. Mapear cada tese usada pelo motor para seu(s) requisito(s) jurídico(s) e fato(s) do caso necessário(s).
2. Definir o vínculo rastreável: fato → regra → tese → dispositivo jurídico → fonte → trecho da minuta.
3. Tratamento explícito de fatos ausentes (DATA_GAP, FAIL CLOSED) — nunca presumir vício.
4. Tratamento de contraindicações e resultados inconclusivos.
5. Validar que `similaridade textual` não é prova de sustentação jurídica.
6. Revisar as 44 teses não mapeadas e as 9 usadas pelo motor mas não em `LEGAL_THESES_VALIDATION`.

### 3.4 Arquivos, Componentes e Tabelas Envolvidos
| Item | Status | Referência |
|------|--------|------------|
| `src/core/rules/rule-engine.ts` | Confirmado | Motor de regras determinístico |
| `src/core/arguments/arguments-catalog.ts` | Confirmado | 52 teses |
| `src/core/legal-base/ctb-articles.ts` | Confirmado | Referência estática |
| `src/core/legal-base/resolutions.ts` | Confirmado | Referência estática |
| `src/core/legal-base/jurisprudence.ts` | Confirmado | Referência estática |
| `docs/auditorias/2026-10-22-onboarding/07-revisao-juridica.md` | Confirmado | Auditoria de teses |

### 3.5 Entregáveis
- Matriz de rastreabilidade fato → regra → tese → dispositivo → fonte → minuta.
- Tratamento documentado de fatos ausentes, contraindicações e inconclusivos.
- Revisão das teses não mapeadas (44 + 9).
- Decisão de que similaridade textual ≠ sustentação jurídica.

### 3.6 Critérios Objetivos de Aceite
- [ ] 100% das teses usadas pelo motor mapeadas para requisitos jurídicos.
- [ ] Vínculo rastreável definido para cada tese.
- [ ] Fatos ausentes tratados como DATA_GAP, não como vício.
- [ ] Similaridade textual explicitamente não aceita como prova de sustentação.

### 3.7 Testes e Evidências Exigidos
- Matriz de rastreabilidade revisada por agente qualificador.
- Casos de referência para validar elegibilidade por família.

### 3.8 Riscos e Dependências
- Risco: tomar similaridade textual como prova jurídica. Mitigação: regra explícita no plano.
- Dependência: resultados da Fase 2 (estratégia de recuperação).

### 3.9 Condições de PASS / FAIL / BLOCKED
- **PASS:** Matriz de rastreabilidade completa, fatos ausentes tratados, revisão de teses feita.
- **FAIL:** Teses usadas pelo motor sem mapeamento ou similaridade textual aceita como prova.
- **BLOCKED:** Sem acesso ao catálogo de argumentos ou regras.

### 3.10 Retorno a Fases Anteriores
Retornar à Fase 2 se a estratégia de recuperação não suportar a ancoragem necessária.

### 3.11 Autorização Necessária
- Alterar catálogo de teses ou regras: requer autorização (não nesta fase).
- Documentar matriz de rastreabilidade: autorizado.

---

## Fase 4 — Montagem da Minuta e Quality Gate

### 4.1 Objetivo e Escopo
Integrar fundamentos verificados à geração documental. Definir o tratamento de fontes insuficientes, fundamentos não confirmados, documentos desatualizados e falhas técnicas. Preservar textos reutilizáveis quando apropriados, mas impedir que parágrafos estáticos sejam apresentados como fundamentação validada sem suporte.

### 4.2 Diagnóstico e Pré-requisitos
- `DocumentAssemblyEngine.assemble` usa `ARGUMENTS_CATALOG[].formattedParagraphs` (não conteúdo da KB) (`document-assembly-engine.ts:144-157`).
- Quality Gate `runCanonicalQualityGate` é invocado em `POST /api/cases/:id/generate-defense` (`cases.ts:601`).
- Check `PROVENANCE_KB` exige que todas as teses tenham `provenanceStatus === 'SUPPORTED'`.
- `integrityHash` não cobre proveniência jurídica (hipótese H-2).
- Fallback degradado existe (`fallbackDeterministicAnalysis`, `rag-adapter.ts:334-359`).

### 4.3 Atividades Concretas
1. Definir tratamento de fontes insuficientes no Quality Gate (bloquear vs. avisar).
2. Definir tratamento de fundamentos não confirmados (teses `UNSUPPORTED`).
3. Definir tratamento de documentos desatualizados (vigência, `effective_from`/`effective_until`).
4. Definir tratamento de falhas técnicas (erro de conexão, zero resultados).
5. Preservar textos reutilizáveis do `ARGUMENTS_CATALOG` como conteúdo, não como fundamento validado.
6. Avaliar se `integrityHash` deve incluir proveniência jurídica.
7. Ajustar `PROVENANCE_KB` para não bloquear falsos positivos quando a KB tem o documento mas a busca lexical não o encontra.

### 4.4 Arquivos, Componentes e Tabelas Envolvidos
| Item | Status | Referência |
|------|--------|------------|
| `cloudflare/quality-gate.ts` | Confirmado | `runCanonicalQualityGate` |
| `cloudflare/rag-adapter.ts` | Confirmado | `generateDefenseDraftCompat`, `fallbackDeterministicAnalysis` |
| `src/core/documents/document-assembly-engine.ts` | Confirmado | Montagem de minuta |
| `cloudflare/defense-integrity.ts` | Confirmado | `computeDefenseIntegrityHash` |
| `cloudflare/routes/cases.ts` | Confirmado | Rota de geração de defesa |

### 4.5 Entregáveis
- Política de tratamento de fontes insuficientes, fundamentos não confirmados, documentos desatualizados e falhas técnicas.
- Ajuste do Quality Gate para evitar falsos positivos.
- Decisão sobre inclusão de proveniência no `integrityHash`.
- Documentação de que parágrafos estáticos ≠ fundamentação validada.

### 4.6 Critérios Objetivos de Aceite
- [ ] Política de tratamento de cada cenário de falha documentada.
- [ ] Quality Gate não bloqueia falsos positivos (KB tem documento, busca não o encontra).
- [ ] Parágrafos estáticos não apresentados como fundamentação validada sem suporte.
- [ ] Decisão sobre `integrityHash` e proveniência documentada.

### 4.7 Testes e Evidências Exigidos
- Casos de teste para cada cenário de falha (zero resultados, baixa relevância, erro de conexão, versão obsoleta, referência conflitante).
- Verificação de que `PROVENANCE_KB` não bloqueia indevidamente.

### 4.8 Riscos e Dependências
- Risco: Quality Gate bloqueia minuta por falha de busca, não por falta de fundamento jurídico. Mitigação: diferenciar busca falhada vs. fundamento ausente.
- Dependência: resultados da Fase 3 (elegibilidade e fundamentos).

### 4.9 Condições de PASS / FAIL / BLOCKED
- **PASS:** Política de falhas definida, Quality Gate ajustado, decisão sobre integrityHash tomada.
- **FAIL:** Política ausente ou Quality Gate bloqueando falsos positivos.
- **BLOCKED:** Sem resultados da Fase 3 ou sem acesso ao código do Quality Gate.

### 4.10 Retorno a Fases Anteriores
Retornar à Fase 3 se a elegibilidade das teses não estiver bem definida.

### 4.11 Autorização Necessária
- Alterar Quality Gate ou montagem de minuta: requer autorização (não nesta fase).
- Documentar política: autorizado.

---

## Fase 5 — Certificação, Produção e Monitoramento

### 5.1 Objetivo e Escopo
Planejar testes unitários, integração, regressão e ponta a ponta para os sete serviços de defesa; rastreabilidade de resultados; segurança; desempenho; observabilidade; implantação controlada e reversão.

### 5.2 Diagnóstico e Pré-requisitos
- 28 cenários de referência definidos (09-fluxo-completo.md), 0 executados E2E.
- Bloqueios E2E: `PLAYWRIGHT_BASE_URL` e `E2E_ALLOW_PERSISTENT_WRITES` não definidos.
- Execução contra produção não autorizada sem permissão explícita.
- Testes unitários existentes: `rule-engine.test.ts`, `cases.test.ts`, `payments.test.ts`, etc.

### 5.3 Atividades Concretas
1. Planejar testes unitários para `ExpertRuleEngine`, `DocumentAssemblyEngine`, `CloudflareRagAdapter`, `runCanonicalQualityGate`.
2. Planejar testes de integração para rotas de casos e pagamentos.
3. Planejar testes de regressão para as 5 fases anteriores.
4. Planejar testes E2E para os 7 serviços de defesa (defesa_previa, recurso_jari, recurso_cetran, suspensao_cnh, cassacao_cnh, indicacao_condutor, conversao_advertencia).
5. Definir métricas de observabilidade: latência de recuperação, taxa `SUPPORTED`/`UNSUPPORTED`, erros de conexão, cobertura.
6. Definir processo de implantação controlada e reversão.
7. Definir controles de segurança: acesso mínimo necessário, RLS, não expor segredos.

### 5.4 Arquivos, Componentes e Tabelas Envolvidos
| Item | Status | Referência |
|------|--------|------------|
| `tests/` | Confirmado | Testes existentes |
| `playwright.config.ts` | Confirmado | Config E2E |
| `cloudflare/quality-gate.ts` | Confirmado | Gate a testar |
| `cloudflare/rag-adapter.ts` | Confirmado | Adapter a testar |
| `src/server/knowledge/*` | Confirmado | Serviços RAG (legacy) |

### 5.5 Entregáveis
- Plano de testes por fase (unitário, integração, regressão, E2E).
- Métricas de observabilidade definidas.
- Processo de implantação controlada e reversão.
- Controles de segurança documentados.

### 5.6 Critérios Objetivos de Aceite
- [ ] Plano de testes cobre os 7 serviços de defesa.
- [ ] Métricas de observabilidade definidas e mensuráveis.
- [ ] Processo de implantação e reversão documentado.
- [ ] Controles de segurança documentados.

### 5.7 Testes e Evidências Exigidos
- Testes unitários e de integração executados (quando autorizado).
- Testes E2E apenas com autorização explícita e ambiente configurado.
- Não executar contra produção sem autorização.

### 5.8 Riscos e Dependências
- Risco: executar E2E contra produção sem autorização. Mitigação: exigir autorização explícita.
- Dependência: resultados das Fases 1-4.

### 5.9 Condições de PASS / FAIL / BLOCKED
- **PASS:** Plano de testes completo, métricas definidas, implantação e reversão documentadas.
- **FAIL:** Plano incompleto ou métricas não mensuráveis.
- **BLOCKED:** Sem autorização para executar testes ou sem ambiente configurado.

### 5.10 Retorno a Fases Anteriores
Retornar à Fase 4 se o Quality Gate não estiver adequadamente definido.

### 5.11 Autorização Necessária
- Executar testes E2E: requer autorização explícita do usuário.
- Deploy: requer autorização separada (não nesta fase).
- Documentar plano: autorizado.

---

## Matriz de Rastreabilidade de Fases

| Fase | Depende de | Entrega para | Condição de retorno |
|------|-----------|--------------|---------------------|
| 1 | — | 2 | — |
| 2 | 1 | 3 | 1 (inconsistências referenciais) |
| 3 | 2 | 4 | 2 (estratégia de recuperação inadequada) |
| 4 | 3 | 5 | 3 (elegibilidade mal definida) |
| 5 | 4 | — | 4 (Quality Gate mal definido) |

---

## Autorização para Alterações

- **Documentação:** autorizada (esta execução).
- **Código de produção:** requer autorização explícita separada.
- **Banco/migrations:** requer autorização explícita separada.
- **Deploy:** requer autorização explícita separada.
- **Testes E2E contra produção:** requer autorização explícita e ambiente configurado.

---

## Estado Atual deste Plano

- Documento criado: `docs/auditorias/2026-10-22-onboarding/15-plano-correcao-base-juridica-cinco-fases.md`.
- Fase 1 definida como próxima execução.
- Nenhuma alteração funcional realizada.
- Nenhum commit executado nesta tarefa (pendente de confirmação do usuário para versionar).

---

**Fim do plano de cinco fases.** Nenhuma correção funcional, deploy, commit ou alteração de banco foi realizada. O plano está pronto para ser versionado e a Fase 1 executada em uma próxima etapa com autorização explícita.
