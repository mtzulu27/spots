create table if not exists public.spots (
  id text primary key,
  type text not null check (type in ('place', 'home')),
  name text not null,
  brand_name text not null,
  branch_name text not null, -- nombre editorial de sede, normalmente alineado con el barrio o sector, por ejemplo "Pance" o "Granada"
  neighborhood text not null, -- barrio o sector base
  category text not null,
  city text not null default 'Cali',
  zone text not null default '', -- hub o mall opcional, por ejemplo "Puerto 125"
  likes text not null default '0',
  image_url text not null,
  gallery_urls text[] not null default '{}',
  short_description text not null default '',
  description text not null default '',
  interests text[] not null default '{}',
  max_people integer not null default 1,
  days text[] not null default '{}',
  distance_km numeric not null default 0,
  min_budget integer not null default 0,
  max_budget integer not null default 0,
  hours text not null default '',
  address text not null default '',
  instagram text not null default '',
  whatsapp text not null default '',
  menu_url text not null default '',
  tags text[] not null default '{}',
  moods text[] not null default '{}',
  latitude double precision,
  longitude double precision,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists spots_type_idx on public.spots (type);
create index if not exists spots_category_idx on public.spots (category);
create index if not exists spots_active_idx on public.spots (is_active);
create index if not exists spots_sort_idx on public.spots (sort_order);

alter table public.spots replica identity full;

alter publication supabase_realtime add table public.spots;

create table if not exists public.spot_likes (
  user_id uuid not null references auth.users (id) on delete cascade,
  spot_id text not null references public.spots (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, spot_id)
);

create index if not exists spot_likes_spot_idx on public.spot_likes (spot_id);
create index if not exists spot_likes_user_idx on public.spot_likes (user_id);

alter table public.spot_likes enable row level security;
alter table public.spot_likes replica identity full;

create policy "public read spot likes"
on public.spot_likes
for select
to anon, authenticated
using (true);

create policy "authenticated manage own likes"
on public.spot_likes
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.spot_likes;
