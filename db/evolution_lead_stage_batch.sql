-- Aplicar no Supabase exclusivo do Evolution.
-- Suporte a classificacao de estagio ao vivo (Laya, sem OpenAI): o app Node
-- acumula propostas de mudanca de estagio em memoria e grava tudo de uma vez
-- em horarios definidos, em vez de uma requisicao por lead classificado.
--
-- move_evolution_lead_stage_batch espelha a logica de move_evolution_lead_stage
-- (lock da linha, update de crm_stage, insercao no historico se mudou), mas
-- recebe um array e processa tudo numa unica chamada RPC. Uma entrada invalida
-- ou um lead nao encontrado e simplesmente pulada (continue) em vez de abortar
-- o lote inteiro, ja que isso roda sem supervisao humana a cada flush.

create or replace function public.move_evolution_lead_stage_batch(p_updates jsonb)
returns table(lead_id uuid, crm_stage text, crm_stage_updated_at timestamptz, applied boolean)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_item jsonb;
  v_lead_id uuid;
  v_instance_name text;
  v_to_stage text;
  v_changed_by text;
  v_note text;
  v_from_stage text;
  v_updated_at timestamptz;
begin
  for v_item in select * from jsonb_array_elements(p_updates)
  loop
    v_lead_id := nullif(v_item->>'lead_id', '')::uuid;
    v_instance_name := v_item->>'instance_name';
    v_to_stage := v_item->>'to_stage';
    v_changed_by := v_item->>'changed_by';
    v_note := v_item->>'note';
    v_updated_at := now();

    if v_lead_id is null or v_instance_name is null or v_to_stage not in (
      'lead_not_responded', 'lead_responded', 'follow_up', 'lead_replied',
      'negotiation', 'closed_won', 'closed_lost'
    ) then
      continue;
    end if;

    select lead.crm_stage into v_from_stage
    from public.evolution_leads as lead
    where lead.id = v_lead_id and lead.instance_name = v_instance_name
    for update;

    if v_from_stage is null then
      continue;
    end if;

    update public.evolution_leads
    set crm_stage = v_to_stage,
        crm_stage_updated_at = v_updated_at,
        crm_stage_updated_by = nullif(trim(v_changed_by), ''),
        updated_at = v_updated_at
    where id = v_lead_id and instance_name = v_instance_name;

    if v_from_stage is distinct from v_to_stage then
      insert into public.evolution_crm_stage_history (
        lead_id, instance_name, from_stage, to_stage, changed_by, changed_at, note
      ) values (
        v_lead_id, v_instance_name, v_from_stage, v_to_stage,
        nullif(trim(v_changed_by), ''), v_updated_at, nullif(trim(v_note), '')
      );
    end if;

    lead_id := v_lead_id;
    crm_stage := v_to_stage;
    crm_stage_updated_at := v_updated_at;
    applied := true;
    return next;
  end loop;
end;
$$;

-- Configuracao propria da automacao ao vivo (reaproveita a mesma tabela da
-- automacao diaria). O check constraint original so permitia 'daily_lead_stage'.
alter table public.evolution_ai_automation_settings
  drop constraint evolution_ai_automation_settings_automation_key_check;

alter table public.evolution_ai_automation_settings
  add constraint evolution_ai_automation_settings_automation_key_check
  check (automation_key in ('daily_lead_stage', 'live_lead_stage'));

-- Comeca desabilitada: so ligar apos validar a latencia do servico Laya na VPS.
insert into public.evolution_ai_automation_settings (automation_key, enabled, min_confidence)
values ('live_lead_stage', false, 0.80)
on conflict (automation_key) do nothing;
