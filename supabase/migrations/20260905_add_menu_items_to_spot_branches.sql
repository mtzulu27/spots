alter table public.spot_branches
  add column if not exists menu_items jsonb not null default '[]'::jsonb;

comment on column public.spot_branches.menu_items is
  'Productos verificados de la carta de esta sede. Cada elemento contiene name, price, category, menuSection, sourceUrl y verifiedAt.';

alter table public.spot_branches
  add constraint spot_branches_menu_items_is_array
  check (jsonb_typeof(menu_items) = 'array') not valid;

alter table public.spot_branches
  validate constraint spot_branches_menu_items_is_array;
