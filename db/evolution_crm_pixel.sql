-- Aplicar no Supabase exclusivo do Evolution ANTES do deploy do app (o SELECT de leads e as
-- rotas do CRM passam a ler estas colunas e funções). Migração aditiva: nenhuma etapa existente
-- é alterada.
--
-- CRM Kanban do Pixel (plans/crm-pixel-kanban.md):
--   - crm_version: versão monotônica da etapa/modo, usada para detectar conflitos;
--   - crm_stage_mode: 'manual' quando um usuário moveu o cartão. A decisão manual tem prioridade:
--     nenhuma automação (Laya, regra de texto, IA diária) grava etapa enquanto o modo for manual.
--     O usuário devolve o lead à automação explicitamente (crm_set_lead_automatic);
--   - lead_score_source_at: data da última mensagem considerada na temperatura aplicada, para
--     descartar avaliações feitas sobre um estado mais antigo da conversa.

alter table public.evolution_leads
  add column if not exists crm_version bigint not null default 0,
  add column if not exists crm_stage_mode text not null default 'automatic',
  add column if not exists lead_score_source_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'evolution_leads_crm_stage_mode_check') then
    alter table public.evolution_leads
      add constraint evolution_leads_crm_stage_mode_check check (crm_stage_mode in ('automatic', 'manual'));
  end if;
end $$;

alter table public.evolution_crm_stage_history
  add column if not exists event_type text not null default 'stage_changed',
  add column if not exists actor_id text,
  add column if not exists actor_type text,
  add column if not exists request_id uuid,
  add column if not exists version_after bigint,
  add column if not exists from_mode text,
  add column if not exists to_mode text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'evolution_crm_stage_history_event_type_check') then
    alter table public.evolution_crm_stage_history
      add constraint evolution_crm_stage_history_event_type_check check (event_type in ('stage_changed', 'automation_resumed'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'evolution_crm_stage_history_actor_type_check') then
    alter table public.evolution_crm_stage_history
      add constraint evolution_crm_stage_history_actor_type_check check (actor_type is null or actor_type in ('user', 'automation'));
  end if;
end $$;

-- Recibos de mutação: repetir o mesmo requestId não aplica a mudança duas vezes. Retenção de 7
-- dias (limpeza oportunista nas próprias funções); depois disso a versão ainda barra a repetição.
create table if not exists public.evolution_crm_mutation_receipts (
  actor_id text not null,
  request_id uuid not null,
  lead_id uuid not null references public.evolution_leads(id) on delete cascade,
  payload_hash text not null,
  status text not null,
  created_at timestamptz not null default now(),
  primary key (actor_id, request_id)
);

create index if not exists evolution_crm_mutation_receipts_created_idx
  on public.evolution_crm_mutation_receipts (created_at);

alter table public.evolution_crm_mutation_receipts enable row level security;

create index if not exists evolution_leads_crm_board_idx
  on public.evolution_leads (instance_name, crm_stage, crm_stage_updated_at desc, id desc)
  where classification <> 'nao_lead' and is_quarantine = false;

create index if not exists evolution_crm_stage_history_lead_cursor_idx
  on public.evolution_crm_stage_history (lead_id, changed_at desc, id desc);

-- ─── Projeção do cartão ─────────────────────────────────────────────────────
create or replace function public.crm_lead_json(l public.evolution_leads, i public.evolution_instances)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', l.id,
    'instanceName', l.instance_name,
    'instanceDisplayName', i.display_name,
    'contactName', l.contact_name,
    'contactPhone', l.contact_phone,
    'phoneLast4', l.phone_last4,
    'classification', l.classification,
    'crmStage', l.crm_stage,
    'crmStageMode', l.crm_stage_mode,
    'crmVersion', l.crm_version,
    'crmStageUpdatedAt', l.crm_stage_updated_at,
    'crmStageUpdatedBy', l.crm_stage_updated_by,
    'temperature', l.temperature,
    'leadScore', l.lead_score,
    'leadScoreUpdatedAt', l.lead_score_updated_at,
    'firstContactAt', l.first_contact_at,
    'lastMessageAt', l.last_message_at,
    'messagesReceived', l.messages_received,
    'messagesSent', l.messages_sent,
    'originPlatform', l.origin_platform,
    'originEvidence', l.origin_evidence
  );
$$;

-- Universo visível do CRM de uma unidade: mesma regra do Pixel (verify_lead_unit_access).
-- Filtros já validados pelo servidor: instanceName, temperature (HOT/WARM/COLD/unrated),
-- classification, q (texto sem curingas) e qDigits (só dígitos).
create or replace function public.crm_filtered_leads(p_unit_id text, p_filters jsonb)
returns table(id uuid, crm_stage text, crm_stage_updated_at timestamptz, lead jsonb)
language sql
stable
set search_path = public
as $$
  select l.id, l.crm_stage, l.crm_stage_updated_at, public.crm_lead_json(l, i)
  from public.evolution_instances i
  join public.evolution_leads l on l.instance_name = i.instance_name
  where i.unit_id = p_unit_id
    and l.classification <> 'nao_lead'
    and l.is_quarantine = false
    and (coalesce(p_filters->>'instanceName', '') = '' or l.instance_name = p_filters->>'instanceName')
    and (
      coalesce(p_filters->>'temperature', '') = ''
      or (p_filters->>'temperature' = 'unrated' and l.temperature is null)
      or l.temperature = p_filters->>'temperature'
    )
    and (coalesce(p_filters->>'classification', '') = '' or l.classification = p_filters->>'classification')
    and (
      coalesce(p_filters->>'q', '') = ''
      or l.contact_name ilike '%' || (p_filters->>'q') || '%'
      or (
        coalesce(p_filters->>'qDigits', '') <> ''
        and (
          regexp_replace(coalesce(l.contact_phone, ''), '\D', '', 'g') like '%' || (p_filters->>'qDigits') || '%'
          or l.phone_last4 = p_filters->>'qDigits'
        )
      )
    );
$$;

-- Quadro inteiro num único snapshot: instâncias da unidade, total e primeira página por etapa.
create or replace function public.crm_board(p_unit_id text, p_filters jsonb, p_limit integer)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with ranked as materialized (
    select f.*,
      row_number() over (partition by f.crm_stage order by f.crm_stage_updated_at desc, f.id desc) as rn,
      count(*) over (partition by f.crm_stage) as stage_total
    from public.crm_filtered_leads(p_unit_id, p_filters) f
  )
  select jsonb_build_object(
    'instances', coalesce((
      select jsonb_agg(jsonb_build_object(
        'instanceName', i.instance_name,
        'displayName', i.display_name,
        'connectionStatus', i.connection_status
      ) order by coalesce(i.display_name, i.instance_name))
      from public.evolution_instances i where i.unit_id = p_unit_id
    ), '[]'::jsonb),
    'columns', (
      select jsonb_object_agg(s.stage, jsonb_build_object(
        'total', coalesce((select max(r.stage_total) from ranked r where r.crm_stage = s.stage), 0),
        'items', coalesce((
          select jsonb_agg(r.lead order by r.rn) from ranked r
          where r.crm_stage = s.stage and r.rn <= greatest(1, least(p_limit, 100))
        ), '[]'::jsonb)
      ))
      from unnest(array[
        'lead_not_responded', 'lead_responded', 'follow_up', 'lead_replied',
        'negotiation', 'closed_won', 'closed_lost'
      ]) as s(stage)
    ),
    'generatedAt', now()
  );
$$;

-- Próxima página de uma coluna, por cursor (crm_stage_updated_at desc, id desc).
create or replace function public.crm_list_leads(
  p_unit_id text, p_stage text, p_filters jsonb, p_after_at timestamptz, p_after_id uuid, p_limit integer
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with stage_leads as materialized (
    select f.* from public.crm_filtered_leads(p_unit_id, p_filters) f where f.crm_stage = p_stage
  ),
  page as (
    select s.* from stage_leads s
    where p_after_at is null or (s.crm_stage_updated_at, s.id) < (p_after_at, p_after_id)
    order by s.crm_stage_updated_at desc, s.id desc
    limit greatest(1, least(p_limit, 100))
  )
  select jsonb_build_object(
    'total', (select count(*) from stage_leads),
    'items', coalesce((select jsonb_agg(p.lead order by p.crm_stage_updated_at desc, p.id desc) from page p), '[]'::jsonb)
  );
$$;

create or replace function public.crm_get_lead(p_lead_id uuid, p_unit_id text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select public.crm_lead_json(l, i)
  from public.evolution_leads l
  join public.evolution_instances i on i.instance_name = l.instance_name
  where l.id = p_lead_id and i.unit_id = p_unit_id
    and l.classification <> 'nao_lead' and l.is_quarantine = false;
$$;

-- Histórico paginado; null quando o lead não é visível na unidade.
create or replace function public.crm_lead_history(
  p_lead_id uuid, p_unit_id text, p_after_at timestamptz, p_after_id uuid, p_limit integer
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when public.crm_get_lead(p_lead_id, p_unit_id) is null then null else jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', h.id,
        'eventType', h.event_type,
        'fromStage', h.from_stage,
        'toStage', h.to_stage,
        'fromMode', h.from_mode,
        'toMode', h.to_mode,
        'actorId', h.actor_id,
        'actorType', h.actor_type,
        'changedBy', h.changed_by,
        'changedAt', h.changed_at,
        'note', h.note
      ) order by h.changed_at desc, h.id desc)
      from (
        select * from public.evolution_crm_stage_history hh
        where hh.lead_id = p_lead_id
          and (p_after_at is null or (hh.changed_at, hh.id) < (p_after_at, p_after_id))
        order by hh.changed_at desc, hh.id desc
        limit greatest(1, least(p_limit, 100))
      ) h
    ), '[]'::jsonb)
  ) end;
$$;

-- ─── Mutações do usuário (versionadas, idempotentes, com escopo revalidado) ─
-- Bloqueia a instância (FOR SHARE) antes do lead (FOR UPDATE): uma transferência de unidade
-- (UPDATE em evolution_instances) espera o movimento terminar, e vice-versa.
create or replace function public.crm_move_lead_stage(
  p_lead_id uuid, p_unit_id text, p_to_stage text, p_expected_version bigint,
  p_actor_id text, p_actor_label text, p_request_id uuid, p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text := md5(concat_ws('|', 'move', p_lead_id, p_unit_id, p_to_stage, p_expected_version, coalesce(p_note, '')));
  v_instance_name text;
  v_instance public.evolution_instances%rowtype;
  v_lead public.evolution_leads%rowtype;
  v_receipt public.evolution_crm_mutation_receipts%rowtype;
  v_from_stage text;
  v_from_mode text;
  v_now timestamptz := now();
begin
  if p_to_stage not in (
    'lead_not_responded', 'lead_responded', 'follow_up', 'lead_replied',
    'negotiation', 'closed_won', 'closed_lost'
  ) then
    return jsonb_build_object('status', 'invalid_stage');
  end if;
  if nullif(trim(p_actor_id), '') is null or p_request_id is null or p_expected_version is null then
    return jsonb_build_object('status', 'invalid_request');
  end if;

  select l.instance_name into v_instance_name from public.evolution_leads l where l.id = p_lead_id;
  if v_instance_name is null then return jsonb_build_object('status', 'not_found'); end if;

  select * into v_instance from public.evolution_instances where instance_name = v_instance_name for share;
  select * into v_lead from public.evolution_leads where id = p_lead_id for update;
  if not found or v_lead.instance_name <> v_instance_name or v_instance.unit_id is distinct from p_unit_id
     or v_lead.classification = 'nao_lead' or v_lead.is_quarantine then
    return jsonb_build_object('status', 'not_found');
  end if;

  select * into v_receipt from public.evolution_crm_mutation_receipts
  where actor_id = p_actor_id and request_id = p_request_id;
  if found then
    if v_receipt.payload_hash <> v_hash or v_receipt.lead_id <> p_lead_id then
      return jsonb_build_object('status', 'request_conflict');
    end if;
    return jsonb_build_object('status', v_receipt.status, 'replayed', true, 'lead', public.crm_lead_json(v_lead, v_instance));
  end if;

  if v_lead.crm_version <> p_expected_version then
    return jsonb_build_object('status', 'version_conflict', 'lead', public.crm_lead_json(v_lead, v_instance));
  end if;

  v_from_stage := v_lead.crm_stage;
  v_from_mode := v_lead.crm_stage_mode;

  if v_from_stage is distinct from p_to_stage then
    update public.evolution_leads
    set crm_stage = p_to_stage,
        crm_stage_mode = 'manual',
        crm_version = crm_version + 1,
        crm_stage_updated_at = v_now,
        crm_stage_updated_by = nullif(trim(p_actor_label), ''),
        updated_at = v_now
    where id = p_lead_id
    returning * into v_lead;

    insert into public.evolution_crm_stage_history (
      lead_id, instance_name, from_stage, to_stage, changed_by, changed_at, note,
      event_type, actor_id, actor_type, request_id, version_after, from_mode, to_mode
    ) values (
      p_lead_id, v_lead.instance_name, v_from_stage, p_to_stage, nullif(trim(p_actor_label), ''), v_now,
      nullif(trim(left(p_note, 500)), ''), 'stage_changed', p_actor_id, 'user', p_request_id,
      v_lead.crm_version, v_from_mode, 'manual'
    );
  end if;

  insert into public.evolution_crm_mutation_receipts (actor_id, request_id, lead_id, payload_hash, status)
  values (p_actor_id, p_request_id, p_lead_id, v_hash, 'ok');
  delete from public.evolution_crm_mutation_receipts where created_at < v_now - interval '7 days';

  return jsonb_build_object('status', 'ok', 'replayed', false, 'lead', public.crm_lead_json(v_lead, v_instance));
end;
$$;

-- Devolve a etapa do lead à automação. A etapa atual não muda; a próxima classificação da Laya
-- pode voltar a movê-la.
create or replace function public.crm_set_lead_automatic(
  p_lead_id uuid, p_unit_id text, p_expected_version bigint,
  p_actor_id text, p_actor_label text, p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text := md5(concat_ws('|', 'automatic', p_lead_id, p_unit_id, p_expected_version));
  v_instance_name text;
  v_instance public.evolution_instances%rowtype;
  v_lead public.evolution_leads%rowtype;
  v_receipt public.evolution_crm_mutation_receipts%rowtype;
  v_now timestamptz := now();
begin
  if nullif(trim(p_actor_id), '') is null or p_request_id is null or p_expected_version is null then
    return jsonb_build_object('status', 'invalid_request');
  end if;

  select l.instance_name into v_instance_name from public.evolution_leads l where l.id = p_lead_id;
  if v_instance_name is null then return jsonb_build_object('status', 'not_found'); end if;

  select * into v_instance from public.evolution_instances where instance_name = v_instance_name for share;
  select * into v_lead from public.evolution_leads where id = p_lead_id for update;
  if not found or v_lead.instance_name <> v_instance_name or v_instance.unit_id is distinct from p_unit_id
     or v_lead.classification = 'nao_lead' or v_lead.is_quarantine then
    return jsonb_build_object('status', 'not_found');
  end if;

  select * into v_receipt from public.evolution_crm_mutation_receipts
  where actor_id = p_actor_id and request_id = p_request_id;
  if found then
    if v_receipt.payload_hash <> v_hash or v_receipt.lead_id <> p_lead_id then
      return jsonb_build_object('status', 'request_conflict');
    end if;
    return jsonb_build_object('status', v_receipt.status, 'replayed', true, 'lead', public.crm_lead_json(v_lead, v_instance));
  end if;

  if v_lead.crm_version <> p_expected_version then
    return jsonb_build_object('status', 'version_conflict', 'lead', public.crm_lead_json(v_lead, v_instance));
  end if;

  if v_lead.crm_stage_mode <> 'automatic' then
    update public.evolution_leads
    set crm_stage_mode = 'automatic', crm_version = crm_version + 1, updated_at = v_now
    where id = p_lead_id
    returning * into v_lead;

    insert into public.evolution_crm_stage_history (
      lead_id, instance_name, from_stage, to_stage, changed_by, changed_at, note,
      event_type, actor_id, actor_type, request_id, version_after, from_mode, to_mode
    ) values (
      p_lead_id, v_lead.instance_name, v_lead.crm_stage, v_lead.crm_stage, nullif(trim(p_actor_label), ''), v_now,
      null, 'automation_resumed', p_actor_id, 'user', p_request_id, v_lead.crm_version, 'manual', 'automatic'
    );
  end if;

  insert into public.evolution_crm_mutation_receipts (actor_id, request_id, lead_id, payload_hash, status)
  values (p_actor_id, p_request_id, p_lead_id, v_hash, 'ok');
  delete from public.evolution_crm_mutation_receipts where created_at < v_now - interval '7 days';

  return jsonb_build_object('status', 'ok', 'replayed', false, 'lead', public.crm_lead_json(v_lead, v_instance));
end;
$$;

-- ─── Writers existentes passam a respeitar a decisão manual ─────────────────
-- Movimento do painel administrativo global (sem unidade): também é uma decisão manual.
create or replace function public.move_evolution_lead_stage(
  p_lead_id uuid, p_instance_name text, p_to_stage text, p_changed_by text, p_note text default null
)
returns table(lead_id uuid, crm_stage text, crm_stage_updated_at timestamptz)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_from_stage text;
  v_from_mode text;
  v_version bigint;
  v_updated_at timestamptz := now();
begin
  if p_to_stage not in (
    'lead_not_responded', 'lead_responded', 'follow_up', 'lead_replied',
    'negotiation', 'closed_won', 'closed_lost'
  ) then
    raise exception 'invalid CRM stage';
  end if;

  select lead.crm_stage, lead.crm_stage_mode into v_from_stage, v_from_mode
  from public.evolution_leads as lead
  where lead.id = p_lead_id and lead.instance_name = p_instance_name
  for update;

  if v_from_stage is null then
    raise exception 'lead not found for instance';
  end if;

  if v_from_stage is distinct from p_to_stage then
    update public.evolution_leads
    set crm_stage = p_to_stage,
        crm_stage_mode = 'manual',
        crm_version = crm_version + 1,
        crm_stage_updated_at = v_updated_at,
        crm_stage_updated_by = nullif(trim(p_changed_by), ''),
        updated_at = v_updated_at
    where id = p_lead_id and instance_name = p_instance_name
    returning crm_version into v_version;

    insert into public.evolution_crm_stage_history (
      lead_id, instance_name, from_stage, to_stage, changed_by, changed_at, note,
      event_type, actor_type, version_after, from_mode, to_mode
    ) values (
      p_lead_id, p_instance_name, v_from_stage, p_to_stage,
      nullif(trim(p_changed_by), ''), v_updated_at, nullif(trim(p_note), ''),
      'stage_changed', 'user', v_version, v_from_mode, 'manual'
    );
  end if;

  return query select p_lead_id, p_to_stage, v_updated_at;
end;
$$;

-- Automações (Laya, regra de texto, IA diária). Cada item pode trazer expected_version (a versão
-- que a automação observou). O item é ignorado (applied = false) quando o lead está em modo
-- manual, quando a versão mudou desde a observação ou quando a etapa já é a proposta.
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
  v_expected_version bigint;
  v_from_stage text;
  v_mode text;
  v_version bigint;
  v_stage_updated_at timestamptz;
  v_updated_at timestamptz;
begin
  for v_item in select * from jsonb_array_elements(p_updates)
  loop
    v_lead_id := nullif(v_item->>'lead_id', '')::uuid;
    v_instance_name := v_item->>'instance_name';
    v_to_stage := v_item->>'to_stage';
    v_changed_by := v_item->>'changed_by';
    v_note := v_item->>'note';
    v_expected_version := nullif(v_item->>'expected_version', '')::bigint;
    v_updated_at := now();

    if v_lead_id is null or v_instance_name is null or v_to_stage not in (
      'lead_not_responded', 'lead_responded', 'follow_up', 'lead_replied',
      'negotiation', 'closed_won', 'closed_lost'
    ) then
      continue;
    end if;

    v_from_stage := null;
    select lead.crm_stage, lead.crm_stage_mode, lead.crm_version, lead.crm_stage_updated_at
      into v_from_stage, v_mode, v_version, v_stage_updated_at
    from public.evolution_leads as lead
    where lead.id = v_lead_id and lead.instance_name = v_instance_name
    for update;

    if v_from_stage is null then
      continue;
    end if;

    if v_mode = 'manual'
       or (v_expected_version is not null and v_expected_version <> v_version)
       or v_from_stage = v_to_stage then
      lead_id := v_lead_id;
      crm_stage := v_from_stage;
      crm_stage_updated_at := v_stage_updated_at;
      applied := false;
      return next;
      continue;
    end if;

    update public.evolution_leads
    set crm_stage = v_to_stage,
        crm_version = crm_version + 1,
        crm_stage_updated_at = v_updated_at,
        crm_stage_updated_by = nullif(trim(v_changed_by), ''),
        updated_at = v_updated_at
    where id = v_lead_id and instance_name = v_instance_name
    returning crm_version into v_version;

    insert into public.evolution_crm_stage_history (
      lead_id, instance_name, from_stage, to_stage, changed_by, changed_at, note,
      event_type, actor_id, actor_type, version_after, from_mode, to_mode
    ) values (
      v_lead_id, v_instance_name, v_from_stage, v_to_stage,
      nullif(trim(v_changed_by), ''), v_updated_at, nullif(trim(v_note), ''),
      'stage_changed', nullif(trim(v_changed_by), ''), 'automation', v_version, 'automatic', 'automatic'
    );

    lead_id := v_lead_id;
    crm_stage := v_to_stage;
    crm_stage_updated_at := v_updated_at;
    applied := true;
    return next;
  end loop;
end;
$$;

-- Temperatura continua automática mesmo em modo manual, mas descarta avaliações de um estado da
-- conversa mais antigo que o já aplicado (source_at = last_message_at observado na classificação).
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
      lead_score_updated_at = now(),
      lead_score_source_at = coalesce(item.source_at, lead.lead_score_source_at)
  from jsonb_to_recordset(p_updates) as item(lead_id uuid, instance_name text, lead_score smallint, temperature text, source_at timestamptz)
  where lead.id = item.lead_id
    and lead.instance_name = item.instance_name
    and item.lead_score between 0 and 100
    and item.temperature in ('HOT', 'WARM', 'COLD')
    and (item.source_at is null or lead.lead_score_source_at is null or item.source_at >= lead.lead_score_source_at);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ─── Permissões ─────────────────────────────────────────────────────────────
-- Somente o backend (service_role) acessa o Evolution. RLS já está habilitada e sem políticas;
-- revogar os grants de tabela é defesa extra contra uma política criada por engano.
do $$
declare t text;
begin
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'evolution\_%'
  loop
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end $$;

do $$
declare fn regprocedure;
begin
  for fn in
    select p.oid::regprocedure
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'crm_lead_json', 'crm_filtered_leads', 'crm_board', 'crm_list_leads', 'crm_get_lead',
        'crm_lead_history', 'crm_move_lead_stage', 'crm_set_lead_automatic',
        'move_evolution_lead_stage', 'move_evolution_lead_stage_batch', 'set_evolution_lead_scores_batch',
        'verify_lead_unit_access'
      )
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end $$;
