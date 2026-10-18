# Fase 13 — Auditoria de integridade documental, extração e recuperação RAG

**Data:** 2026-10-17  
**Repositório:** `Tokenizaa/AdeusMultas-Defesa-` — `main`  
**Supabase:** `llmxnpgjpxcvyrqjkfwb`  
**Escopo:** somente leitura do banco, manifesto, arquivos versionados e código do pipeline. Nenhuma alteração em dados, schema, embeddings ou deploy foi realizada.

## 1. Conclusão executiva

A base não está apta a ser considerada uma base jurídica validada para fundamentar automaticamente análises ou minutas. Há rastreabilidade de IDs e hashes entre o manifesto e o banco, mas não existe comprovação suficiente de integridade física de todos os arquivos, completude da extração, vigência jurídica ou qualidade da recuperação.

O snapshot atual comprova uma discrepância de reprodutibilidade: **66 registros elegíveis no manifesto, 66 documentos e versões no banco, mas apenas 54 dos 66 caminhos esperados de arquivos estão versionados na `main`**. Há 12 caminhos ausentes. O diretório de coleta contém 62 arquivos versionados no total, incluindo artefatos adicionais de tentativas falhas/recuperação.

Os hashes armazenados no banco coincidem com os hashes do manifesto em 66/66 registros. Isso comprova consistência entre dois registros de metadados, **não** que os bytes dos arquivos atuais foram novamente hasheados e conferidos. Essa verificação física completa permanece pendente.

## 2. Confronto manifesto ↔ banco ↔ arquivos

### Contagens confirmadas no Supabase real

| Medida | Resultado |
|---|---:|
| Fontes | 39 |
| Documentos | 66 |
| Versões | 66 |
| Chunks | 58 |
| Embeddings | 58 |
| Execuções registradas em `knowledge_ingestions` | 0 |
| Relações normativas em `knowledge_document_relations` | 0 |
| Versões com `content` vazio | 66/66 |
| Documentos sem chunks | 13/66 |
| Chunks sem embedding | 0/58 |
| Fontes com `knowledge_sources.url` vazio | 39/39 |
| Versões com `source_url` vazio | 0/66 |
| Documentos com `legal_status=UNKNOWN` | 66/66 |
| Documentos com `effective_state=UNKNOWN` | 66/66 |
| Documentos marcados `ACTIVE` | 66/66 |

### Correspondência de IDs e hashes registrados

- O manifesto Fase 8 contém 66 linhas elegíveis com caminhos em `legal_collected_2026_09_23/`.
- Todos os 66 IDs correspondem a um documento no Supabase.
- Os 66 `content_hash` de `knowledge_document_versions` são iguais aos hashes SHA-256 anotados no manifesto.
- Não foi possível recalcular o SHA-256 dos bytes de todos os arquivos nesta execução. Logo, a igualdade acima não deve ser descrita como verificação física atual.
- O campo `content` vazio nas 66 versões é consistente com a anotação `NOT_STORED_FASE9`; o texto recuperável foi colocado em chunks separados. Isso não comprova que o texto integral de cada arquivo foi preservado.

### Caminhos de arquivo esperados ausentes da árvore Git da `main`

1. `federal/senatran.html` — `SRC_FED_SENATRAN_PORTAL`
2. `federal/contran_resolutions.html` — `SRC_FED_CONTRAN_RESOLUCOES`
3. `federal/prf.html` — `SRC_FED_PRF_PORTAL`
4. `federal/anttr.html` — `SRC_FED_ANTT_PORTAL`
5. `federal/inmet.html` — `SRC_FED_INMETRO_RADARES`
6. `federal/dou.html` — `SRC_FED_DOU`
7. `federal/stj.html` — `SRC_FED_STJ_JURISPRUDENCIA`
8. `states/ES/recurso_de_multa_online.html` — `SRC_ES_DETRAN_RECURSO_MULTA_ONLINE`
9. `states/ES/resolucao_cetran_es_2026_20.pdf` — `SRC_ES_CETRAN_RESOLUCAO_20_2026`
10. `states/GO/requerimento_defesa_previa_recurso_detran_go.pdf` — `SRC_GO_DETRAN_DEFESA_PREVIA_PF`
11. `states/GO/resolucao_cetran_go_1999_003.pdf` — `SRC_GO_CETRAN_RESOLUCAO_1999_003`
12. `states/MG/apresentar_defesa_previa_mg.html` — `SRC_MG_DETRAN_DEFESA_PREVIA_PF`

Os caminhos acima são relativos a `docs/recovery/legal_collected_2026_09_23/`. Alguns arquivos alternativos versionados são payloads de erro ou tentativas de recuperação, não substitutos automaticamente válidos. Exemplo: para a compilação de resoluções CONTRAN, existem arquivos de tentativa de 26 bytes, mas o caminho esperado `contran_resolutions.html` não existe na árvore atual.

### Documentos sem chunks

- `SRC_AC_DETRAN_PORTARIA_NOVA_PROCURAA`
- `SRC_AL_CETRAN_RESOLUCAO_01_2000`
- `SRC_AL_CETRAN_RESOLUCAO_02_2000`
- `SRC_AL_CETRAN_RESOLUCAO_04_2002`
- `SRC_CE_DETRAN_INSTRUCAO_SERVICO_004_2007_COHAB`
- `SRC_CE_CETRAN_RESOLUCAO_001_2013`
- `SRC_CE_CETRAN_RESOLUCAO_001_2014`
- `SRC_CE_CETRAN_RESOLUCAO_003_2019`
- `SRC_CE_CETRAN_RESOLUCAO_005`
- `SRC_CE_CETRAN_RESOLUCAO_006`
- `SRC_GO_DETRAN_DEFESA_PREVIA_PF`
- `SRC_GO_CETRAN_RESOLUCAO_1999_003`
- `SRC_PI_CETRAN_DECRETO_22731_2024`

A existência do arquivo no Git não garante que ele tenha sido extraído e indexado; a ausência de chunks impede sua recuperação pelo caminho lexical atual.

## 3. Qualidade e integridade da extração

### Evidências no conteúdo armazenado

- Tamanho dos chunks: mínimo 13 caracteres, mediana 3.427 e máximo 603.962 caracteres.
- 5 chunks têm menos de 200 caracteres; 8 têm menos de 500.
- 47/58 chunks não têm `article_number`.
- 25 chunks contêm marcadores compatíveis com texto corrompido por codificação (`Ã` ou caractere de substituição); 2 contêm U+FFFD.
- O chunk do CTB contém exemplos como `Presid�ncia da Rep�blica` e `N� 9.503`, evidência direta de corrupção de caracteres.
- Os chunks do DETRAN-CE para “Defesa de autuação” e “Recurso JARI” contêm exatamente `Ceará Digital` (13 caracteres), embora estejam registrados como documentos de serviço distintos.
- Outros chunks contêm apenas títulos de página ou estado de carregamento, por exemplo `Portal - Detran-SP Carregando. . .` (34 caracteres), em vez de conteúdo suficiente para fundamentação jurídica.
- A compilação de resoluções CONTRAN ocupa dois chunks de aproximadamente 302 mil e 604 mil caracteres. Isso não corresponde à janela de aproximadamente 1.800 caracteres documentada no chunker.

### Causas técnicas observadas no pipeline Fase 11

Arquivo: `src/server/knowledge/cli/fase11-ingest.ts`

1. `canonicalize()` substitui toda sequência de whitespace, inclusive quebras de linha, por espaços antes de chamar o chunker. O chunker usa linhas e padrões de início de artigo para preservar a hierarquia normativa; portanto, essa canonicalização elimina a estrutura que o chunker precisa.
2. A extração HTML usa `readFileSync(file, 'utf8')` sem detecção de charset. O conteúdo armazenado do CTB mostra o efeito de decodificação incompatível.
3. A validação rejeita texto vazio e alguns marcadores de erro, mas não exige comprimento mínimo, presença do título/identificador esperado, número mínimo de páginas/artigos ou proporção plausível entre tamanho de arquivo e texto extraído.
4. A função SHA-256 é declarada, mas o fluxo de ingestão não compara o hash calculado do arquivo com o hash do manifesto antes de indexar.
5. O conjunto elegível inclui `DUPLICATA_EXATA`, então duplicatas podem ser ingeridas em vez de serem ignoradas ou explicitamente ligadas ao registro canônico.
6. O CLI persiste chunks e embeddings, mas não persiste o texto integral da versão nem cria registros em `knowledge_ingestions`. Isso explica o campo `content` vazio e o histórico de ingestão zerado; também impede auditar o resultado de cada execução apenas pelo banco.

## 4. Embeddings e caminho de recuperação ponta a ponta

### Embeddings no Supabase

As 58 linhas de `knowledge_embeddings` usam exclusivamente:

- Provider: `DETERMINISTIC_LOCAL`
- Model: `defesai-legal-vectorizer-v1`
- Dimensão: 1024

O código de `src/server/knowledge/embedding-service.ts` confirma que esse vetor é um fallback local baseado em hashing de palavras/bigramas, não um embedding semântico produzido por um modelo remoto. A presença de 58 vetores, portanto, não comprova recuperação semântica adequada.

### Caminho usado pelo gerador de defesa na `main`

O código de `cloudflare/routes/cases.ts` chama `analyzeInfractionCompat()`, que usa `cloudflare/rag-adapter.ts`. O caminho atual é:

1. extrair termos do artigo CTB e descrição;
2. buscar chunks com filtros lexicais `content.ilike`;
3. limitar a consulta inicial a 200 linhas;
4. ordenar pelo número de termos encontrados e selecionar até 5;
5. buscar versões/fontes para montar a proveniência;
6. associar resultados às teses do Rule Engine procurando referências textuais de artigos/resoluções;
7. passar a análise à montagem determinística do documento e ao Quality Gate.

**Esse caminho não chama `match_knowledge_chunks` nem consulta os embeddings do Supabase.** A documentação histórica da Fase 12.5 descreve uma chamada pgvector que não corresponde ao código atual da `main`; deve ser tratada como evidência histórica, não como prova do caminho vigente.

### Falhas do caminho lexical

- O método `extractJurisdiction()` existe no adaptador, mas não é usado pela busca lexical.
- A consulta lexical não filtra jurisdição, estado de vigência, validade jurídica nem versão atual; tampouco faz join com `knowledge_documents` para excluir documentos revogados/arquivados.
- Como todos os 66 documentos estão `ACTIVE` com validade jurídica desconhecida, o status não funciona como gate de elegibilidade.
- Uma consulta de teste direto no conteúdo do banco com termos equivalentes a “Art. 165-A / recusa / etilômetro” recuperou chunks do CTB, da compilação do CONTRAN e de uma portaria do Amazonas. Isso demonstra que a recuperação lexical pode misturar fontes de escopos distintos quando os termos coincidem.
- A proveniência considera uma tese suportada quando encontra referência textual compatível e URL na versão. Isso não comprova, por si só, vigência, competência territorial ou que o conteúdo recuperado sustente juridicamente a tese.
- Se a recuperação lança erro, `analyzeInfraction()` devolve uma análise de fallback com `status: completed`, zero teses e procedimento `recurso_jari`. O Quality Gate inclui um check de proveniência, mas uma lista vazia passa nesse check por vacuidade; os outros checks ainda podem bloquear o documento. A falha de recuperação não é representada como um estado terminal explícito de análise indisponível.

### Segundo mecanismo, separado

`cloudflare/routes/knowledge.ts` implementa `POST /knowledge/search` usando Workers AI `@cf/baai/bge-base-en-v1.5` e o índice Cloudflare Vectorize `adeusmulta-knowledge`. O endpoint de indexação escreve nesse índice separado. O CLI Fase 11 escreve no Supabase (`knowledge_chunks` e `knowledge_embeddings`) e não chama o endpoint de indexação Vectorize. Não há evidência nesta auditoria de que o índice Vectorize contenha o mesmo corpus dos 66 documentos. Logo, existem dois mecanismos distintos, sem sincronização demonstrada, e eles não devem ser tratados como um único RAG validado.

## 5. Estado de prontidão

| Controle | Estado |
|---|---|
| IDs manifesto ↔ documentos ↔ versões | CONFIRMADO 66/66 |
| Hashes de metadados no banco ↔ manifesto | CONFIRMADO 66/66 |
| SHA-256 recalculado dos bytes atuais | NÃO VERIFICADO |
| Todos os 66 arquivos disponíveis na `main` | FALHA: 54/66 caminhos esperados presentes |
| Extração integral e sem corrupção | FALHA: evidência de mojibake, conteúdo curto e chunks excessivos |
| Conteúdo integral preservado em `knowledge_document_versions.content` | NÃO: 0/66 |
| Cobertura de chunks | INCOMPLETA: 13 documentos sem chunks |
| Vigência e situação jurídica | NÃO VALIDADA: 66/66 UNKNOWN |
| Busca por jurisdição e vigência | NÃO IMPLEMENTADA no caminho lexical auditado |
| Proveniência como prova jurídica suficiente | NÃO DEMONSTRADA |
| Sincronização Supabase embeddings ↔ Cloudflare Vectorize | NÃO DEMONSTRADA |
| Golden test de recuperação com casos positivos/negativos | INSUFICIENTE nesta execução |
| Teste HTTP real do Worker em produção | NÃO EXECUTADO nesta execução; a ferramenta de navegação disponível recusou a chamada por falta de créditos |

## 6. Decisão e próximos passos obrigatórios

**Não usar o acervo atual como fonte jurídica automática aprovada.** Manter o banco intacto até uma nova carga reproduzível e validada; não “corrigir” os dados por atualização pontual sem preservar a trilha.

A ordem correta de trabalho é:

1. Recuperar/versionar os 12 arquivos ausentes ou corrigir o manifesto com evidência para qualquer caminho alternativo; não substituir por payloads de erro.
2. Executar verificação de bytes: SHA-256 real de cada arquivo contra o manifesto, assinatura/MIME, tamanho, páginas PDF e duplicatas.
3. Reextrair em ambiente de prova com detecção de charset, preservação da estrutura legal, validação de título/número e relatório por arquivo. Não escrever na base canônica ainda.
4. Comparar texto extraído integral com o arquivo fonte e gerar relatório de páginas/trechos ausentes, corrupção de caracteres, conteúdo de erro e proporção de extração.
5. Corrigir a ingestão para persistir conteúdo da versão, hash verificado, resultado de ingestão e métricas de extração; não aceitar documentos que falhem nos gates.
6. Redesenhar chunking para respeitar a hierarquia jurídica sem colapsar quebras de linha; definir limites de tamanho verificáveis e testes de artigos/itens/anexos.
7. Definir uma única arquitetura de recuperação. O corpus usado no caminho real de análise deve ter filtros de jurisdição, validade temporal e status aprovado. O índice de busca deve ser construído pela mesma pipeline e ter reconciliação verificável com o Supabase.
8. Criar testes dourados para recuperação correta, documento de jurisdição errada, versão revogada, conteúdo incompleto, OCR/charset ruim, fonte genérica, ausência de evidência e abstinência obrigatória.
9. Só depois da validação técnica, encaminhar os documentos e regras a revisão jurídica humana. `ACTIVE` não equivale a aprovado juridicamente.

## 7. Evidências consultadas

- `docs/recovery/FASE-8-INVENTARIO-DOCUMENTAL-OFICIAL-2026-09-23.md`
- `docs/recovery/FASE-8-RECUPERACAO-PAYLOADS-INVALIDOS-2026-09-24.md`
- `docs/recovery/FASE-10-VALIDACAO-JURIDICA-COBERTURA-2026-09-24.md`
- `docs/recovery/FASE-12.5-GOLDEN-PATH-RESULTADO-2026-09-25.md` (histórico; descreve caminho vetorial divergente do código atual)
- `src/server/knowledge/cli/fase11-ingest.ts`
- `src/server/knowledge/chunking-service.ts`
- `src/server/knowledge/embedding-service.ts`
- `cloudflare/rag-adapter.ts`
- `cloudflare/routes/cases.ts`
- `cloudflare/routes/knowledge.ts`
- Consultas somente leitura no Supabase em 2026-10-17.
