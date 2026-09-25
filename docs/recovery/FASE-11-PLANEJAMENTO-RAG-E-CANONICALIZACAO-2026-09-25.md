# FASE 11 — PLANEJAMENTO DE EXTRAÇÃO, CANONICALIZAÇÃO E RAG

**Data:** 2026-09-25  
**Status:** 📋 PLANEJADA — IMPLEMENTAÇÃO NÃO INICIADA  
**Checkpoint de origem:** `07c6afbe6a387161ea61817ff8f52692d58ae854`  
**Escopo:** conteúdo jurídico, canonicalização, chunking, embeddings e indexação  
**Regra:** nenhum código de implementação da Fase 11 deve ser iniciado antes da aprovação deste planejamento.

---

## 1. Objetivo

A Fase 11 é a etapa que transforma o acervo jurídico **estruturalmente normalizado e validado nas Fases 9 e 10** em conteúdo jurídico rastreável e tecnicamente preparado para recuperação semântica.

O objetivo não é simplesmente gerar embeddings.

O objetivo é construir uma cadeia verificável:

```
fonte oficial
  ↓
documento
  ↓
versão
  ↓
conteúdo original/extraído
  ↓
conteúdo canonicalizado
  ↓
chunk
  ↓
embedding
  ↓
índice
  ↓
retrieval
  ↓
evidência/proveniência
```

Cada trecho recuperado deverá continuar vinculado à sua origem.

---

## 2. Estado de partida

A Fase 10 terminou com:

- **39 sources**
- **66 documents**
- **66 versions**
- `current_version_id` íntegro em 66/66
- relações jurídicas: **0**, sem relações inventadas
- chunks: **0**
- embeddings: **0**
- RAG: **não iniciado**
- RLS: **7/7 ON**
- operações destrutivas: **0**
- hashes alterados: **0**
- inventory IDs perdidos: **0**

A classificação atual dos documentos para RAG é:

- **66 RAG_REQUIRES_HUMAN_VALIDATION**
- **10 RAG_BLOCKED**

A Fase 11 não deve promover automaticamente todos os 66 documentos para processamento.

---

## 3. Princípios obrigatórios

### 3.1 Proveniência primeiro

Nenhum conteúdo processado pode perder sua origem.

Cada conteúdo deverá ser rastreável, no mínimo, a:

- source;
- document;
- version;
- arquivo ou origem oficial;
- URL;
- hash;
- data de coleta;
- localização no documento, quando disponível.

### 3.2 Não alterar o conteúdo jurídico

Canonicalização significa remover ruído técnico e estruturar o conteúdo.

Não significa:

- resumir;
- interpretar;
- corrigir juridicamente;
- atualizar normas;
- completar trechos ausentes;
- inferir vigência;
- inferir revogação;
- combinar normas diferentes.

O texto jurídico original deve permanecer preservado.

### 3.3 Determinismo

Os resultados devem ser reproduzíveis.

Identificadores, hashes, versões de conteúdo e chunks devem seguir regras determinísticas.

### 3.4 Idempotência

Executar novamente o processamento não deve:

- duplicar documentos;
- duplicar versões;
- duplicar chunks;
- gerar embeddings incompatíveis sem controle de versão;
- apagar evidências.

### 3.5 Evidência antes de RAG

Documento sem conteúdo confiável, provenance ou validação suficiente não entra automaticamente no índice.

---

# 4. Escopo da Fase 11

A Fase 11 será planejada em dez blocos técnicos:

```
11-A  Contrato de conteúdo
11-B  Elegibilidade
11-C  Extração
11-D  Validação da extração
11-E  Canonicalização
11-F  Proveniência e versionamento
11-G  Chunking
11-H  Embeddings
11-I  Indexação
11-J  Golden Path do RAG
```

Esses blocos são **etapas internas de uma única Fase 11**.

Não constituem autorização para criar microfases independentes.

---

# 5. 11-A — Contrato de conteúdo

Antes da implementação deverá ser definido o contrato do conteúdo jurídico processado.

O contrato deve distinguir:

- conteúdo original;
- conteúdo extraído;
- conteúdo canonicalizado;
- conteúdo utilizado para embedding.

Cada representação deverá possuir identidade e hash próprios.

Modelo conceitual:

```
DocumentVersion
  ├── original artifact
  ├── extracted content
  ├── canonical content
  └── processing metadata
```

Nenhuma representação processada deve substituir silenciosamente a representação original.

---

# 6. 11-B — Elegibilidade

Cada documento deverá ser avaliado antes da extração/indexação.

Estados:

```
RAG_ELIGIBLE
RAG_BLOCKED
RAG_REQUIRES_HUMAN_VALIDATION
```

### RAG_ELIGIBLE

Somente quando houver evidência suficiente de:

- identidade;
- origem;
- integridade;
- jurisdição;
- pertinência;
- conteúdo acessível;
- conteúdo extraível;
- provenance;
- condições mínimas de validade jurídica definidas pela Fase 10.

### RAG_BLOCKED

Quando existir bloqueio objetivo, como:

- arquivo inválido;
- payload de erro;
- origem não confiável;
- conteúdo indisponível;
- documento fora do escopo;
- ausência de provenance essencial.

### RAG_REQUIRES_HUMAN_VALIDATION

Quando o documento puder ser processado tecnicamente, mas ainda faltar validação substantiva necessária para uso jurídico seguro.

**Não promover automaticamente os 66 documentos.**

---

# 7. 11-C — Extração

A extração deverá suportar os tipos de conteúdo efetivamente existentes no acervo.

Prioridades:

1. PDF válido;
2. HTML oficial;
3. demais formatos comprovadamente presentes.

Para PDFs:

- detectar magic bytes;
- extrair texto;
- preservar páginas;
- detectar texto vazio;
- detectar extração incompleta;
- registrar páginas problemáticas.

Para HTML:

- remover elementos de navegação;
- preservar conteúdo normativo;
- identificar título e estrutura;
- registrar URL de origem;
- preservar o HTML original quando aplicável.

A extração deve registrar:

```
input_hash
output_hash
extractor
extractor_version
extracted_at
page_count
text_length
extraction_status
```

---

# 8. 11-D — Validação da extração

Antes da canonicalização, validar se a extração representa adequadamente a fonte.

Checks mínimos:

- conteúdo não vazio;
- tamanho plausível;
- título preservado;
- identificação da norma preservada;
- artigos/dispositivos presentes quando aplicável;
- ordem do conteúdo preservada;
- páginas não perdidas silenciosamente;
- ausência de payload HTML de erro;
- hash do artefato original preservado.

Estados:

```
VALID
PARTIALLY_VALID
INVALID
REQUIRES_HUMAN_VALIDATION
```

Extração parcialmente válida não deve ser indexada sem tratamento explícito.

---

# 9. 11-E — Canonicalização jurídica

A canonicalização deverá preservar a estrutura normativa.

Quando existente, preservar:

- título;
- ementa;
- preâmbulo;
- capítulos;
- seções;
- artigos;
- parágrafos;
- incisos;
- alíneas;
- itens;
- anexos;
- tabelas relevantes;
- notas necessárias à compreensão normativa.

Remover apenas ruído técnico, como:

- menus;
- navegação;
- HTML residual;
- elementos repetitivos de interface;
- cabeçalhos/rodapés técnicos sem valor jurídico.

Não realizar:

- resumo;
- paráfrase;
- interpretação;
- correção jurídica;
- fusão de normas;
- atualização automática;
- preenchimento de lacunas.

O conteúdo canonicalizado deve possuir hash determinístico.

---

# 10. 11-F — Proveniência e versionamento

Cada representação processada deve manter lineage explícito:

```
source_id
  ↓
document_id
  ↓
version_id
  ↓
content_artifact
  ↓
canonical_content
  ↓
chunk_id
  ↓
embedding_id
```

Cada etapa deverá registrar:

- hash de entrada;
- hash de saída;
- ferramenta;
- versão da ferramenta;
- timestamp;
- parâmetros relevantes;
- status;
- erro, quando houver.

Mudança de conteúdo deverá gerar nova identidade/versionamento apropriado, nunca sobrescrever silenciosamente uma versão anterior.

---

# 11. 11-G — Chunking jurídico

O chunking deverá ser orientado pela estrutura jurídica, não somente por número de caracteres.

Prioridade de fronteiras:

1. artigo;
2. conjunto de parágrafos/incisos pertencentes ao artigo;
3. seção;
4. capítulo;
5. anexo;
6. fallback por tamanho técnico.

Um chunk não deve separar arbitrariamente:

- caput e seus incisos;
- artigo e informação indispensável para interpretá-lo;
- identificação normativa e dispositivo correspondente.

Quando um dispositivo for maior que o limite técnico, dividir de forma determinística e preservar o vínculo com o dispositivo original.

Cada chunk deverá possuir:

```
chunk_id
document_id
version_id
source_id
content_hash
canonical_hash
sequence
text
section
article
page_start
page_end
metadata
```

Campos desconhecidos devem permanecer explicitamente UNKNOWN.

---

# 12. 11-H — Embeddings

Embeddings somente depois de:

```
extração validada
+
canonicalização validada
+
chunks validados
```

O planejamento de implementação deverá definir:

- modelo;
- fornecedor;
- dimensão;
- versão do modelo;
- normalização, se aplicável;
- estratégia de reprocessamento;
- identificação determinística do embedding;
- hash do texto que originou o embedding.

Um embedding nunca pode ser considerado válido se não for possível determinar qual texto o originou.

Mudança do modelo deverá ser versionada e não deverá destruir embeddings anteriores sem política explícita.

---

# 13. 11-I — Indexação

A indexação será o último estágio.

Fluxo obrigatório:

```
document
→ version
→ canonical content
→ chunk
→ embedding
→ index
```

O índice deverá apontar para o chunk canônico e não para uma cópia paralela do documento.

A estrutura existente de `knowledge_*` deve continuar sendo a referência canônica.

Não criar um segundo banco de conhecimento.

---

# 14. 11-J — Golden Path do RAG

O Golden Path deverá demonstrar:

```
pergunta jurídica
      ↓
retrieval
      ↓
chunk
      ↓
document_version
      ↓
document
      ↓
source
      ↓
origem oficial verificável
```

A resposta recuperada deverá conseguir informar a evidência utilizada.

O teste deverá verificar pelo menos:

1. recuperação de conteúdo;
2. provenance;
3. identificação do documento;
4. identificação da versão;
5. identificação da fonte;
6. ausência de conteúdo sem origem;
7. comportamento diante de documento bloqueado;
8. comportamento diante de conteúdo sem validação suficiente.

---

# 15. Documentos bloqueados

A Fase 11 não deve esconder os bloqueios existentes.

Continuam explicitamente relevantes:

- DF;
- MA;
- MT;
- PE;
- RN;
- RO;
- SE;
- CETRANs sem evidência;
- CONTRANDIFE;
- CTB PDF bloqueado;
- Defesa Prévia AC;
- demais payloads classificados como RAG_BLOCKED.

A ausência de conteúdo não pode ser tratada como conteúdo vazio legítimo.

---

# 16. Relações jurídicas

A Fase 11 não deve inventar relações.

As relações permanecem dependentes de evidência:

```
AMENDS
REVOKES
SUPERSEDES
CORRIGES
CONSOLIDATES
RELATED_TO
DERIVED_FROM
```

Caso uma relação seja descoberta durante a análise do conteúdo, ela deverá ser:

1. sustentada por evidência;
2. registrada com provenance;
3. versionada;
4. submetida ao estado de validação apropriado.

---

# 17. Modelo de dados

Antes da implementação deverá ser verificado se o schema existente suporta todo o fluxo.

Preferência:

**reutilizar as tabelas existentes.**

Somente criar novas tabelas quando existir necessidade real e documentada.

Qualquer DDL nova deverá:

- ser aditiva;
- possuir migration;
- possuir rollback conceitual documentado;
- manter RLS;
- não introduzir política pública;
- não destruir dados.

Não alterar o schema apenas por conveniência da implementação.

---

# 18. Segurança

Preservar:

- RLS ativo;
- ausência de policies públicas indevidas;
- acesso de serviço separado do acesso público;
- hashes e provenance protegidos contra alteração indevida.

A Fase 11 não é uma oportunidade para “liberar” tabelas jurídicas para o cliente público.

---

# 19. Reprodutibilidade

Todo processamento deverá poder ser auditado.

A execução deverá registrar:

```
input
→ transformação
→ output
→ hash
→ ferramenta
→ versão
→ parâmetros
→ timestamp
```

Uma segunda execução sobre o mesmo input deverá produzir resultados equivalentes, salvo quando houver mudança explícita de:

- extractor;
- canonicalizer;
- chunker;
- embedding model;
- regra de processamento.

---

# 20. Testes obrigatórios

A implementação futura deverá conter testes para:

### Extração

- PDF válido;
- PDF inválido;
- HTML válido;
- HTML de erro;
- conteúdo vazio.

### Canonicalização

- artigos;
- incisos;
- parágrafos;
- cabeçalhos/rodapés;
- HTML residual;
- preservação textual.

### Chunking

- fronteira de artigo;
- artigo grande;
- anexos;
- sequência determinística;
- ausência de duplicação.

### Embeddings

- mesmo conteúdo → mesmo input hash;
- modelo/versionamento identificável;
- alteração de modelo → nova identidade.

### Provenance

- chunk → version;
- version → document;
- document → source.

### RAG

- retrieval;
- citation/provenance;
- documento bloqueado;
- conteúdo sem validação.

---

# 21. Critérios de aceite

A Fase 11 somente poderá ser considerada concluída quando:

- conteúdo extraído estiver validado;
- canonicalização estiver definida e testada;
- provenance estiver íntegra;
- chunks forem determinísticos;
- embeddings forem rastreáveis;
- indexação apontar para chunks canônicos;
- nenhum conteúdo jurídico tiver sido alterado por inferência;
- documentos bloqueados continuarem bloqueados;
- relações continuarem baseadas em evidência;
- reprocessamento for idempotente;
- Golden Path do RAG funcionar;
- uma evidência recuperada puder ser rastreada até a fonte oficial.

---

# 22. Métricas obrigatórias

A execução deverá produzir, no mínimo:

```
documents_total
documents_eligible
documents_blocked
documents_human_validation
documents_extracted
documents_extraction_failed
documents_canonicalized
chunks_total
embeddings_total
indexed_chunks
sources_with_provenance
chunks_without_provenance
duplicate_chunks
failed_embeddings
rag_golden_path_status
```

Não utilizar apenas uma métrica agregada para declarar sucesso.

---

# 23. Limites explícitos

A Fase 11 NÃO autoriza:

- nova coleta nacional indiscriminada;
- criação de novo projeto Supabase;
- migração para outro banco;
- substituição do schema canônico;
- remoção de documentos;
- remoção de evidências inválidas;
- criação de relações sem evidência;
- inferência de vigência;
- inferência de revogação;
- geração de conteúdo jurídico novo;
- uso de IA para “completar” legislação ausente.

---

# 24. Ordem de execução futura

Quando a implementação for autorizada, a ordem será:

```
1. confirmar checkpoint e estado do banco
2. implementar contrato de conteúdo
3. implementar elegibilidade
4. implementar extração
5. validar extração
6. implementar canonicalização
7. validar canonicalização
8. implementar provenance/versionamento
9. implementar chunking
10. validar chunks
11. implementar embeddings
12. validar embeddings
13. implementar indexação
14. executar Golden Path
15. auditar métricas
16. documentar
17. commit
18. push
19. hard stop
```

Não inverter a ordem para gerar embeddings antes de validar o conteúdo.

---

# 25. Estado final deste documento

Este documento **não executa a Fase 11**.

Ele define o contrato para a implementação futura.

Estado:

```
FASE 11 — PLANEJADA
IMPLEMENTAÇÃO — NÃO INICIADA
RAG — NÃO INICIADO
EMBEDDINGS — NÃO INICIADOS
INDEXAÇÃO — NÃO INICIADA
```

Checkpoint de origem:

```
07c6afbe6a387161ea61817ff8f52692d58ae854
```

A implementação somente deverá começar após aprovação explícita do planejamento.

---
## ESTADO ATUAL (2026-09-25) — FASE 11 IMPLEMENTADA
Este documento foi o planejamento. A implementação foi executada como pacote único na Fase 11:
`docs/recovery/FASE-11-IMPLEMENTACAO-RAG-2026-09-25.md`. Estado anterior ("NÃO INICIADA") refere-se ao momento do planejamento (ESTADO HISTÓRICO ANTERIOR).
