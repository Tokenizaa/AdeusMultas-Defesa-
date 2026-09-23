# Phase 8: Inventário e raspagem oficial da base jurídica - SUMÁRIO DA INVESTIGAÇÃO

## 1. MATERIAL EXISTENTE E REUTILIZÁVEL

### 1.1 Catálogos Canônicos de Fontes Oficiais
- **NATIONAL_STATES_DB** (src/core/knowledge/national-registry.ts): 27 UFs + DF + DF com portais oficiais
- **NATIONAL_ORGANS_DB** (src/core/knowledge/national-registry.ts): Órgãos de trânsito (27 DETRANs + PRF + DNIT + ANTT + DERs + CETs) com:
  - URLs oficiais de protocolos/recursos
  - Endereços físicos
  - Contatos de e-mail
  - Estruturas JARI
  - Canais de protocolo (digital, presencial, postal)
- **NATIONAL_CETRANS_DB** (src/core/knowledge/national-registry.ts): 26 CETRANs + CONTRANDIFE

### 1.2 Registro Oficial de Fontes de Monitoramento
- **OFFICIAL_SOURCES_REGISTRY** (src/core/knowledge/sources-registry.ts): 67+ fontes oficiais organizadas por:
  - **TIER_1_GOV_PRIMARY**: Planalto, SENATRAN, CONTRAN, PRF, DNIT, INMETRO, DETRANs
  - **TIER_2_OFFICIAL_GAZETTE**: Diário Oficial da União, Diários Oficiais Estaduais
  - **TIER_3_JUDICIAL_TRIBUNAL**: STF, STJ, CETRANs, CONTRANDIFE
  - Categorias: legislation, portal_recurso, diario_oficial, jurisprudencia, metrologia

### 1.3 Mecanismo de Coleta Automatizada
- **SourceFetcher** (src/core/knowledge/monitoring/source-fetcher.ts): 
  - Requisições HTTP reais com timeout, cabeçalhos oficiais, tratamento de falhas
  - Suporte a requisições em lote com controle de concorrência
  - Usado pelo WeeklyMonitorService
- **WeeklyMonitorService** (src/core/knowledge/scheduler/weekly-monitor-service.ts):
  - Executa ciclo semanal de monitoramento
  - Coleta, compara snapshots via SHA-256, detecta alterações
  - Integra com validação, fila de revisão humana, notificações e geração de relatórios

### 1.4 Componentes RAG/Knowledge
- **Vector Store** (src/server/knowledge/vector-store.ts): Dual-engine (pgvector + memória)
- **Ingestion Service** (src/server/knowledge/ingestion-service.ts): Pipeline com idempotência e versionamento
- **Embedding Service** (src/server/knowledge/embedding-service.ts): Multi-provider com fallback
- **Chunking Service** (src/server/knowledge/chunking-service.ts): Chunking semântico especializado para juridico
- **Registry Engines**: Temporal, Canonical, Validação

### 1.5 Engine de Documentos
- **DocumentAssemblyEngine** (src/core/documents/document-assembly-engine.ts):
  - Pipeline determinístico 100% independente de IA
  - 7 tipos de procedimentos suportados
  - Biblioteca de 65+ blocos de documento
  - Catálogo de 52+ argumentos jurídicos
  - Geração de petições prontas para impressão/PDF

## 2. MATERIAL EXISTENTE MAS INCOMPLETO

### 2.1 Ferramentas de Scraping/Geração de Leads
- **src/scraper-prospecting/**: Ferramentas para geração de leads via Google Maps
  - Não projetadas para coleta de documentos jurídicos oficiais
  - Podem ser adaptadas, mas exigiriam mudança significativa de foco
  - Contém: SeleniumSession, GoogleMapsSeleniumScraper, normalizers, classifiers, etc.

### 2.2 Catálogos de Conteúdo Jurídico Processado
- **CTB_ARTICLES_DB**, **RESOLUTIONS_DB**, **INFRACTION_CATALOG**, **ARGUMENTS_CATALOG**:
  - Contêm versões processadas/canônicas do conteúdo
  - Não representam inventário completo de documentos oficiais fonte
  - Falta o mapeamento para documentos oficiais específicos (PDFs, portarias, etc.)

### 2.3 Lacunas no Inventário de Documentos Oficiais
- Nenhum inventário existente que mapeie:
  - Quais documentos específicos cada fonte oficial disponibiliza
  - Onde exatamente esses documentos estão localizados (URLs específicas)
  - Quais tipos de documentos (leis, decretos, resoluções, manuais, formulários)
  - Frequência de atualização de cada tipo de documento
  - Status de disponibilidade (online/offline)

## 3. PRÓXIMOS PASSOS PARA FASE 8

### 3.1 Criação do Inventário Oficial de Documentos Jurídicos
1. **Mapear tipos de documentos a serem coletados**:
   - Leis federais/estaduais (CTB, Lei de Licenciamento, etc.)
   - Resoluções CONTRAN/SENATRAN
   - Portarias e instruções normativas
   - Manuais de procedimentos (radar, alcoolemia, etc.)
   - Formulários de recurso e defesa
   - Guias de orientação ao usuário
   - Jurisprudência vinculante (Súmulas, precedentes)

2. **Para cada fonte oficial no OFFICIAL_SOURCES_REGISTRY**:
   - Identificar onde os documentos jurídicos estão publicados
   - Mapear URLs específicas de coleta
   - Determinar frequência de verificação necessária
   - Classificar por tipo de documento e categoria jurídica

### 3.2 Adaptação dos Mecanismos Existente
1. **Estender o SourceFetcher** para:
   - Suporte a autenticação em portais gov.br (quando necessário)
   - Tratamento de paginação e resultados em lote
   - Detecção de tipos de arquivo (PDF, DOC, XLS, etc.)
   - Extração de metadados (data de publicação, número, ementa)

2. **Criar tarefas específicas de coleta de documentos**:
   - Diferente do monitoramento de mudanças (que foca em alterações)
   - Focado na coleta exaustiva e inventário inicial
   - Pode reutilizar o mesmo infrastructure de fetch e armazenamento

### 3.3 Integração com Pipeline RAG Existente
1. **Estender o Ingestion Service** para:
   - Processar documentos jurídicos brutos coletados
   - Extrair metadados relevantes (fonte, data, tipo, número)
   - Aplicar chunking semântico especializado por tipo de documento
   - Gerar embeddings e armazenar no vector store

2. **Criar gatilhos de ingestão automática**:
   - Após coleta bem-sucedida de novos documentos
   - Na detecção de alterações em documentos já existentes
   - Em lotes periódicos para documentos estáticos

### 3.4 Controle de Qualidade e Validação
1. **Estender o Validation Engine** para:
   - Validar integridade de documentos coletados (não corrompidos)
   - Verificar completude (número de páginas, presença de assinaturas digitais quando exigido)
   - Validar metadados extraídos contra padrões esperados

2. **Integrar com fila de revisão humana** quando:
   - Documentos exigem interpretação jurídica para classificação
   - Há ambiguidades na extração de metadados
   - Documentos estão em formatos não padrão ou danificados

## 4. RECURSOS JÁ DISPONÍVEIS PARA IMPLEMENTAÇÃO IMediata

✅ **Infraestrutura de fetch**: SourceFetcher já funcionando  
✅ **Infraestrutura de agendamento**: WeeklyMonitorService já funcionando  
✅ **Infraestrutura de detecção de mudanças**: ChangeDetector já funcionando  
✅ **Infraestrutura de armazenamento**: SnapshotStore já funcionando  
✅ **Infraestrutura de validação**: ValidationEngine já funcionando  
✅ **Infraestrutura de revisão humana**: ReviewQueueService já funcionando  
✅ **Infraestrutura de geração de relatórios**: WeeklyReportGenerator já funcionando  
✅ **Infraestrutura RAG**: Vector store, ingestion, embedding, chunking já funcionando  
✅ **Engine de montagem de documentos**: DocumentAssemblyEngine já funcionando  

## 5. CONCLUSÃO

A base para a Fase 8 já existe em grande parte. O que falta é:
1. **O inventário específico de documentos jurídicos a serem coletados** (mapeamento de fontes para tipos de documentos)
2. **Eventuais adaptações menores nos mecanismos de coleta** para lidar com autenticação gov.br, paginação, etc.
3. **A execução efetiva da coleta** usando a infraestrutura já existente

A maioria do trabalho pesado (infraestrutura de fetch, armazenamento, validação, monitoramento, RAG) já está implementado e testado.
