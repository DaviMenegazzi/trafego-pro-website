-- Remediação para o Supabase Evolution já existente. Executar no SQL Editor do
-- projeto Evolution após as definições de função; não altera dados de usuário.
-- Inclui todas as assinaturas legadas destas RPCs internas.
do $$
declare fn regprocedure;
begin
  for fn in
    select p.oid::regprocedure
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'record_evolution_event',
        'verify_lead_unit_access',
        'cleanup_expired_quarantine_leads',
        'move_evolution_lead_stage',
        'move_evolution_lead_stage_batch'
      )
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end $$;
