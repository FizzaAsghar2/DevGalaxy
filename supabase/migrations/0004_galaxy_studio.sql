-- Galaxy Studio: allow the studio AI operations in usage_events. Run after 0003.
alter table public.usage_events drop constraint if exists usage_events_action_type_check;
alter table public.usage_events add constraint usage_events_action_type_check check (action_type in
  ('GALAXY_GENERATION', 'UI_GENERATION', 'UI_REGENERATION', 'DESIGN_VARIATION', 'AI_UI_CUSTOMIZATION',
   'STUDIO_PLAN', 'STUDIO_VARIATIONS', 'STUDIO_EDIT'));
create index if not exists usage_events_day_idx on public.usage_events (created_at, cost_cents);
