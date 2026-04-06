create extension if not exists pgcrypto;

create table if not exists public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  platform text not null default 'web',
  user_agent text,
  permission text not null default 'default',
  installed boolean not null default false,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists web_push_subscriptions_user_id_idx
  on public.web_push_subscriptions (user_id);

create or replace function public.touch_web_push_subscriptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_web_push_subscriptions_updated_at on public.web_push_subscriptions;

create trigger set_web_push_subscriptions_updated_at
before update on public.web_push_subscriptions
for each row
execute function public.touch_web_push_subscriptions_updated_at();

alter table public.web_push_subscriptions enable row level security;

drop policy if exists "Users can view their own web push subscriptions" on public.web_push_subscriptions;
create policy "Users can view their own web push subscriptions"
on public.web_push_subscriptions
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own web push subscriptions" on public.web_push_subscriptions;
create policy "Users can insert their own web push subscriptions"
on public.web_push_subscriptions
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own web push subscriptions" on public.web_push_subscriptions;
create policy "Users can update their own web push subscriptions"
on public.web_push_subscriptions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own web push subscriptions" on public.web_push_subscriptions;
create policy "Users can delete their own web push subscriptions"
on public.web_push_subscriptions
for delete
using (auth.uid() = user_id);
