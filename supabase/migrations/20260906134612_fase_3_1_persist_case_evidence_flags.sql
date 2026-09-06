alter table public.cases
  add column if not exists evidence_json jsonb;
