-- View de anúncios (nível de ad) consumida pela aba "Anúncios" (/dashboard/anuncios).
-- Rode uma vez no SQL Editor do Supabase. Depende da tabela public.meta_ads_offers
-- (a mesma origem já usada para as métricas de Meta Ads do painel).
--
-- Bandas de performance baseadas no custo por conversa (CPL de conversa).
-- A coluna client_id faz parte da view para permitir o isolamento de cada
-- unidade na aba de anúncios.

drop view if exists public.vw_meta_ads_offer_ads;

create view public.vw_meta_ads_offer_ads
with (security_invoker = true)
as
select
  id, client_id, account_id, date_start, date_stop, synced_at,
  campaign_id, campaign_name, adset_id, adset_name,
  ad_id, ad_name, creative_id, creative_name,
  offer_name, offer_status, ad_image_url,
  spend                          as total_spend,
  conversations_started          as total_conversas_iniciadas,
  total_messaging_connections,
  leads_meta                     as total_leads_meta,
  reach                          as alcance,
  impressions                    as total_impressions,
  clicks                         as total_clicks,
  inline_link_clicks             as total_link_clicks,
  ctr                            as avg_ctr,
  cpc                            as avg_cpc,
  cpm                            as avg_cpm,
  cost_per_conversation          as custo_por_conversa,
  cpl_meta,
  case
    when offer_status = 'ACTIVE' then 'Ativa'
    when offer_status in ('PAUSED', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED') then 'Pausada'
    else offer_status
  end as status_formatado,
  case
    when coalesce(spend, 0) = 0 and coalesce(conversations_started, 0) > 0 then 'Residual'
    when coalesce(spend, 0) > 0 and coalesce(conversations_started, 0) = 0 then 'Sem conversas'
    when cost_per_conversation is null then 'Sem classificação'
    when cost_per_conversation < 5.00  then 'Excelente'
    when cost_per_conversation < 9.00  then 'Positivo'
    when cost_per_conversation < 13.00 then 'Atenção'
    else 'Crítico'
  end as performance_status,
  case
    when coalesce(spend, 0) = 0 and coalesce(conversations_started, 0) > 0
      then 'Oferta sem investimento atual, mas com conversas registradas no período.'
    when coalesce(spend, 0) > 0 and coalesce(conversations_started, 0) = 0
      then 'Investimento registrado, mas nenhuma conversa iniciada.'
    when cost_per_conversation is null
      then 'Dados insuficientes para classificar a performance.'
    when cost_per_conversation < 5.00
      then 'Custo por conversa abaixo de R$ 5,00.'
    when cost_per_conversation < 9.00
      then 'Custo por conversa entre R$ 5,00 e R$ 9,00, com espaço para otimização.'
    when cost_per_conversation < 13.00
      then 'Custo por conversa entre R$ 9,00 e R$ 13,00, precisa de acompanhamento.'
    else 'Custo por conversa acima de R$ 13,00.'
  end as performance_reason
from public.meta_ads_offers
order by spend desc;
