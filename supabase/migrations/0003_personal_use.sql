-- DevGalaxy is for personal use: remove plans/subscriptions and track AI usage
-- and estimated spend instead, with an optional monthly budget enforced in
-- reserve_usage(). Run after 0001 and 0002.

drop function if exists public.admin_user_overview();
drop function if exists public.reserve_usage(text, text, text[], integer, timestamptz, uuid);
drop table if exists public.subscriptions;
drop table if exists public.plans;

alter table public.usage_events add column if not exists cost_cents integer not null default 0 check (cost_cents >= 0);
alter table public.usage_events add column if not exists tokens integer check (tokens is null or tokens >= 0);
create index if not exists usage_events_created_idx on public.usage_events (created_at);

-- Records one usage event with its estimated cost. Serialised with a global
-- advisory lock so parallel requests cannot overshoot the monthly budget.
-- p_budget_cents null = no budget. Raises 'budget_reached' when spent.
create or replace function public.reserve_usage(
  p_user_id text, p_action text, p_cost_cents integer, p_budget_cents integer, p_since timestamptz, p_galaxy_id uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  spent integer;
  event_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('ai-budget'));
  if p_budget_cents is not null then
    select coalesce(sum(cost_cents), 0) into spent from public.usage_events where created_at >= p_since;
    if spent >= p_budget_cents then
      raise exception 'budget_reached' using errcode = 'P0001';
    end if;
  end if;
  insert into public.usage_events (user_id, action_type, galaxy_id, cost_cents)
    values (p_user_id, p_action, p_galaxy_id, greatest(coalesce(p_cost_cents, 0), 0)) returning id into event_id;
  return event_id;
end $$;
revoke all on function public.reserve_usage(text, text, integer, integer, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.reserve_usage(text, text, integer, integer, timestamptz, uuid) to service_role;

create or replace function public.admin_user_overview()
returns table (
  id text, email text, full_name text, role text, account_status text, created_at timestamptz,
  last_seen_at timestamptz, galaxy_count bigint, usage_count bigint, cost_cents bigint
) language sql stable security definer set search_path = public as $$
  select p.id, p.email, p.full_name, p.role, p.account_status, p.created_at, p.last_seen_at,
         (select count(*) from public.galaxies g where g.user_id = p.id),
         (select count(*) from public.usage_events u where u.user_id = p.id),
         (select coalesce(sum(u.cost_cents), 0) from public.usage_events u where u.user_id = p.id)
  from public.profiles p
  order by p.created_at desc
$$;
revoke all on function public.admin_user_overview() from public, anon, authenticated;
grant execute on function public.admin_user_overview() to service_role;
