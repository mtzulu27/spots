-- Upgrade incremental para una tabla public.spots ya existente.
-- Aplica columnas nuevas usadas por el admin/mobile y corrige la restriccion
-- de type para soportar place + event + home.

alter table public.spots
  add column if not exists gallery_urls text[] not null default '{}',
  add column if not exists interests text[] not null default '{}';

do $$
declare
  existing_constraint record;
begin
  for existing_constraint in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'spots'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%type%'
  loop
    execute format('alter table public.spots drop constraint %I', existing_constraint.conname);
  end loop;
end
$$;

alter table public.spots
  add constraint spots_type_check
  check (type in ('place', 'event', 'home'));

update public.spots
set
  gallery_urls = coalesce(gallery_urls, '{}'),
  interests = coalesce(interests, '{}')
where gallery_urls is null
   or interests is null;
