-- Catalog-driven push: only opted-in subscriptions, no direct client queue access.
create table public.place_notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  new_place boolean not null default false,
  new_branch boolean not null default false,
  updated_place boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.place_notification_preferences enable row level security;
create policy own_place_notification_preferences on public.place_notification_preferences
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.place_notification_preferences to authenticated;

create table public.place_push_queue (
  event_id text not null,
  subscription_id uuid not null references public.web_push_subscriptions(id) on delete cascade,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','sending','sent','skipped','failed')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  last_error text,
  primary key(event_id, subscription_id)
);
alter table public.place_push_queue enable row level security;
revoke all on public.place_push_queue from anon, authenticated;
grant all on public.place_push_queue, public.place_notification_preferences to service_role;
create index place_push_pending on public.place_push_queue (available_at) where status in ('pending','sending');

create function public.enqueue_place_update_push(events jsonb) returns void
language sql security definer set search_path = public as $$
  insert into place_push_queue(event_id, subscription_id, payload)
  select e->>'id', s.id, e
  from jsonb_array_elements(events) e
  join web_push_subscriptions s on s.permission = 'granted'
  join place_notification_preferences p on p.user_id = s.user_id
  where (e->>'occurredAt')::timestamptz >= greatest(s.created_at, p.created_at, now() - interval '24 hours')
    and (e->>'occurredAt')::timestamptz <= now()
    and case e->>'type' when 'newPlace' then p.new_place when 'newBranch' then p.new_branch when 'updatedPlace' then p.updated_place else false end
  on conflict do nothing;
$$;
create function public.claim_place_update_push() returns setof public.place_push_queue
language sql security definer set search_path = public as $$
  update place_push_queue q set status = 'sending', claimed_at = now(), attempts = attempts + 1
  where (q.event_id, q.subscription_id) in (
    select event_id, subscription_id from place_push_queue
    where attempts < 5 and available_at <= now()
      and (status = 'pending' or (status = 'sending' and claimed_at < now() - interval '10 minutes'))
    order by available_at limit 25 for update skip locked
  ) returning q.*;
$$;
revoke all on function public.enqueue_place_update_push(jsonb) from public, anon, authenticated;
revoke all on function public.claim_place_update_push() from public, anon, authenticated;
grant execute on function public.enqueue_place_update_push(jsonb) to service_role;
grant execute on function public.claim_place_update_push() to service_role;
