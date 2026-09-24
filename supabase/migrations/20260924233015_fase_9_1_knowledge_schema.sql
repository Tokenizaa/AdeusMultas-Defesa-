-- ============================================================================
-- Fase 9.1 — Versionar schema jurídico (fecha migration drift)
-- Objetivo: representar nas migrations o schema knowledge_* que já existe no
-- banco canônico (sem destruir nada) e adicionar knowledge_document_relations.
--
-- Segurança: operações additivas e idempotentes. Nenhum DROP/TRUNCATE/DELETE.
-- Tabelas já existentes -> CREATE TABLE IF NOT EXISTS é no-op seguro.
-- Extensão vector já instalada (0.8.2) -> create extension if not exists é no-op.
-- FK circular documents.current_version_id guardada por DO block (idempotente).
-- ============================================================================

-- Extensão necessária para knowledge_embeddings (vector(1024)).
create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- knowledge_sources
-- ---------------------------------------------------------------------------
create table if not exists public.knowledge_sources (
  id           text primary key,
  name         text not null,
  source_type  text not null,
  authority    text not null,
  description  text,
  url          text,
  jurisdiction text not null default 'BR_FEDERAL',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint knowledge_sources_source_type_check check (
    source_type in ('LAW','REGULATION','JURISPRUDENCE','GOVERNMENT','TECHNICAL','INTERNAL','MANUAL','OTHER')
  )
);

alter table public.knowledge_sources enable row level security;

-- ---------------------------------------------------------------------------
-- knowledge_documents (current_version_id sem FK inline; FK adicionada após
-- knowledge_document_versions existir, com guarda de idempotência)
-- ---------------------------------------------------------------------------
create table if not exists public.knowledge_documents (
  id                text primary key,
  source_id         text not null references public.knowledge_sources(id) on delete cascade,
  title             text not null,
  document_type     text not null,
  description       text,
  jurisdiction      text not null default 'BR_FEDERAL',
  status            text not null default 'ACTIVE',
  current_version_id text,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint knowledge_documents_status_check check (
    status in ('ACTIVE','REVOKED','SUPERSEDED','DRAFT','ARCHIVED')
  )
);

alter table public.knowledge_documents enable row level security;

-- ---------------------------------------------------------------------------
-- knowledge_document_versions
-- ---------------------------------------------------------------------------
create table if not exists public.knowledge_document_versions (
  id              text primary key,
  document_id     text not null references public.knowledge_documents(id) on delete cascade,
  version         text not null default 'v1.0',
  content         text not null,
  content_hash    text not null,
  source_url      text,
  published_at    timestamptz,
  effective_from  timestamptz,
  effective_until timestamptz,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

alter table public.knowledge_document_versions enable row level security;

-- FK circular documents.current_version_id -> versions (DEFERRABLE, idempotente)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_knowledge_documents_current_version'
  ) then
    alter table public.knowledge_documents
      add constraint fk_knowledge_documents_current_version
      foreign key (current_version_id) references public.knowledge_document_versions(id)
      deferrable initially deferred;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- knowledge_chunks
-- ---------------------------------------------------------------------------
create table if not exists public.knowledge_chunks (
  id                  text primary key,
  document_version_id text not null references public.knowledge_document_versions(id) on delete cascade,
  document_id         text not null references public.knowledge_documents(id) on delete cascade,
  source_id           text not null references public.knowledge_sources(id) on delete cascade,
  chunk_index         integer not null,
  content             text not null,
  content_hash        text not null,
  token_count         integer not null default 0,
  heading             text,
  article_number      text,
  section_name        text,
  jurisdiction        text not null default 'BR_FEDERAL',
  document_type       text not null default 'LEI',
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

alter table public.knowledge_chunks enable row level security;

-- ---------------------------------------------------------------------------
-- knowledge_embeddings
-- ---------------------------------------------------------------------------
create table if not exists public.knowledge_embeddings (
  id          text primary key,
  chunk_id    text not null references public.knowledge_chunks(id) on delete cascade,
  provider    text not null,
  model       text not null,
  dimensions  integer not null,
  embedding   vector(1024),
  created_at  timestamptz not null default now()
);

alter table public.knowledge_embeddings enable row level security;

-- ---------------------------------------------------------------------------
-- knowledge_ingestions (telemetria de execuções de ingestão)
-- ---------------------------------------------------------------------------
create table if not exists public.knowledge_ingestions (
  id                   text primary key,
  started_at           timestamptz not null default now(),
  completed_at         timestamptz,
  status               text not null,
  total_files          integer not null default 0,
  processed_documents  integer not null default 0,
  skipped_documents    integer not null default 0,
  created_chunks       integer not null default 0,
  generated_embeddings integer not null default 0,
  failed_count         integer not null default 0,
  duration_ms          integer not null default 0,
  provider_used        text,
  model_used           text,
  triggered_by         text not null default 'SYSTEM_CLI',
  error_message        text,
  details              jsonb not null default '{}'::jsonb,
  constraint knowledge_ingestions_status_check check (
    status in ('PENDING','PROCESSING','COMPLETED','FAILED')
  )
);

alter table public.knowledge_ingestions enable row level security;

-- ---------------------------------------------------------------------------
-- NOVA: knowledge_document_relations (Fase 9 — relações normativas)
-- ---------------------------------------------------------------------------
-- Justificativa ON DELETE RESTRICT: uma relação jurídica jamais deve apontar
-- para documento inexistente e não pode ser apagada em cascata destrutiva.
create table if not exists public.knowledge_document_relations (
  id                 text primary key,
  source_document_id text not null references public.knowledge_documents(id) on delete restrict,
  target_document_id text not null references public.knowledge_documents(id) on delete restrict,
  relation_type      text not null,
  evidence           text not null,          -- obrigatório: origem da evidência da relação
  source_url         text,
  status             text not null default 'PENDING_VALIDATION',
  metadata           jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint knowledge_document_relations_rel_type_check check (
    relation_type in ('AMENDS','REVOKES','SUPERSEDES','CORRIGES','CONSOLIDATES','RELATED_TO','DERIVED_FROM')
  ),
  constraint knowledge_document_relations_status_check check (
    status in ('PENDING_VALIDATION','VALIDATED','REJECTED','UNKNOWN')
  ),
  constraint knowledge_document_relations_no_self check (
    source_document_id <> target_document_id
  )
);

alter table public.knowledge_document_relations enable row level security;

create index if not exists idx_k_relations_source      on public.knowledge_document_relations using btree (source_document_id);
create index if not exists idx_k_relations_target      on public.knowledge_document_relations using btree (target_document_id);
create index if not exists idx_k_relations_source_type on public.knowledge_document_relations using btree (source_document_id, relation_type);
create index if not exists idx_k_relations_target_type on public.knowledge_document_relations using btree (target_document_id, relation_type);
-- ---------------------------------------------------------------------------
-- Índices baseline (refletem o estado real do banco canônico)
-- ---------------------------------------------------------------------------
create index if not exists idx_k_documents_source        on public.knowledge_documents using btree (source_id);
create index if not exists idx_k_documents_type          on public.knowledge_documents using btree (document_type);
create index if not exists idx_k_documents_current_version on public.knowledge_documents using btree (current_version_id) where (current_version_id is not null);
create index if not exists idx_k_versions_doc_hash       on public.knowledge_document_versions using btree (document_id, content_hash);
create index if not exists idx_k_chunks_version          on public.knowledge_chunks using btree (document_version_id);
create index if not exists idx_k_chunks_doc              on public.knowledge_chunks using btree (document_id);
create index if not exists idx_k_chunks_source           on public.knowledge_chunks using btree (source_id);
create index if not exists idx_k_chunks_article          on public.knowledge_chunks using btree (article_number);
create index if not exists idx_k_chunks_heading          on public.knowledge_chunks using btree (heading);
create index if not exists idx_k_embeddings_chunk        on public.knowledge_embeddings using btree (chunk_id);
create index if not exists idx_k_embeddings_provider_model on public.knowledge_embeddings using btree (provider, model);
create index if not exists idx_k_embeddings_vector_hnsw  on public.knowledge_embeddings using hnsw (embedding vector_cosine_ops) with (m = '16', ef_construction = '64');
