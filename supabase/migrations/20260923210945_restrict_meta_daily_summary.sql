-- Restrict historical Meta metrics to active administrators and granted units.
ALTER TABLE IF EXISTS public.meta_ads_daily_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura de métricas diárias para autenticados" ON public.meta_ads_daily_summary;
DROP POLICY IF EXISTS "Permitir gravação de métricas diárias para autenticados" ON public.meta_ads_daily_summary;

CREATE POLICY "Permitir leitura de métricas diárias para autenticados"
ON public.meta_ads_daily_summary FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles profile
    WHERE profile.id::text = (SELECT auth.uid())::text
      AND profile.status = 'active'
      AND profile.role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.user_client_access access
    WHERE access.user_id::text = (SELECT auth.uid())::text
      AND access.client_id::text = meta_ads_daily_summary.client_id
  )
);

REVOKE ALL ON public.meta_ads_daily_summary FROM anon;
GRANT SELECT ON public.meta_ads_daily_summary TO authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'vw_meta_ads_daily_summary' AND c.relkind = 'v'
  ) THEN
    ALTER VIEW public.vw_meta_ads_daily_summary SET (security_invoker = true);
    REVOKE ALL ON public.vw_meta_ads_daily_summary FROM anon;
    GRANT SELECT ON public.vw_meta_ads_daily_summary TO authenticated;
  END IF;
END $$;
