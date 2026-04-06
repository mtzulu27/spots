-- Migracion desde el modelo legacy actual:
--   public.spots      -> una fila por sede
-- hacia el modelo v2:
--   public.spots      -> entidad principal
--   public.spot_branches -> sedes
--
-- Flujo recomendado:
-- 1. rename table public.spots to public.spots_legacy;
-- 2. rename table public.spot_likes to public.spot_likes_legacy;  -- opcional, si existe
-- 3. ejecutar docs/supabase-spots-v2-schema.sql
-- 4. ejecutar este archivo

insert into public.spots (
  type,
  slug,
  name,
  short_description,
  cover_image_url,
  gallery_urls,
  category,
  city,
  likes,
  tags,
  moods,
  is_active,
  is_featured
)
select
  case when source.type = 'home' then 'event' else source.type end as type,
  source.seed_slug as slug,
  source.canonical_name as name,
  source.short_description,
  source.cover_image_url,
  source.gallery_urls,
  source.category,
  source.city,
  source.likes,
  source.tags,
  source.moods,
  source.is_active,
  source.is_featured
from (
  select distinct on (coalesce(nullif(brand_name, ''), nullif(name, '')))
    id as seed_slug,
    type,
    coalesce(nullif(brand_name, ''), nullif(name, '')) as canonical_name,
    short_description,
    image_url as cover_image_url,
    coalesce(gallery_urls, '{}') as gallery_urls,
    category,
    city,
    likes,
    coalesce(tags, '{}') as tags,
    coalesce(moods, '{}') as moods,
    coalesce(is_active, true) as is_active,
    coalesce(is_featured, false) as is_featured
  from public.spots_legacy
  order by
    coalesce(nullif(brand_name, ''), nullif(name, '')),
    sort_order asc,
    id asc
) source
on conflict (slug) do nothing;

insert into public.spot_branches (
  spot_id,
  slug,
  neighborhood,
  mall,
  hours,
  address,
  min_budget,
  max_people,
  menu_url,
  whatsapp,
  instagram,
  latitude,
  longitude,
  is_active,
  sort_order
)
select
  parent.id as spot_id,
  legacy.id as slug,
  coalesce(legacy.neighborhood, '') as neighborhood,
  coalesce(legacy.zone, '') as mall,
  coalesce(legacy.hours, '') as hours,
  coalesce(legacy.address, '') as address,
  coalesce(nullif(legacy.min_budget, 0), legacy.max_budget, 0) as min_budget,
  coalesce(legacy.max_people, 1) as max_people,
  coalesce(legacy.menu_url, '') as menu_url,
  coalesce(legacy.whatsapp, '') as whatsapp,
  coalesce(legacy.instagram, '') as instagram,
  legacy.latitude,
  legacy.longitude,
  coalesce(legacy.is_active, true) as is_active,
  coalesce(legacy.sort_order, 0) as sort_order
from public.spots_legacy legacy
join public.spots parent
  on parent.name = coalesce(nullif(legacy.brand_name, ''), nullif(legacy.name, ''))
where not exists (
  select 1
  from public.spot_branches branch
  where branch.slug = legacy.id
);
