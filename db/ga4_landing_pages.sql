-- Supabase "trafegopro-analise": vínculo entre a Landing Page (propriedade do GA4) e a unidade
-- (conta da Meta, sem o prefixo act_). Cadastrado por administradores na tela Google Analytics.
-- Acesso apenas pelo servidor (service_role): RLS ligado sem políticas.

create table if not exists public.ga4_landing_pages (
  id uuid primary key default gen_random_uuid(),
  unit_id text not null,
  property_id text not null check (property_id ~ '^[0-9]+$'),
  name text not null check (char_length(name) between 1 and 120),
  hostnames jsonb not null default '[]'::jsonb check (jsonb_typeof(hostnames) = 'array'),
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (unit_id, property_id)
);
create index if not exists idx_ga4_landing_pages_unit on public.ga4_landing_pages (unit_id);

alter table public.ga4_landing_pages enable row level security;
revoke all on public.ga4_landing_pages from anon, authenticated;

-- Endereço público da Landing Page (botão "Abrir Landing Page" na tela Google Analytics).
alter table public.ga4_landing_pages
  add column if not exists site_url text check (site_url is null or (site_url ~ '^https?://' and char_length(site_url) <= 300));
