-- ==============================================================================
-- Tabela de Backup e Histórico Diário de Métricas Meta Ads
-- Rode este script no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/kphhbpsfwklwddmgpsrm/sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.meta_ads_daily_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL,
  account_id TEXT,
  date_start DATE NOT NULL,
  date_stop DATE,
  total_spend NUMERIC DEFAULT 0,
  total_conversas_iniciadas NUMERIC DEFAULT 0,
  total_messaging_connections NUMERIC DEFAULT 0,
  total_leads_meta NUMERIC DEFAULT 0,
  total_impressions NUMERIC DEFAULT 0,
  impressions NUMERIC DEFAULT 0,
  total_clicks NUMERIC DEFAULT 0,
  clicks NUMERIC DEFAULT 0,
  avg_ctr NUMERIC DEFAULT 0,
  avg_cpc NUMERIC DEFAULT 0,
  avg_cpm NUMERIC DEFAULT 0,
  avg_frequency NUMERIC DEFAULT 0,
  custo_por_conversa NUMERIC,
  synced_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT meta_ads_daily_summary_client_date_unique UNIQUE (client_id, date_start)
);

-- Índices para consultas ultra rápidas por unidade e intervalo de datas
CREATE INDEX IF NOT EXISTS idx_meta_ads_daily_summary_client_date 
  ON public.meta_ads_daily_summary (client_id, date_start DESC);

CREATE INDEX IF NOT EXISTS idx_meta_ads_daily_summary_account 
  ON public.meta_ads_daily_summary (account_id);

-- Habilita Row Level Security (RLS)
ALTER TABLE public.meta_ads_daily_summary ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
DROP POLICY IF EXISTS "Permitir leitura de métricas diárias para autenticados" ON public.meta_ads_daily_summary;
CREATE POLICY "Permitir leitura de métricas diárias para autenticados"
  ON public.meta_ads_daily_summary
  FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Permitir gravação de métricas diárias para autenticados" ON public.meta_ads_daily_summary;
CREATE POLICY "Permitir gravação de métricas diárias para autenticados"
  ON public.meta_ads_daily_summary
  FOR ALL
  TO authenticated, anon
  USING (true);
