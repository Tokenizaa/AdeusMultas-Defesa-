-- Consolidate permissive policies without changing their effective predicates.
-- Public policies are split into anon/authenticated because TO public also
-- applies to authenticated and is what creates most advisor duplicates.

do $$
declare
  p record;
  target_role text;
  operation text;
  using_expr text;
  check_expr text;
  policy_name text;
begin
  create temporary table _rls_policy_snapshot on commit drop as
  select schemaname, tablename, policyname, roles, cmd, qual, with_check
  from pg_policies
  where schemaname = 'public'
    and not ('service_role' = any(roles));

  for p in select distinct tablename from _rls_policy_snapshot loop
    for target_role in select unnest(array['anon', 'authenticated']) loop
      for operation in select unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE']) loop
        select string_agg('(' || qual || ')', ' OR ' order by policyname)
          into using_expr
        from _rls_policy_snapshot s
        where s.tablename = p.tablename
          and (s.roles @> array['public']::name[] or s.roles @> array[target_role]::name[])
          and (s.cmd = operation or s.cmd = 'ALL')
          and s.qual is not null;

        select string_agg('(' || coalesce(with_check, qual) || ')', ' OR ' order by policyname)
          into check_expr
        from _rls_policy_snapshot s
        where s.tablename = p.tablename
          and (s.roles @> array['public']::name[] or s.roles @> array[target_role]::name[])
          and (s.cmd = operation or s.cmd = 'ALL')
          and coalesce(s.with_check, s.qual) is not null;

        if operation in ('SELECT', 'DELETE') and using_expr is not null then
          policy_name := format('rls_consolidated_%s_%s', lower(target_role), lower(operation));
          execute format(
            'create policy %I on public.%I for %s to %I using (%s)',
            policy_name, p.tablename, operation, target_role, using_expr
          );
        elsif operation = 'INSERT' and check_expr is not null then
          policy_name := format('rls_consolidated_%s_%s', lower(target_role), lower(operation));
          execute format(
            'create policy %I on public.%I for INSERT to %I with check (%s)',
            policy_name, p.tablename, target_role, check_expr
          );
        elsif operation = 'UPDATE' and using_expr is not null then
          policy_name := format('rls_consolidated_%s_%s', lower(target_role), lower(operation));
          execute format(
            'create policy %I on public.%I for UPDATE to %I using (%s) with check (%s)',
            policy_name, p.tablename, target_role, using_expr, coalesce(check_expr, using_expr)
          );
        end if;
      end loop;
    end loop;
  end loop;

  for p in select schemaname, tablename, policyname from _rls_policy_snapshot loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end
$$;
