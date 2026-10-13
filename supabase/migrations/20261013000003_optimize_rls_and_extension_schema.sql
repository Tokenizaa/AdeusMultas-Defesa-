-- Production hardening: preserve authorization while removing avoidable
-- per-row auth evaluation and keeping extensions outside the exposed schema.

create schema if not exists extensions;

alter extension vector set schema extensions;
alter extension pg_trgm set schema extensions;
alter extension citext set schema extensions;

do $$
declare
  p record;
  using_expr text;
  check_expr text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        coalesce(qual, '') like '%auth.uid()%' or
        coalesce(qual, '') like '%auth.jwt()%' or
        coalesce(qual, '') like '%auth.role()%' or
        coalesce(with_check, '') like '%auth.uid()%' or
        coalesce(with_check, '') like '%auth.jwt()%' or
        coalesce(with_check, '') like '%auth.role()%'
      )
  loop
    using_expr := replace(replace(replace(
      p.qual,
      'auth.uid()', '(select auth.uid())'),
      'auth.jwt()', '(select auth.jwt())'),
      'auth.role()', '(select auth.role())');
    check_expr := replace(replace(replace(
      p.with_check,
      'auth.uid()', '(select auth.uid())'),
      'auth.jwt()', '(select auth.jwt())'),
      'auth.role()', '(select auth.role())');

    if p.qual is not null and p.with_check is not null then
      execute format(
        'alter policy %I on %I.%I using (%s) with check (%s)',
        p.policyname, p.schemaname, p.tablename, using_expr, check_expr
      );
    elsif p.qual is not null then
      execute format(
        'alter policy %I on %I.%I using (%s)',
        p.policyname, p.schemaname, p.tablename, using_expr
      );
    elsif p.with_check is not null then
      execute format(
        'alter policy %I on %I.%I with check (%s)',
        p.policyname, p.schemaname, p.tablename, check_expr
      );
    end if;
  end loop;
end
$$;

-- Exact duplicate: same role, command and predicate. Keep the canonical name.
drop policy if exists "Users can view own profile" on public.user_profiles;
