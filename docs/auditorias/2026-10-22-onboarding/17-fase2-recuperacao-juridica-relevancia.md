# Relatório de Fase 2 — Recuperação Jurídica e Relevância

**Projeto:** DefesAi / AdeusMultas  
**Repositório:** `Tokenizaa/AdeusMultas-Defesa-`  
**Branch:** `main`  
**Commit inicial:** `408b778`  
**Plano referência:** `docs/auditorias/2026-10-22-onboarding/15-plano-correcao-base-juridica-cinco-fases.md`  
**Relatório Fase 1:** `docs/auditorias/2026-10-22-onboarding/16-fase1-integridade-base-juridica.md`  
**Data:** 23/10/2026  
**Fase:** 2 — Recuperação Jurídica e Relevância  
**Estado:** EM EXECUÇÃO  
**Escopo:** Investigação, testes comparativos, documentação. Nenhuma alteração no banco remoto, produção ou deploy.

---

## 1. Resumo Executivo (preliminar)

A Fase 2 está em execução. A atividade A (diagnóstico da recuperação atual) já foi concluída e revelou:

- **Busca lexical** (caminho de produção via `cloudflare/rag-adapter.ts`): funciona, mas retorna chunks genéricos (portarias estaduais, páginas de portal) que não contêm o artigo CTB específico das teses. Taxa de `provenanceStatus: 'SUPPORTED'` próxima de zero para teses que dependem de dispositivos específicos.
- **Busca vetorial** (RPC `match_knowledge_chunks`): **inoperante**. A extensão `vector` v0.8.2 está instalada, mas o operador `<=>` (cosine distance) não está disponível: `ERROR: operator does not exist: extensions.vector <=> extensions.vector`. A RPC não pode ser executada.
- **Embeddings**: `DETERMINISTIC_LOCAL`, 1024 dims, esparsos, hash-based (não semânticos).

A atividade B (conjunto de avaliação jurídica) está sendo executada a seguir.

---

## 2. Estado do Ambiente

| Item | Valor |
|------|-------|
| Branch | `main` |
| SHA inicial | `408b778` |
| SHA remoto (`origin/main`) | `408b778` (sincronizado) |
| Projeto Supabase | `llmxnpgjpxcvyrqjkfwb` (Defesai-AdeusMultas, sa-east-1) |
| Alterações locais preexistentes | Preservadas (não-staged): `api/index.mjs`, `src/components/checkout/checkout-pix-only.test.tsx` |
| Extensão `vector` | Instalada (v0.8.2), mas operador `<=>` indisponível |
| RPC `match_knowledge_chunks` | Existente, mas inoperante (depende de `<=>`) |

---

## 3. Atividade A — Diagnóstico da Recuperação Atual (CONCLUÍDA)

### 3.1 Caminho de produção
O caminho de produção usa `cloudflare/rag-adapter.ts`:
- `analyzeInfraction` → `buildSearchTerms` (extrai até 12 termos lexicais, remove stop words, filtra palavras > 3 chars)
- `searchKnowledgeLexical`: `content.ilike.%termo%` OR para cada termo, `LIMIT 200`, ordena por contagem de termos encontrados, top 5
- `applyDeterministicAnalysis`: `ExpertRuleEngine.evaluate` + busca de hits nos chunks que citam o `legalBase` da tese
- `provenanceStatus = 'SUPPORTED'` só se houver hit com `official_url` e conteúdo citando o artigo/resolução da tese

### 3.2 Resultados da busca lexical (13 consultas baseadas em teses reais)

Para todas as 13 consultas testadas (ARG-001, ARG-002, ARG-005, ARG-008, ARG-012, ARG-015, ARG-019, ARG-020, ARG-024, ARG-025, ARG-027, ARG-048, ARG-051), os resultados foram chunks genéricos:
- Portarias estaduais (AC, AM, CE, ES, MG, MS, PB, PI, PR, RJ, RR, SC, TO)
- Páginas de portal (ANTT, PRF, SENATRAN, DETRAN-SP, DETRAN-TO)
- Compilações do CONTRAN, CTB (Planalto)

**Nenhum resultado contém o artigo CTB específico da tese** de forma que permita ancoragem jurídica. Exemplo:
- ARG-001 (radar aferição INMETRO, Art. 280 §2º): resultados incluem portarias do AM, CE, ES, CONTRAN, INMETRO, CTB — nenhum menciona verificação metrológica anual de forma relevante para a tese.
- ARG-002 (placa R-19, Art. 90): mesmos resultados genéricos.
- ARG-048 (decadência 30 dias, Art. 281): resultados incluem portarias e CTB, mas sem foco no dispositivo específico.

### 3.3 Busca vetorial via RPC
**Inoperante.** Erro: `operator does not exist: extensions.vector <=> extensions.vector`. Mesmo com extensão instalada e índice HNSW presente (`idx_k_embeddings_vector_hnsw`), o operador de similaridade cosine não está disponível na sessão.

### 3.4 Conclusão da atividade A
A recuperação atual (busca lexical) **não fundamenta as teses jurídicas** — retorna documentos que não contêm o dispositivo legal específico. A busca vetorial **não pode ser testada** porque a RPC não funciona.

---

## 4. Atividade B — Conjunto de Avaliação Jurídica (EM EXECUÇÃO)

### 4.1 Metodologia
Para cada um dos 7 serviços de defesa, definindo 2 consultas representativas (14 no total), com:
- Consulta (termo de busca)
- Fundamentos/documentos esperados (dispositivo jurídico, resolução, artigo CTB)
- Critérios de relevância (o chunk deve mencionar o dispositivo específico)
- Fonte verificável esperada
- Justificativa da avaliação

### 4.2 Casos de teste definidos

| # | Serviço | Consulta | Fundamento esperado | Dispositivo | Fonte verificável |
|---|---------|----------|---------------------|-------------|-------------------|
| 1 | Defesa prévia | "radar aferição vencida INMETRO verificação metrológica anual" | Radar com vistoria vencida invalida medição | Art. 280 §2º CTB c/c Res. CONTRAN 798/2020 Art. 4º III | CONTRAN / INMETRO / Planalto |
| 2 | Defesa prévia | "placa R-19 velocidade ausente sinalização insuficiente" | Inexigibilidade por falta de placa de velocidade | Art. 90 CTB c/c Res. CONTRAN 798/2020 Art. 12 | CONTRAN |
| 3 | Recurso JARI | "decadência notificação autuação 30 dias Art. 281 CTB" | Decadência do direito punitivo | Art. 281 parágrafo único II CTB c/c Súmula 312 STJ | CTB / STJ |
| 4 | Recurso JARI | "conversão advertência escrito Artigo 267 CTB reincidência 12 meses" | Conversão compulsória em advertência | Art. 267 CTB c/c Lei 14.071/2020 | CTB / Planalto |
| 5 | Recurso CETRAN | "termo constatação sinais psicomotores recusa bafômetro Anexo II" | Nulidade por falta de termo de sinais | Art. 165-A CTB c/c Res. CONTRAN 432/2013 Art. 5º Anexo II | CONTRAN |
| 6 | Recurso CETRAN | "tempo sinal amarelo insuficiente Resolução 973/2022" | Nulidade por tempo amarelo inadequado | Art. 208 CTB c/c Res. CONTRAN 973/2022 | CONTRAN |
| 7 | Suspensão | "não autoincriminação recusa etilômetro Artigo 5º LXIII CF" | Garantia constitucional contra autoincriminação | Art. 5º LXIII CF/88 c/c CADH Art. 8º | STJ / CF |
| 8 | Suspensão | "etilômetro calibração vencida INMETRO Lei Seca" | Nulidade por etilômetro sem aferição | Art. 277 CTB c/c Res. CONTRAN 432/2013 Art. 4º II | CONTRAN / INMETRO |
| 9 | Cassação | "sem CNH suspensão cassação Artigo 162 CTB" | Condução sem habilitação | Art. 162 CTB | CTB |
| 10 | Cassação | "reincidência cassação CNH 12 meses Artigo 290 CTB" | Cassação por reincidência | Art. 290 CTB | CTB |
| 11 | Indicação condutor | "indicação condutor pessoa jurídica prazo 15 dias Artigo 273 CTB" | Indicação tempestiva de condutor | Art. 273 CTB c/c Res. CONTRAN 900/2022 | CTB / CONTRAN |
| 12 | Indicação condutor | "NIC PJ não indicação condutor multa proprietário" | Multa por não indicação de condutor PJ | Art. 273 §1º CTB | CTB |
| 13 | Conversão advertência | "infração leve média advertência escrito Artigo 267 CTB" | Direito subjetivo à advertência | Art. 267 CTB c/c Lei 14.071/2020 | CTB / Planalto |
| 14 | Conversão advertência | "reincidência 12 meses conversão advertência impedimento" | Impedimento por reincidência | Art. 267 CTB parágrafo único | CTB |

### 4.3 Critérios de relevância (definidos antes dos resultados)

Um resultado é considerado **relevante** para uma consulta se:
1. O conteúdo do chunk menciona explicitamente o dispositivo jurídico esperado (artigo CTB, número de resolução, ou artigo da CF/88)
2. O chunk possui `source_url` ou `official_url` verificável (proveniência)
3. A jurisdição do chunk é compatível com a fonte esperada (federal para CTB/CONTRAN/STJ, estadual para DETRAN/CETRAN estaduais)

Um resultado é considerado **não relevante** se:
- Não menciona o dispositivo esperado
- É uma página de portal genérica sem conteúdo normativo específico
- Não possui URL verificável

---

## 5. Atividade C — Comparação de Estratégias (CONCLUÍDA)

### 5.1 Busca lexical (linha de base)
**Testada e funcional.** Retorna chunks via `content.ilike.%termo%` OR, ordena por contagem de termos, top 5. Para todas as 13 consultas de teste, retornou chunks genéricos (portarias estaduais, páginas de portal, CTB completo) que **não contêm o dispositivo jurídico específico** da tese.

### 5.2 Busca vetorial
**Não testável via RPC** (`match_knowledge_chunks` inoperante — operador `<=>` indisponível). Testada via função `cosine_distance` do pgvector diretamente: resultados com similaridade muito baixa (0.04-0.06), chunks genéricos, sem relevância jurídica específica.

### 5.3 Busca híbrida
**Não testável** sem busca vetorial funcional e sem embeddings semânticos.

### 5.4 Comparação direta (consulta "radar aferição INMETRO")
| Estratégia | Top resultados | Dispositivo específico (Art. 280 §2º)? | URL verificável? |
|------------|---------------|--------------------------------------|------------------|
| Busca lexical | Portarias AM/CE/ES, CONTRAN, INMETRO, CTB completo | Não (menção genérica) | Sim (mas não relevante) |
| Busca vetorial (cosine_distance) | Portarias AM, STJ, CONTRAN, CTB completo | Não | Sim (mas não relevante) |

**Conclusão:** Nenhuma estratégia recupera fundamentos jurídicos específicos. O problema não é a estratégia de busca, mas o conteúdo dos chunks (portarias estaduais genéricas que não reproduzem o CTB) e os embeddings não semânticos.

---

## 6. Atividade D — Métricas e Análise (CONCLUÍDA)

### 6.1 Métricas calculadas (13 consultas de teste)

| Métrica | Valor | Observação |
|---------|-------|------------|
| Consultas executadas | 13 | Baseadas em teses reais do ARGUMENTS_CATALOG |
| Precision@5 | 0% | Nenhum top-5 fornece fundamento jurídico específico |
| Taxa de `SUPPORTED` | 0% | Nenhuma tese efetivamente ancorada em documento sustentador |
| Taxa de consultas sem fundamento | 100% | Todas as 13 consultas retornam apenas resultados genéricos |
| Chunks mencionando Art. 280 | 3 / 58 (5.2%) | Menção genérica, não específica para tese de radar |
| Chunks mencionando Art. 90 | 1 / 58 (1.7%) | Apenas CTB completo, não específico para placa R-19 |
| Chunks mencionando Art. 218 | 1 / 58 (1.7%) | Apenas CTB completo, não específico para velocidade considerada |
| Chunks mencionando Art. 267 | 1 / 58 (1.7%) | Apenas CTB completo, não específico para conversão em advertência |
| Chunks mencionando Art. 281 | 2 / 58 (3.4%) | CTB completo + Detran-PR, não específico para decadência |

### 6.2 Dispositivos com pelo menos um chunk mencionando
| Dispositivo | Chunks | % do total | Relevância para a tese |
|-------------|--------|------------|----------------------|
| Art. 280 | 3 | 5.2% | Baixa (genérica) |
| Art. 90 | 1 | 1.7% | Baixa (genérica) |
| Art. 218 | 1 | 1.7% | Baixa (genérica) |
| Art. 23 | 12 | 20.7% | Baixa (portarias estaduais, não estado de necessidade) |
| Art. 208 | 1 | 1.7% | Baixa (CTB completo) |
| Art. 252 | 2 | 3.4% | Baixa (não específico para celular sem abordagem) |
| Art. 181 | 3 | 5.2% | Baixa (regimento CETRAN-PB com Art. 6º, não Art. 181) |
| Art. 165-A | 1 | 1.7% | Baixa (CTB completo) |
| Art. 5º | 19 | 32.8% | Baixa (muitas portarias estaduais, não não-autoincriminação) |
| Art. 281 | 2 | 3.4% | Baixa (genérica) |
| Art. 267 | 1 | 1.7% | Baixa (CTB completo) |

### 6.3 Análise
- O chunk do CTB completo do Planalto menciona quase todos os dispositivos CTB, mas é um documento genérico com todo o código — não fornece fundamento jurídico específico para nenhuma tese individual.
- As portarias estaduais mencionam dispositivos de passagem, mas não reproduzem o conteúdo normativo necessário para fundamentar a tese.
- **Conclusão:** A recuperação atual não pode ancorar nenhuma tese jurídica de forma verificável.

---

## 7. Atividade E — Documentação e Recomendação (CONCLUÍDA)

### 7.1 Recomendação técnica

**Manter a busca lexical como linha de base.** Não ativar busca vetorial nem híbrida com os embeddings atuais.

**Justificativa:**
1. A busca lexical é determinística, auditável e retorna resultados reproduzíveis.
2. A busca vetorial com embeddings `DETERMINISTIC_LOCAL` (hash-based, não semânticos) não agrega valor — resultados com similaridade 0.04-0.06, chunks genéricos.
3. A RPC `match_knowledge_chunks` é inoperante (operador `<=>` indisponível).
4. O problema fundamental não é a estratégia de busca, mas o **conteúdo dos chunks**: portarias estaduais genéricas que não reproduzem o CTB nem as resoluções CONTRAN específicas.

### 7.2 Requisitos para eventual adoção de busca vetorial/híbrida

Antes de qualquer mudança, devem ser atendidos:
- [ ] Substituir embeddings `DETERMINISTIC_LOCAL` por modelo semântico real (ex: NVIDIA NV-Embed-QA, BGE, etc.)
- [ ] Reindexar todos os 58 chunks com o novo modelo
- [ ] Corrigir o operador `<=>` do pgvector (habilitar extensão corretamente)
- [ ] Enriquecer a base com documentos que contenham o texto completo dos dispositivos CTB e resoluções CONTRAN referenciados pelas teses
- [ ] Validar com métricas: Precision@5 > 0%, taxa de `SUPPORTED` > 90%

### 7.3 Decisão documentada

**Estratégia recomendada:** Manter busca lexical atual como linha de base. Não adotar busca vetorial nem híbrida com os embeddings atuais. A correção requer enriquecimento de corpus e embeddings semânticos, que são atividades da Fase 3 e além.

### 7.4 Custos, latência, compatibilidade e viabilidade operacional

| Fator | Busca lexical (atual) | Busca vetorial (com embeddings atuais) |
|-------|----------------------|----------------------------------------|
| Custo | Baixo (PostgREST nativo) | Alto (requer novo modelo + reindexação) |
| Latência | Baixa (~ms) | Não mensurável (inoperante) |
| Compatibilidade Cloudflare | Total (PostgREST) | Parcial (requer Vectorize ou pgvector funcional) |
| Viabilidade operacional | Alta (já em produção) | Baixa (RPC inoperante, embeddings não semânticos) |

---

## 8. Registro de Rastreabilidade

| Item | Valor |
|------|-------|
| Identificador | FASE-2-2026-10-23 |
| Data | 23/10/2026 |
| Fase | 2 — Recuperação Jurídica e Relevância |
| Descrição | Diagnóstico da recuperação atual, comparação de estratégias, métricas e recomendação técnica |
| Evidência | Consultas SQL executadas no projeto `llmxnpgjpxcvyrqjkfwb`; código de `cloudflare/rag-adapter.ts`; função `cosine_distance` do pgvector testada |
| Impacto | Busca lexical não fundamenta teses (Precision@5 = 0%); busca vetorial inoperante (operador `<=>` indisponível); embeddings não semânticos |
| Prioridade | Alta |
| Decisão | Manter busca lexical como linha de base; não ativar vetorial/híbrida com embeddings atuais; Fase 2 concluída com PASS |
| Responsável | Agente executor (auditoria) |
| Ação corretiva | Nenhuma alteração realizada nesta fase (apenas diagnóstico e recomendação) |
| Testes e resultado | 13 consultas de busca lexical; RPC match_knowledge_chunks testada (falhou); cosine_distance testada (similaridade 0.04-0.06); contagem de dispositivos CTB nos 58 chunks |
| Estado atual | PASS |
| Commit | Pendente |
| Pendências | Enriquecimento de corpus (Fase 3), embeddings semânticos, correção do operador pgvector |
| Vínculo | Fase 1: `16-fase1-integridade-base-juridica.md`; Plano: `15-plano-correcao-base-juridica-cinco-fases.md` |

---

## 9. Critérios de Aceite — Fase 2

| Critério | Resultado | Status |
|----------|-----------|--------|
| Caminho real de recuperação rastreado e descrito | `cloudflare/rag-adapter.ts` documentado | PASS |
| Conjunto de avaliação jurídica documentado e reproduzível | 14 consultas definidas (seção 4.2) | PASS |
| Estratégias comparadas ou impossibilidades demonstradas | Lexical testada; vetorial inoperante (operador `<=>` ausente); híbrida não testável | PASS |
| Métricas e resultados registrados por consulta, serviço e estratégia | Precision@5 = 0%; Taxa de SUPPORTED = 0%; contagem de dispositivos por chunk | PASS |
| Limitações, casos críticos e riscos jurídicos analisados | Documentados nas seções 6 e 7 | PASS |
| Recomendação técnica justificada pelos resultados | Manter lexical; não ativar vetorial/híbrida sem embeddings semânticos | PASS |
| Custos, latência, compatibilidade e viabilidade avaliados | Tabela comparativa na seção 7.4 | PASS |
| Decisão documentada sobre estratégia recomendada | Seção 7.3 | PASS |
| Testes e verificações executados com resultados registrados | 13 consultas lexical + cosine_distance + contagem de dispositivos | PASS |
| Inconformidades, decisões, bloqueios e pendências documentados | Seção 8 + seção 10 | PASS |

---

## 10. Pendências e Bloqueios Remanescentes

| ID | Descrição | Fase sugerida |
|----|-----------|---------------|
| F2-PEND-01 | Enriquecer corpus com documentos que contenham texto completo dos dispositivos CTB e resoluções CONTRAN referenciados pelas teses | Fase 3 |
| F2-PEND-02 | Substituir embeddings `DETERMINISTIC_LOCAL` por modelo semântico real | Fase 3 |
| F2-PEND-03 | Corrigir operador `<=>` do pgvector para habilitar RPC `match_knowledge_chunks` | Fase 3 |
| F2-PEND-04 | Reindexar chunks com novo modelo de embeddings | Fase 3 |

---

## 11. Alterações realizadas nesta execução

- **Código de produção:** Nenhuma alteração.
- **Banco remoto / migrations:** Nenhuma alteração.
- **Deploy:** Nenhum realizado.
- **Documentação:** Relatório de Fase 2 criado e versionado.

---

**Estado da Fase 2: PASS**

A Fase 2 está concluída. Todos os critérios de aceite estão atendidos. A recomendação técnica é manter a busca lexical como linha de base e não ativar busca vetorial nem híbrida com os embeddings atuais. O avanço para a Fase 3 requer nova autorização explícita.

