-- DevGalaxy: UI previews, roles, plans, subscriptions, usage and admin audit.
--
-- Trust model
--   * The browser talks to Supabase with the user's Clerk JWT (role `authenticated`).
--     It may READ its own profile, subscription and usage, and read/rename/delete its
--     own galaxies. It can never write roles, plans, subscriptions or usage.
--   * Every privileged write goes through the serverless API using the service role
--     key (server-only), after the Clerk session has been verified.
--   * Admin status lives only in public.profiles.role and is granted with SQL by the
--     project owner (see README "Admin setup"). There is no admin password anywhere.

-- ---------------------------------------------------------------- helpers
create or replace function public.requesting_user_id()
returns text language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')
$$;

-- ---------------------------------------------------------------- profiles
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles add column if not exists account_status text not null default 'active';
alter table public.profiles add column if not exists last_seen_at timestamptz;

do $$ begin
  alter table public.profiles add constraint profiles_role_check check (role in ('user', 'admin'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles add constraint profiles_status_check check (account_status in ('active', 'suspended'));
exception when duplicate_object then null; end $$;

create unique index if not exists profiles_email_lower_idx on public.profiles (lower(email)) where email is not null;

-- Replace the self-service policy from 0001: users may read, never write, their profile.
drop policy if exists "profiles are self-service" on public.profiles;
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select using (id = public.requesting_user_id());
revoke insert, update, delete on public.profiles from anon, authenticated;

-- ---------------------------------------------------------------- galaxies
alter table public.galaxies add column if not exists ui_data jsonb;
alter table public.galaxies add column if not exists generation_meta jsonb not null default '{}'::jsonb;

-- Galaxies are created by the server (so every one is tied to a usage event).
-- Users may still read, rename and delete their own.
drop policy if exists "galaxies are insertable by owner" on public.galaxies;
revoke insert on public.galaxies from anon, authenticated;
revoke update on public.galaxies from anon, authenticated;
grant update (project_name, updated_at) on public.galaxies to authenticated;

-- ---------------------------------------------------------------- plans
create table if not exists public.plans (
  id text primary key,
  name text not null,
  tagline text,
  price_cents integer check (price_cents is null or price_cents >= 0),
  currency text not null default 'usd',
  billing_interval text check (billing_interval is null or billing_interval in ('month', 'year')),
  galaxy_limit integer check (galaxy_limit is null or galaxy_limit >= 0),
  ui_limit integer check (ui_limit is null or ui_limit >= 0),
  regeneration_limit integer check (regeneration_limit is null or regeneration_limit >= 0),
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.plans (id, name, tagline, price_cents, billing_interval, galaxy_limit, ui_limit, regeneration_limit, features, sort_order)
values
  ('free', 'Free', 'Try DevGalaxy with one complete project', null, null, 1, 1, 0,
   '["1 architecture galaxy", "1 UI preview for that galaxy", "Galaxy & presentation mode", "Saved galaxies stay available"]', 0),
  ('pro', 'Pro', 'For builders exploring many ideas', null, 'month', 50, 50, 200,
   '["50 galaxies per billing period", "UI previews for every galaxy", "UI regeneration & design variations", "Natural-language UI customisation", "Advanced complexity & future export tools"]', 1)
on conflict (id) do nothing;

alter table public.plans enable row level security;
drop policy if exists "plans: public read active" on public.plans;
create policy "plans: public read active" on public.plans for select using (is_active);
revoke insert, update, delete on public.plans from anon, authenticated;

-- ---------------------------------------------------------------- subscriptions
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles (id) on delete cascade,
  plan_id text not null references public.plans (id),
  status text not null check (status in ('active', 'trialing', 'past_due', 'canceled', 'expired')),
  provider text not null default 'manual' check (provider in ('manual', 'admin_grant', 'stripe', 'lemonsqueezy', 'paddle')),
  provider_customer_id text,
  provider_subscription_id text unique,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_user_idx on public.subscriptions (user_id, status);

alter table public.subscriptions enable row level security;
drop policy if exists "subscriptions: read own" on public.subscriptions;
create policy "subscriptions: read own" on public.subscriptions
  for select using (user_id = public.requesting_user_id());
revoke insert, update, delete on public.subscriptions from anon, authenticated;

-- ---------------------------------------------------------------- usage events
create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  action_type text not null check (action_type in
    ('GALAXY_GENERATION', 'UI_GENERATION', 'UI_REGENERATION', 'DESIGN_VARIATION', 'AI_UI_CUSTOMIZATION')),
  galaxy_id uuid references public.galaxies (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists usage_events_user_idx on public.usage_events (user_id, action_type, created_at);

alter table public.usage_events enable row level security;
drop policy if exists "usage: read own" on public.usage_events;
create policy "usage: read own" on public.usage_events
  for select using (user_id = public.requesting_user_id());
revoke insert, update, delete on public.usage_events from anon, authenticated;

-- Atomically check a limit and record usage. Serialised per user with an advisory
-- lock, so two parallel requests cannot both spend the last free generation.
-- p_limit null = unlimited. Raises 'usage_limit_reached' when exhausted.
create or replace function public.reserve_usage(
  p_user_id text, p_action text, p_pool text[], p_limit integer, p_since timestamptz, p_galaxy_id uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  used integer;
  event_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('usage:' || p_user_id));
  if p_limit is not null then
    select count(*) into used from public.usage_events
      where user_id = p_user_id and action_type = any (p_pool) and created_at >= coalesce(p_since, '-infinity'::timestamptz);
    if used >= p_limit then
      raise exception 'usage_limit_reached' using errcode = 'P0001';
    end if;
  end if;
  insert into public.usage_events (user_id, action_type, galaxy_id)
    values (p_user_id, p_action, p_galaxy_id) returning id into event_id;
  return event_id;
end $$;
revoke all on function public.reserve_usage(text, text, text[], integer, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.reserve_usage(text, text, text[], integer, timestamptz, uuid) to service_role;

-- ---------------------------------------------------------------- admin audit log
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id text not null,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_created_idx on public.admin_audit_logs (created_at desc);

-- No policies: only the service role (used by the verified admin API) can read or write.
alter table public.admin_audit_logs enable row level security;
revoke all on public.admin_audit_logs from anon, authenticated;

-- ---------------------------------------------------------------- admin overview
create or replace function public.admin_user_overview()
returns table (
  id text, email text, full_name text, role text, account_status text, created_at timestamptz,
  last_seen_at timestamptz, plan_id text, subscription_status text, galaxy_count bigint, usage_count bigint
) language sql stable security definer set search_path = public as $$
  select p.id, p.email, p.full_name, p.role, p.account_status, p.created_at, p.last_seen_at,
         coalesce(s.plan_id, 'free'), s.status,
         (select count(*) from public.galaxies g where g.user_id = p.id),
         (select count(*) from public.usage_events u where u.user_id = p.id)
  from public.profiles p
  left join lateral (
    select plan_id, status from public.subscriptions
    where user_id = p.id and status in ('active', 'trialing')
      and (current_period_end is null or current_period_end > now())
    order by created_at desc limit 1
  ) s on true
  order by p.created_at desc
$$;
revoke all on function public.admin_user_overview() from public, anon, authenticated;
grant execute on function public.admin_user_overview() to service_role;
