alter table public.user_profiles
  add column if not exists pixel_access boolean not null default false;

comment on column public.user_profiles.pixel_access is
  'Libera o acesso ao Pixel para usuários não administradores. Administradores sempre possuem acesso.';
