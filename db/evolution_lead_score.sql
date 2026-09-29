-- Aplicar no Supabase exclusivo do Evolution ANTES do deploy do app (o SELECT de leads passa a
-- ler estas colunas).
-- Laya no Pixel de Mensagens, no mesmo modelo do SDR Flow: a Laya responde um score ordinal de
-- interesse de compra (0–4), convertido em lead_score 0–100 e temperatura HOT/WARM/COLD, e só
-- decide "perdido" (closed_lost). As demais etapas vêm de regras de texto nas mensagens do lead.

alter table public.evolution_leads
  add column if not exists lead_score smallint check (lead_score between 0 and 100),
  add column if not exists temperature text check (temperature in ('HOT', 'WARM', 'COLD')),
  add column if not exists lead_score_updated_at timestamptz;

-- Gravacao em lote pelo flush periodico do app Node (server/evolutionLeadStageBuffer.ts).
-- Entradas invalidas ou leads inexistentes sao simplesmente ignorados.
create or replace function public.set_evolution_lead_scores_batch(p_updates jsonb)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_count integer;
begin
  update public.evolution_leads as lead
  set lead_score = item.lead_score,
      temperature = item.temperature,
      lead_score_updated_at = now()
  from jsonb_to_recordset(p_updates) as item(lead_id uuid, instance_name text, lead_score smallint, temperature text)
  where lead.id = item.lead_id
    and lead.instance_name = item.instance_name
    and item.lead_score between 0 and 100
    and item.temperature in ('HOT', 'WARM', 'COLD');
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.set_evolution_lead_scores_batch(jsonb) from public, anon, authenticated;
grant execute on function public.set_evolution_lead_scores_batch(jsonb) to service_role;
