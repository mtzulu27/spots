-- Prepared for a future database sync; local catalog updates do not execute this migration.
alter table public.spot_branches
  add column if not exists min_people integer,
  add column if not exists typical_budget integer,
  add column if not exists budget_basis text,
  add column if not exists menu_calculation_note text,
  add column if not exists google_maps_url text,
  add column if not exists website_url text;

comment on column public.spot_branches.typical_budget is
  'Estimated normal visit per person in COP, with formula recorded in budget_basis; distinct from minimum and maximum.';
comment on column public.spot_branches.min_people is
  'Editorial suggested group size, not confirmed occupancy or reservation capacity.';
comment on column public.spot_branches.google_maps_url is
  'Verified public Google Maps place profile URL, not camera coordinates.';
