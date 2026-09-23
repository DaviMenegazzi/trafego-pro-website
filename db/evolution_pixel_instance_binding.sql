-- Aplicar no Supabase exclusivo do Evolution antes de liberar /dashboard/pixel.
-- Mantem o nome para leitura humana e grava IDs estaveis para isolamento/autorizacao.

alter table public.evolution_instances
  add column if not exists unit_id text,
  add column if not exists meta_account_id text;

create index if not exists evolution_instances_unit_id_idx
  on public.evolution_instances (unit_id);

create index if not exists evolution_instances_meta_account_id_idx
  on public.evolution_instances (meta_account_id);

comment on column public.evolution_instances.unit_id is
  'ID estavel da unidade no Supabase principal; usado para autorizacao do Pixel.';

comment on column public.evolution_instances.meta_account_id is
  'Conta Meta selecionada no provisionamento; no MVP corresponde ao cliente/unidade da dashboard.';
