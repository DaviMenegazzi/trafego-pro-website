-- Aplicar no Supabase exclusivo do Evolution.
-- Fase 2 do plano do Pixel: verificacao O(1) de posse do lead + paginacao por cursor.

create index if not exists evolution_messages_lead_id_sent_at_idx
  on public.evolution_messages (lead_id, sent_at desc);

-- Confere, num unico roundtrip indexado, se o lead pertence a uma unidade autorizada
-- e se ele e visivel no Pixel (mesma regra de server/evolutionPixelPolicy.ts:isVisiblePixelLead).
-- Evita carregar todos os leads da unidade em memoria so para checar posse.
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
      and (
        l.classification = 'lead'
        or (l.origin_evidence <> 'none' and l.origin_platform in ('meta', 'google_ads', 'mixed'))
      )
  );
$$;

comment on function public.verify_lead_unit_access(uuid, text) is
  'Verificacao O(1) de posse+visibilidade de um lead do Pixel, usada pela rota de mensagens antes de expor a conversa.';
