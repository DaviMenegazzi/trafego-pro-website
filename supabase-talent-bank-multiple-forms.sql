-- Permite vários formulários por unidade sem alterar candidaturas já existentes.
ALTER TABLE public.talent_forms DROP CONSTRAINT IF EXISTS talent_forms_client_id_key;
CREATE INDEX IF NOT EXISTS idx_talent_forms_client_created ON public.talent_forms(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_talent_submissions_form_created ON public.talent_submissions(form_id, created_at DESC);
