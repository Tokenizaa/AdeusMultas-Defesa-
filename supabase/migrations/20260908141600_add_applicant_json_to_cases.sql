alter table public.cases
  add column if not exists applicant_json jsonb;
