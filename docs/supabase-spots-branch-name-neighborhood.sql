-- Normaliza identidad y sede para lugares:
-- 1. name y brand_name deben coincidir en places
-- 2. branch_name representa la sede editorial y, en la mayoria de casos,
--    debe coincidir con neighborhood.

update public.spots
set name = brand_name
where type = 'place'
  and coalesce(brand_name, '') <> ''
  and name is distinct from brand_name;

update public.spots
set branch_name = neighborhood
where coalesce(neighborhood, '') <> ''
  and branch_name is distinct from neighborhood;
