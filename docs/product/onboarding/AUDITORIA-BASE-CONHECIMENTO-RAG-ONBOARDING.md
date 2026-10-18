# AdeusMulta — auditoria da Base de Conhecimento, acervo jurídico e RAG para o novo onboarding

**Data da consulta ao banco:** 2026-10-17  
**Projeto Supabase consultado:** `llmxnpgjpxcvyrqjkfwb` (`Defesai-AdeusMultas`)  
**Natureza:** leitura de código, documentação de auditorias anteriores e consultas SQL somente de leitura. Nenhuma escrita no banco ou mudança no código do produto foi realizada nesta auditoria.

## 1. Conclusão executiva

A Base de Conhecimento deve fazer parte do desenho do novo onboarding desde o começo, mas **não pode ser tratada como uma base jurídica pronta e validada**. O banco possui um esqueleto útil de catálogo, versionamento, proveniência, chunks e embeddings, e o repositório contém registros de fontes oficiais, mecanismos de monitoramento, ingestão e recuperação. Porém, o estado real encontrado apresenta lacunas que impedem confiar nela como autoridade automática para uma análise jurídica.

A estratégia recomendada é:

1. Simplificar a coleta no onboarding com upload do documento, extração de dados e confirmação pelo usuário.
2. Usar apenas os dados necessários para determinar o processo, a jurisdição, o órgão e a linha temporal.
3. Consultar a Base de Conhecimento com esses filtros **depois de validar conteúdo, vigência e proveniência**.
4. Transformar os trechos recuperados em evidência citável para análise e minuta; nunca permitir que a recuperação lexical ou semântica, por si só, decida que uma tese é juridicamente válida.
5. Perguntar apenas pelos fatos que o documento não forneceu e que sejam materialmente necessários para uma conclusão. Se faltar fato crítico ou fonte válida, explicar a lacuna em vez de inventar resposta.
6. Reavaliar integralmente o schema, a ingestão e o RAG antes de decidir se devem ser mantidos, corrigidos ou substituídos.

## 2. Estado observado no banco de dados

Contagens consultadas diretamente no projeto Supabase:

| Entidade | Registros |
|---|---:|
| `knowledge_sources` | 39 |
| `knowledge_documents` | 66 |
| `knowledge_document_versions` | 66 |
| `knowledge_chunks` | 58 |
| `knowledge_embeddings` | 58 |
| `knowledge_ingestions` | 0 |
| `knowledge_document_relations` | 0 |

Também confirmado:

- 66 de 66 documentos têm `legal_status = UNKNOWN`.
- 66 de 66 documentos têm `effective_state = UNKNOWN`.
- 66 de 66 versões têm o campo `content` vazio; o conteúdo presente nos chunks é separado e não prova que cada arquivo original foi extraído de forma completa.
- 39 de 39 fontes têm `knowledge_sources.url` vazio. As versões têm `source_url`, mas isso distribui a proveniência em outra entidade e precisa ser mantido consistente.
- Todos os 66 documentos aparecem com `status = ACTIVE`, mesmo quando sua situação jurídica e vigência são desconhecidas. Esse status não pode ser interpretado como aprovação jurídica.
- Nenhuma relação normativa está registrada em `knowledge_document_relations`.
- Não há registros de execução em `knowledge_ingestions`; portanto, o banco não apresenta histórico operacional de ingestões nessa tabela.

### Distribuição por tipo e cobertura de chunks

- 11 documentos classificados como resolução; 9 deles não têm chunks.
- 8 portarias; 1 sem chunks.
- 6 formulários; 1 sem chunks.
- 2 decretos; 1 sem chunks.
- 12 serviços, 6 documentos classificados como legislação, 3 portais, 3 regimentos internos e outros itens menores.
- Há tipos documentais heterogêneos no mesmo conjunto: leis, resoluções, portarias, formulários, portais de serviço, informações jurídicas e páginas institucionais. Eles não têm a mesma força normativa nem devem participar da análise da mesma maneira.

### Integridade e tamanho dos chunks

- 58 chunks e 58 embeddings.
- Mediana de tamanho do chunk: 3.427 caracteres.
- Mínimo: 13 caracteres.
- Máximo: 603.962 caracteres.
- 5 chunks têm menos de 200 caracteres; 8 têm menos de 500.
- 47 de 58 chunks não têm `article_number`.

O maior chunk tem aproximadamente 604 mil caracteres, tamanho excessivo para recuperação precisa de um dispositivo legal. Ao mesmo tempo, há chunks minúsculos e documentos sem qualquer chunk. Isso sugere fragmentação desigual e provável mistura de conteúdos de naturezas distintas. É necessário inspecionar o conteúdo real, seus limites e sua correspondência com o arquivo original antes de escolher uma estratégia de chunking.

## 3. O que existe no código e pode ser avaliado como capacidade

O repositório registra componentes que podem servir como material de investigação:

- `src/core/knowledge/sources-registry.ts`: catálogo de 67+ fontes oficiais alegadas, distribuídas por jurisdição e categoria.
- `src/core/knowledge/national-registry.ts`: registros de estados e órgãos, com portais e canais de protocolo.
- `SourceFetcher` e `WeeklyMonitorService`: coleta e monitoramento periódico, comparação por hash e fila de revisão humana descritos em auditoria anterior.
- `src/server/knowledge/ingestion-service.ts`, `chunking-service.ts`, `embedding-service.ts` e `vector-store.ts`: pipeline de ingestão, chunking e busca que deve ser revisto em código e testes.
- `cloudflare/rag-adapter.ts`: adaptador usado no caminho Cloudflare para recuperar trechos da KB e anexar proveniência às teses elegíveis do motor determinístico.
- Modelo relacional `source → document → version → chunk → embedding`, com hash, URL de origem e jurisdição.

Isso é **capacidade de infraestrutura existente**, não evidência de qualidade jurídica, completude documental ou acurácia do RAG. O catálogo de fontes também não comprova que todos os documentos dessas fontes foram efetivamente baixados, extraídos, revisados ou estão vigentes.

## 4. Risco técnico identificado no caminho RAG

O código atual de `cloudflare/rag-adapter.ts` usa busca lexical por `content.ilike` no texto dos chunks. Os termos são derivados do artigo e da descrição da infração, a busca limita a consulta a 200 linhas, pontua por número de termos encontrados e retorna até 5 trechos. O próprio código registra que o caminho vetorial anterior usava um embedding determinístico por hashing e um limiar inatingível, deixando de recuperar conteúdo útil.

Implicações:

- A existência de uma coluna `vector` e de uma RPC `match_knowledge_chunks` não significa que o runtime esteja usando busca vetorial confiável.
- A busca lexical atual pode ser útil para termos exatos e referências normativas, mas não equivale a busca semântica robusta; depende de termos de entrada, grafias e qualidade dos chunks.
- Um resultado vazio, um erro de consulta e a ausência de uma fonte aplicável precisam ser estados distintos. Não se deve transformar ausência de recuperação em sucesso jurídico.
- A recuperação não valida automaticamente vigência, hierarquia normativa, jurisdição, pertinência processual nem se a fonte recuperada sustenta a proposição.
- A regra de fallback precisa ser revista: nenhum caminho de fallback pode fabricar fundamento ou permitir que uma análise sem fonte elegível pareça fundamentada.
- O uso de `ACTIVE` sem um gate de vigência cria risco de tratar um registro como consultável quando sua validade ainda não foi verificada.

A análise do código atual é preliminar: antes de aprovar ou descartar o adaptador, verificar o restante do caminho de produção, a implementação determinística que ele chama, as consultas efetivas e os testes do runtime implantado.

## 5. Como a base deve melhorar o onboarding sem torná-lo complexo

A base jurídica deve tornar o formulário **menor e mais contextual**, e não aumentar a quantidade de perguntas.

### Fluxo proposto para investigação e prototipação

1. **Entrada simples:** solicitar foto ou PDF da notificação/auto. Informar de forma clara o que é aceito e por que o documento é necessário.
2. **Extração assistida:** OCR extrai placa, número do auto, código/descrição, data, local, órgão, datas de notificação e demais campos que estiverem realmente presentes.
3. **Confirmação humana:** mostrar os dados extraídos de forma legível; destacar o que está ilegível, ausente ou contraditório. Nunca preencher silêncio com valor padrão.
4. **Determinação do contexto:** identificar modalidade e fase do processo, jurisdição, órgão competente, datas relevantes e tipo de infração. Não decidir a fase apenas pelo nome do arquivo ou por uma única palavra do OCR.
5. **Perguntas condicionais mínimas:** só perguntar os fatos necessários para testar regras potencialmente aplicáveis. Exibir linguagem simples, exemplos curtos e opção explícita “não sei” quando possível. Não perguntar novamente o que já foi confirmado no documento.
6. **Consulta controlada à KB:** recuperar somente documentos e dispositivos que correspondam ao contexto e passem pelos critérios de conteúdo, proveniência, vigência e revisão jurídica exigidos.
7. **Análise explicável:** separar (a) fatos confirmados, (b) fatos declarados pelo usuário, (c) inferências de OCR, (d) regras verificadas, (e) pontos inconclusivos. Cada fundamento deve apontar para trecho, documento, versão e URL.
8. **Minuta individualizada:** incluir apenas argumentos com fatos que os sustentem e base normativa verificada. Se a KB não cobrir o procedimento, pedir revisão humana ou declarar indisponibilidade; não gerar teses genéricas como se fossem específicas.
9. **Orientação de entrega:** apresentar prazo e canal de protocolo somente quando verificados para o órgão e procedimento identificados. Não afirmar que houve protocolo se o produto apenas gerou um documento.

### Princípio para reduzir perguntas

A KB não deve ser chamada para inventar quais fatos perguntar. Primeiro, uma matriz de requisitos jurídicos validada identifica quais fatos são necessários para cada regra. O onboarding coleta os dados, e a matriz determina quais perguntas condicionais ainda faltam. O RAG fornece o texto-fonte e o contexto documental para fundamentar a explicação. Essa separação reduz perguntas e evita que o modelo transforme coincidências de texto em requisitos jurídicos.

## 6. Critérios de elegibilidade de documentos para uso jurídico

Um documento não deve ser utilizável como fundamento automático só por estar armazenado ou ter chunks.

Para cada documento, exigir:

- arquivo físico identificado e hash verificável;
- URL de origem e autoridade emissora;
- tipo de documento e nível normativo;
- jurisdição e órgão/competência;
- texto extraído completo, com indicação de falhas de OCR, páginas ausentes e anexos;
- identificador/versionamento da norma e cadeia de alterações, revogações ou substituições;
- vigência temporal confirmada para a data relevante do caso;
- relações normativas com evidência, não inferidas por similaridade;
- aprovação jurídica quando o uso for para sustentar conclusão ou minuta;
- chunks ligados à versão exata, com artigo, seção, página ou dispositivo quando disponível;
- teste de recuperação que demonstre que perguntas conhecidas recuperam o trecho correto e excluem normas inadequadas.

Estados recomendados distintos: `DISCOVERED`, `DOWNLOADED`, `EXTRACTED`, `STRUCTURALLY_VALIDATED`, `LEGAL_REVIEW_PENDING`, `APPROVED_FOR_USE`, `SUPERSEDED`, `REVOKED`, `REJECTED`. Não reutilizar `ACTIVE` como sinônimo de “vigente e juridicamente aprovado”.

## 7. Avaliação do RAG — antes de usar no fluxo pago

Construir um conjunto de perguntas e casos de referência aprovado por especialistas. Para cada caso, registrar:

- fatos de entrada e fatos ausentes;
- norma/dispositivo aplicável e fonte oficial;
- trechos que devem ser recuperados;
- trechos parecidos mas inadequados que devem ser excluídos;
- tese que pode ou não ser emitida;
- resposta esperada quando a evidência é insuficiente;
- critérios de completude, correção e fidelidade das citações.

Medir separadamente:

- recuperação: relevância, recall/precision em trechos e taxa de ausência indevida;
- atribuição: cada afirmação jurídica relevante está apoiada no trecho citado?
- validade: a norma se aplicava na data e jurisdição do caso?
- fidelidade: o texto gerado não extrapola o que a fonte diz?
- completude: fatos e requisitos necessários foram cobertos?
- abstinência: o sistema se recusa a concluir quando não há evidência suficiente?
- robustez: OCR ruim, artigo inexistente, UF ausente, norma revogada, resultados conflitantes e tentativa de prompt injection em documentos.
- custo e latência: retrieval e geração têm limites claros sem cortar evidência crítica.

A avaliação deve separar métricas de recuperação das métricas do documento final. Um documento bem escrito não prova que recuperou a norma correta; um chunk correto não prova que a tese se aplica ao caso.

## 8. Referências externas para orientar a revisão

- Governo Digital, **Guia de Introdução ao RAG no Setor Público**: enfatiza qualidade, completude, atualização, supervisão humana e verificação das fontes. https://www.gov.br/governodigital/pt-br/infraestrutura-nacional-de-dados/inteligencia-artificial-1/publicacoes/guia-de-rag
- NIST, **On the Evaluation of Machine-Generated Reports**: propõe avaliar completude, precisão e verificabilidade das citações vinculadas às fontes. https://www.nist.gov/publications/evaluation-machine-generated-reports
- OWASP, **RAG Security Cheat Sheet**: recomenda proveniência explícita por documento/chunk e hash, além de considerar riscos de documentos maliciosos. https://cheatsheetseries.owasp.org/cheatsheets/RAG_Security_Cheat_Sheet.html
- NIST, **Generative AI Profile (AI RMF)**: referência para governança, proveniência, avaliação e monitoramento de risco de IA. https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence

Estas referências orientam o desenho; não certificam a arquitetura atual.

## 9. Próxima etapa recomendada

Antes de mudar a interface, realizar uma auditoria de conteúdo e fluxo com quatro entregáveis:

1. **Inventário físico do acervo:** comparar os arquivos realmente baixados com os 66 registros do banco e os 75 arquivos físicos reportados na fase anterior; verificar hashes, extração, anexos, páginas, OCR e arquivos ausentes. O inventário físico ainda não foi inspecionado nesta execução.
2. **Matriz de qualidade documental:** classificar cada documento por autoridade, tipo, jurisdição, completude, vigência, estado de revisão e elegibilidade para uso.
3. **Auditoria ponta a ponta do RAG:** confirmar runtime implantado, retrieval realmente chamado, chunks retornados, filtros temporais/jurisdicionais, provenance e fallback. Executar casos golden e negativos.
4. **Especificação do onboarding mínimo:** mapear cada pergunta a um requisito validado, cada requisito a fatos necessários e cada fundamento à fonte elegível. Remover perguntas que não alterem a decisão ou a minuta.

### Bloqueio para o novo onboarding

**Não usar a KB atual para emitir conclusões jurídicas automáticas até que documentos e regras críticos tenham estado de revisão aprovado e o RAG passe pelos testes de recuperação, vigência, jurisdição e atribuição.** É possível desenhar a experiência e a arquitetura de integração agora, mas o produto deve degradar para “precisamos confirmar esta informação” quando a base não sustentar uma resposta.

## 10. Fontes internas consultadas

- `docs/recovery/FASE-8-INVENTARIO-RASPAGEM-OFICIAL-BASE-JURIDICA-RESUMO.md`
- `docs/recovery/FASE-9-IMPLEMENTACAO-NORMALIZACAO-2026-09-24.md`
- `docs/recovery/FASE-12-GOLDEN-DOCUMENT-ACCURACY-2026-09-25.md`
- `docs/recovery/FASE-12.1-AUDITORIA-ONBOARDING-2026-09-25.md`
- `docs/recovery/FASE-FINAL-CERTIFICACAO-PRODUCAO-2026-10-13.md`
- `src/core/knowledge/sources-registry.ts`
- `cloudflare/rag-adapter.ts`
- `supabase/migrations/20260925150000_fase_12_3_add_match_knowledge_chunks_rpc.sql`

**Limite desta auditoria:** contagens e metadados foram conferidos no banco em 2026-10-17. A inspeção integral dos arquivos físicos, extração completa dos documentos, revisão jurídica individual e testes end-to-end do runtime não foram executados nesta etapa; por isso, este relatório não declara a base validada.
---

## Auditoria de seguimento — 2026-10-17

A auditoria de integridade documental, extração e recuperação foi registrada em [FASE-13-AUDITORIA-INTEGRIDADE-EXTRACAO-RAG-2026-10-17.md](../../recovery/FASE-13-AUDITORIA-INTEGRIDADE-EXTRACAO-RAG-2026-10-17.md).

Conclusões atualizadas: 66/66 IDs e hashes de metadados conferem entre manifesto e banco, mas somente 54/66 caminhos físicos esperados estão versionados na main; há evidências de texto corrompido, conteúdo de erro indexado, chunks excessivos, 13 documentos sem chunks e ausência de filtros de jurisdição/vigência no caminho lexical da análise. O RAG não deve ser considerado juridicamente pronto.