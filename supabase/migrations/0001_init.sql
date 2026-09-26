-- DevGalaxy schema.
-- Auth is Clerk; Supabase receives the Clerk session JWT, so ownership checks
-- compare the `sub` claim of the request JWT with the row's user_id.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id          text primary key,          -- Clerk user id (user_xxx)
  email       text,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- galaxies
create table if not exists public.galaxies (
  id                uuid primary key default gen_random_uuid(),
  user_id           text not null,
  project_name      text not null,
  original_idea     text not null,
  description       text,
  app_type          text,
  complexity        text check (complexity in ('simple', 'medium', 'complex')),
  architecture_data jsonb not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists galaxies_user_id_created_at_idx
  on public.galaxies (user_id, created_at desc);

-- keep updated_at honest
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists galaxies_touch_updated_at on public.galaxies;
create trigger galaxies_touch_updated_at
  before update on public.galaxies
  for each row execute function public.touch_updated_at();

-- --------------------------------------------------------------------- RLS
-- Every policy is scoped to the Clerk subject, so changing a galaxy id in the
-- URL cannot reveal (or mutate) another user's architecture.
alter table public.profiles enable row level security;
alter table public.galaxies enable row level security;

create or replace function public.clerk_user_id()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub',
    ''
  );
$$;

drop policy if exists "profiles are self-service" on public.profiles;
create policy "profiles are self-service" on public.profiles
  for all
  using (id = public.clerk_user_id())
  with check (id = public.clerk_user_id());

drop policy if exists "galaxies are readable by owner" on public.galaxies;
create policy "galaxies are readable by owner" on public.galaxies
  for select using (user_id = public.clerk_user_id());

drop policy if exists "galaxies are insertable by owner" on public.galaxies;
create policy "galaxies are insertable by owner" on public.galaxies
  for insert with check (user_id = public.clerk_user_id());

drop policy if exists "galaxies are updatable by owner" on public.galaxies;
create policy "galaxies are updatable by owner" on public.galaxies
  for update
  using (user_id = public.clerk_user_id())
  with check (user_id = public.clerk_user_id());

drop policy if exists "galaxies are deletable by owner" on public.galaxies;
create policy "galaxies are deletable by owner" on public.galaxies
  for delete using (user_id = public.clerk_user_id());
