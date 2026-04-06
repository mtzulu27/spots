# Spots + Supabase

## Variables de entorno

### Mobile

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Admin

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Source of truth

La base de datos en Supabase es la unica fuente de verdad.

No se debe seguir construyendo producto nuevo sobre:

- `mockSpots` en mobile
- `initialSpots` en admin
- la tabla legacy antigua de una fila por sede

## Schema actual recomendado

Para la estructura nueva, ejecuta:

- [supabase-spots-v2-schema.sql](/Users/mateo/Documents/Playground/docs/supabase-spots-v2-schema.sql)

Ese schema crea:

- `public.spots`
- `public.spot_branches`
- `public.spot_branch_hours`
- `public.spot_branch_schedule_exceptions`
- `public.spot_likes`

## Horarios estructurados

Para agregar el modelo correcto de horarios semanales y excepciones por fecha
sobre una base v2 ya existente, ejecuta:

- [supabase-spots-v2-hours-migration.sql](/Users/mateo/Documents/Playground/docs/supabase-spots-v2-hours-migration.sql)

Eso agrega:

- `public.spot_branch_hours`
- `public.spot_branch_schedule_exceptions`

La guía de UX y uso está aquí:

- [spots-hours-admin-ux.md](/Users/mateo/Documents/Playground/docs/spots-hours-admin-ux.md)

## Migracion desde el modelo legacy

Si ya tienes la tabla vieja `public.spots` con una fila por sede:

1. renombra la tabla vieja a `public.spots_legacy`
2. opcionalmente renombra `public.spot_likes` a `public.spot_likes_legacy`
3. ejecuta [supabase-spots-v2-schema.sql](/Users/mateo/Documents/Playground/docs/supabase-spots-v2-schema.sql)
4. ejecuta [supabase-spots-v2-migrate-from-legacy.sql](/Users/mateo/Documents/Playground/docs/supabase-spots-v2-migrate-from-legacy.sql)

## Comportamiento actual

- `mobile`:
  - usa Supabase si existen credenciales
  - si no, cae al seed local
  - escucha cambios realtime en `public.spots`
  - usa `public.spot_likes` para likes persistentes por usuario

- `admin`:
  - carga desde Supabase si existen credenciales
  - si no, cae al seed local
  - hace `upsert` de cambios en `public.spots`
  - escucha cambios realtime en `public.spots`

## Nota

La carga inicial local todavia existe en el repo, pero debe considerarse transitoria.
El siguiente paso correcto es adaptar admin y mobile para leer del schema v2 y dejar de depender de datos mock como base del sistema.
