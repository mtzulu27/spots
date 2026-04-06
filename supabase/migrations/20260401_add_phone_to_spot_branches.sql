alter table public.spot_branches
add column if not exists phone text not null default '';
