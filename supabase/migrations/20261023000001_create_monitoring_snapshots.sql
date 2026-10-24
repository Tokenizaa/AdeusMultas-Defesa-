-- ============================================================================
-- Fase 10 — Tabela de snapshots de monitoramento (durabilidade)
-- Objetivo: persistir snapshots do SnapshotStore no Supabase para sobreviver
-- à reinicialização do processo e permitir comparação histórica de versões.
--
-- Segurança: operações additivas (CREATE TABLE IF NOT EXISTS). Nenhum DROP/DELETE/TRUNCATE.
-- Não aplicar remotamente sem autorização explícita. Testar em banco de prova primeiro.
-- ============================================================================

create table if not exists public.knowledge_monitoring_snapshots (
  id           text primary key,
  source_id    text not null,
  document_id  text references public.knowledge_documents(id) on delete set null,
  url          text not null,
  uf           text not null default 'FEDERAL',
  fetched_at   timestamptz not null,
  http_status  integer not null,
  content_length integer not null default 0,
  content_hash text not null,
  normalized_text text not null default '',
  raw_sample   text,
  status       text not null default 'confirmed'
    check (status in ('confirmed','collection_failed','inconclusive')),
  error_message text,
  created_at   timestamptz not null default now()
);

alter table public.knowledge_monitoring_snapshots enable row level security;

-- Políticas de Row Level Security (idempotentes).
-- O cliente de persistência (SnapshotStore) utiliza a service role
-- (SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY), que ignora RLS.
-- As políticas abaixo regem acessos via roles anon/authenticated:
-- leitura liberada para authenticated; gravação sem policy (negada para
-- anon/authenticated, permitida apenas para service role).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'knowledge_monitoring_snapshots'
      and policyname = 'knowledge_monitoring_snapshots_select_authenticated'
  ) then
    create policy knowledge_monitoring_snapshots_select_authenticated
      on public.knowledge_monitoring_snapshots
      for select
      to authenticated
      using (true);
  end if;
end $$;

create index if not exists idx_k_monitoring_snapshots_source
  on public.knowledge_monitoring_snapshots using btree (source_id);
create index if not exists idx_k_monitoring_snapshots_source_fetched
  on public.knowledge_monitoring_snapshots using btree (source_id, fetched_at desc);
create index if not exists idx_k_monitoring_snapshots_hash
  on public.knowledge_monitoring_snapshots using btree (content_hash);
create index if not exists idx_k_monitoring_snapshots_document
  on public.knowledge_monitoring_snapshots using btree (document_id) where (document_id is not null);

-- Comentários de documentação (sem efeito no esquema)
comment on table public.knowledge_monitoring_snapshots is
  'Snapshots de monitoramento de fontes oficiais (SNM-JO). Permite comparação histórica de versões e detecção de mudanças normativas.';

comment on column public.knowledge_monitoring_snapshots.status is
  'confirmed = coleta bem-sucedida; collection_failed = falha temporária de acesso; inconclusive = resultado não conclusivo.';
