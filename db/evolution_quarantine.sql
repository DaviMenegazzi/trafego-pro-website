-- Aplicar no Supabase exclusivo do Evolution.
-- Fase 3 do plano do Pixel: atribuicao tardia 100% deterministica (sem IA).
-- Contatos sem evidencia de anuncio no primeiro contato entram em quarentena
-- transitoria (is_quarantine = true) em vez de serem descartados; uma mensagem
-- posterior com referral/tag/UTM promove o lead automaticamente.

alter table public.evolution_leads
  add column if not exists is_quarantine boolean not null default false;

create index if not exists evolution_leads_quarantine_idx
  on public.evolution_leads (is_quarantine, first_contact_at)
  where is_quarantine = true;

comment on column public.evolution_leads.is_quarantine is
  'true enquanto o contato nao tem evidencia de campanha (origin_evidence=none) nem classificacao manual; oculto do Pixel e sujeito a expurgo apos N horas.';

-- Mesma assinatura do overload atual (com p_message_body). Adiciona:
--   - is_quarantine = true na primeira insercao sem evidencia de anuncio;
--   - promocao automatica (is_quarantine -> false) quando uma mensagem
--     subsequente traz origin_evidence <> 'none' (reconciliacao tardia).
-- Nunca reverte is_quarantine de false para true.
create or replace function public.record_evolution_event(p_event_fingerprint text, p_instance_name text, p_event_type text, p_message_id text, p_remote_jid text, p_direction text, p_message_type text, p_message_preview text, p_message_body text, p_connection_status text, p_contact_key text, p_phone_last4 text, p_contact_name text, p_origin_platform text, p_origin_evidence text, p_meta_ctwa_clid text, p_meta_source_id text, p_meta_source_type text, p_google_click_id text, p_attribution_payload_json jsonb, p_occurred_at timestamp with time zone)
returns table(event_id uuid, duplicate boolean)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_event_id uuid;
  v_lead_id uuid;
  v_occurred_at timestamptz := coalesce(p_occurred_at, now());
  v_connection_status text := coalesce(nullif(p_connection_status, ''), 'unknown');
  v_contact_phone text := case when p_remote_jid ~ '^[0-9]+@(s\.whatsapp\.net|c\.us)$' then regexp_replace(p_remote_jid, '@.*$', '') else null end;
  v_origin_evidence text := coalesce(p_origin_evidence, 'none');
begin
  insert into public.evolution_instances (instance_name, connection_status, last_event_at, last_message_at)
  values (p_instance_name, v_connection_status, v_occurred_at, case when p_event_type = 'MESSAGES_UPSERT' then v_occurred_at else null end)
  on conflict (instance_name) do update set
    connection_status = case when excluded.connection_status = 'unknown' then evolution_instances.connection_status else excluded.connection_status end,
    last_event_at = greatest(coalesce(evolution_instances.last_event_at, '-infinity'::timestamptz), excluded.last_event_at),
    last_message_at = case when excluded.last_message_at is null then evolution_instances.last_message_at else greatest(coalesce(evolution_instances.last_message_at, '-infinity'::timestamptz), excluded.last_message_at) end,
    updated_at = now();

  insert into public.evolution_events (event_fingerprint, instance_name, event_type, message_id, remote_jid, direction, message_type, message_preview, message_body, origin_platform, origin_evidence, meta_ctwa_clid, meta_source_id, meta_source_type, google_click_id, attribution_payload_json, occurred_at)
  values (p_event_fingerprint, p_instance_name, p_event_type, p_message_id, p_remote_jid, p_direction, p_message_type, p_message_preview, nullif(left(p_message_body, 4000), ''), coalesce(p_origin_platform, 'unknown'), v_origin_evidence, p_meta_ctwa_clid, p_meta_source_id, p_meta_source_type, p_google_click_id, p_attribution_payload_json, v_occurred_at)
  on conflict (event_fingerprint) do nothing returning id into v_event_id;

  if v_event_id is null then
    select id into v_event_id from public.evolution_events where event_fingerprint = p_event_fingerprint;
    return query select v_event_id, true;
    return;
  end if;

  if p_contact_key is not null and p_direction in ('incoming', 'outgoing') then
    insert into public.evolution_leads (instance_name, contact_key, contact_phone, phone_last4, contact_name, first_contact_at, last_message_at, messages_received, messages_sent, last_event_id, origin_platform, origin_evidence, meta_ctwa_clid, google_click_id, origin_detected_at, is_quarantine)
    values (p_instance_name, p_contact_key, v_contact_phone, p_phone_last4, p_contact_name, v_occurred_at, v_occurred_at, case when p_direction = 'incoming' then 1 else 0 end, case when p_direction = 'outgoing' then 1 else 0 end, v_event_id, coalesce(p_origin_platform, 'unknown'), v_origin_evidence, p_meta_ctwa_clid, p_google_click_id, case when v_origin_evidence = 'none' then null else v_occurred_at end, v_origin_evidence = 'none')
    on conflict (instance_name, contact_key) do update set
      contact_phone = coalesce(excluded.contact_phone, evolution_leads.contact_phone),
      phone_last4 = coalesce(excluded.phone_last4, evolution_leads.phone_last4),
      contact_name = coalesce(excluded.contact_name, evolution_leads.contact_name),
      last_message_at = greatest(evolution_leads.last_message_at, excluded.last_message_at),
      messages_received = evolution_leads.messages_received + excluded.messages_received,
      messages_sent = evolution_leads.messages_sent + excluded.messages_sent,
      last_event_id = excluded.last_event_id,
      origin_platform = case when excluded.origin_evidence = 'none' then evolution_leads.origin_platform else excluded.origin_platform end,
      origin_evidence = case when excluded.origin_evidence = 'none' then evolution_leads.origin_evidence else excluded.origin_evidence end,
      meta_ctwa_clid = coalesce(excluded.meta_ctwa_clid, evolution_leads.meta_ctwa_clid),
      google_click_id = coalesce(excluded.google_click_id, evolution_leads.google_click_id),
      origin_detected_at = case when excluded.origin_evidence = 'none' then evolution_leads.origin_detected_at else coalesce(evolution_leads.origin_detected_at, excluded.origin_detected_at) end,
      is_quarantine = case when excluded.origin_evidence = 'none' then evolution_leads.is_quarantine else false end,
      updated_at = now();

    select id into v_lead_id from public.evolution_leads where instance_name = p_instance_name and contact_key = p_contact_key;
    if nullif(trim(p_message_body), '') is not null then
      insert into public.evolution_messages (event_id, lead_id, instance_name, contact_key, direction, message_type, body_text, sent_at)
      values (v_event_id, v_lead_id, p_instance_name, p_contact_key, p_direction, p_message_type, left(p_message_body, 4000), v_occurred_at)
      on conflict on constraint evolution_messages_event_id_key do nothing;
    end if;
  end if;
  return query select v_event_id, false;
end;
$function$;

-- Visibilidade agora usa is_quarantine diretamente (ver server/evolutionPixelPolicy.ts:isVisiblePixelLead).
create or replace function public.verify_lead_unit_access(p_lead_id uuid, p_unit_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.evolution_leads l
    join public.evolution_instances i on i.instance_name = l.instance_name
    where l.id = p_lead_id
      and i.unit_id = p_unit_id
      and l.classification <> 'nao_lead'
      and l.is_quarantine = false
  );
$$;

-- Expurgo diario: remove leads que ficaram em quarentena sem evidencia de
-- anuncio por mais de p_hours horas. O cascade em evolution_leads.id limpa
-- evolution_messages/evolution_crm_stage_history/evolution_meta_attributions
-- junto; o log bruto em evolution_events (chave por instance_name) permanece.
create or replace function public.cleanup_expired_quarantine_leads(p_hours integer default 48)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.evolution_leads
  where is_quarantine = true
    and first_contact_at < now() - (p_hours || ' hours')::interval;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

comment on function public.cleanup_expired_quarantine_leads(integer) is
  'Job diario de expurgo de leads em quarentena expirada (padrao 48h), mantendo o banco enxuto.';
