-- Banco de Talentos Vida Card para o Supabase separado já usado pelo Evolution.
-- A dashboard continua sendo a fonte de usuários e permissões por unidade.
-- Por estarem em projetos diferentes, client_id é uma referência lógica ao UUID de public.clients
-- no Supabase da dashboard; nunca há cópia de usuários ou credenciais neste banco.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.talent_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE,
  public_slug VARCHAR(120) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL DEFAULT 'Trabalhe Conosco',
  subtitle TEXT NOT NULL DEFAULT 'Faça parte do time Vida Card.',
  banner_url TEXT NULL,
  lgpd_disclaimer TEXT NOT NULL DEFAULT 'Autorizo a coleta e o tratamento dos meus dados pessoais e profissionais exclusivamente para fins de recrutamento e seleção, nos termos da Lei nº 13.709/2018.',
  success_title VARCHAR(255) NOT NULL DEFAULT 'Candidatura enviada!',
  success_message TEXT NOT NULL DEFAULT 'Recebemos suas informações. Caso seu perfil seja compatível com uma oportunidade, entraremos em contato.',
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.talent_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.talent_forms(id) ON DELETE CASCADE,
  field_key VARCHAR(100) NOT NULL,
  label TEXT NOT NULL,
  placeholder TEXT NULL,
  help_text TEXT NULL,
  field_type VARCHAR(20) NOT NULL CHECK (field_type IN ('text','textarea','email','phone','cpf','number','select','radio','checkbox','date','file')),
  is_required BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  validation_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_talent_form_field_key UNIQUE(form_id, field_key)
);

CREATE INDEX IF NOT EXISTS idx_talent_form_fields_order ON public.talent_form_fields(form_id, order_index);

CREATE TABLE IF NOT EXISTS public.talent_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.talent_forms(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  candidate_name VARCHAR(255) NULL,
  candidate_email VARCHAR(255) NULL,
  candidate_phone VARCHAR(50) NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  file_attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'novo' CHECK (status IN ('novo','em_analise','entrevista','aprovado','reprovado','banco')),
  notes TEXT NULL,
  lgpd_accepted_at TIMESTAMPTZ NOT NULL,
  consent_version VARCHAR(40) NOT NULL DEFAULT 'v1',
  ip_hash VARCHAR(64) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_talent_submissions_client_created ON public.talent_submissions(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_talent_submissions_client_status ON public.talent_submissions(client_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_talent_submissions_email ON public.talent_submissions(candidate_email);

CREATE OR REPLACE FUNCTION public.talent_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS talent_forms_updated_at ON public.talent_forms;
CREATE TRIGGER talent_forms_updated_at BEFORE UPDATE ON public.talent_forms FOR EACH ROW EXECUTE FUNCTION public.talent_touch_updated_at();
DROP TRIGGER IF EXISTS talent_submissions_updated_at ON public.talent_submissions;
CREATE TRIGGER talent_submissions_updated_at BEFORE UPDATE ON public.talent_submissions FOR EACH ROW EXECUTE FUNCTION public.talent_touch_updated_at();

ALTER TABLE public.talent_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_submissions ENABLE ROW LEVEL SECURITY;

-- Não expor dados de RH direta e publicamente pelo REST do Supabase.
-- O Express valida a sessão da dashboard e client_id antes de usar a service role
-- deste projeto. Assim, permissões seguem centralizadas em user_client_access.
DROP POLICY IF EXISTS talent_public_read_published_forms ON public.talent_forms;
DROP POLICY IF EXISTS talent_managers_manage_forms ON public.talent_forms;
DROP POLICY IF EXISTS talent_public_read_published_fields ON public.talent_form_fields;
DROP POLICY IF EXISTS talent_managers_manage_fields ON public.talent_form_fields;
DROP POLICY IF EXISTS talent_public_submit ON public.talent_submissions;
DROP POLICY IF EXISTS talent_managers_read_update_submissions ON public.talent_submissions;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('talent-resumes', 'talent-resumes', false, 5242880, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;
