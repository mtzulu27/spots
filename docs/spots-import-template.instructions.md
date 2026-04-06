# Spots Import Template

Archivo template:

- [spots-import-template.csv](/Users/mateo/Documents/Playground/docs/spots-import-template.csv)

## Source of truth usada

La estructura se saco de estas capas reales del proyecto:

- esquema SQL de Supabase en [supabase-spots-schema.sql](/Users/mateo/Documents/Playground/docs/supabase-spots-schema.sql)
- mapeo de escritura del admin en [supabase.ts](/Users/mateo/Documents/Playground/apps/admin/src/supabase.ts)
- tipo consumido por mobile en [spots-store.tsx](/Users/mateo/Documents/Playground/apps/mobile/lib/spots-store.tsx)
- tipo base de spots en [mock-spots.ts](/Users/mateo/Documents/Playground/apps/mobile/lib/mock-spots.ts)

## Estructura elegida para importacion

El template usa nombres de columna `snake_case` compatibles con `public.spots`, porque esa es la forma mas segura para importacion real a base de datos.

## Columnas incluidas

| columna | requerida | tipo | formato esperado |
| --- | --- | --- | --- |
| `id` | si | text | slug unico. Ej: `lucuma-casa-san-fernando` |
| `type` | si | enum | para este template usar siempre `place` |
| `name` | si | text | nombre visible del lugar. Para `place` debe coincidir con `brand_name` |
| `brand_name` | si | text | nombre principal del lugar o marca. Para `place` debe coincidir con `name` |
| `branch_name` | si | text | nombre editorial de sede, normalmente igual al barrio o sector, ej. `Granada` o `Ciudad Jardin` |
| `neighborhood` | si | text | barrio o sector base. En la mayoria de casos debe coincidir con `branch_name` |
| `zone` | no | text | hub, mall o zona interna. En mobile aparece como `hubName` |
| `category` | si | text | categoria primaria actual de la app |
| `city` | si | text | hoy normalmente `Cali` |
| `image_url` | si | text | URL publica de la imagen principal |
| `gallery_urls` | no, pero recomendado | lista | URLs de galeria separadas por comas dentro de una sola celda. Idealmente por marca |
| `short_description` | si | text | resumen corto para cards |
| `description` | si | text | descripcion larga |
| `interests` | no, pero recomendado | lista | lista separada por comas dentro de una sola celda |
| `max_people` | si | integer | capacidad editorial sugerida para el plan |
| `days` | no, pero recomendado | lista | dias separados por coma, ej. `Lun,Mar,Mie` |
| `min_budget` | si | integer | COP sin puntos ni comas. Se usa como presupuesto minimo |
| `hours` | no | text | string editorial de horario tal como la app ya consume |
| `address` | no, pero recomendado | text | direccion completa |
| `instagram` | no | text | URL completa o vacio |
| `whatsapp` | no | text | URL completa `https://wa.me/...` o vacio |
| `phone` | no | text | telefono para llamada, fijo o celular |
| `menu_url` | no | text | URL completa o vacio |
| `tags` | no | lista | lista separada por comas dentro de una sola celda |
| `moods` | no | lista | lista separada por comas dentro de una sola celda |
| `latitude` | no | decimal | coordenada decimal |
| `longitude` | no | decimal | coordenada decimal |
| `is_active` | si | boolean | `true` o `false` |
| `is_featured` | si | boolean | `true` o `false` |
| `sort_order` | si | integer | orden editorial de aparicion |

## Columnas excluidas a proposito

Estas existen en `public.spots`, pero no conviene pedirlas como llenado manual base:

| columna | motivo |
| --- | --- |
| `likes` | hoy se mezcla con la tabla [spot_likes](/Users/mateo/Documents/Playground/docs/supabase-spots-schema.sql); para una carga inicial se puede dejar en default `0` |
| `distance_km` | es un valor operacional y hoy suele arrancar en `0`; no deberia ser una decision editorial fija |
| `created_at` | lo genera la base |
| `updated_at` | lo genera la base |

## Formato de listas en CSV

Para `interests`, `days`, `tags` y `moods`, la celda debe contener texto separado por comas.

Ejemplos:

- `"Restaurantes,Cafe,Brunch"`
- `"Lun,Mar,Mie,Jue,Vie"`
- `"brunch,cafe,desayuno"`

## Inconsistencias detectadas

1. La base documentada en [supabase-spots-schema.sql](/Users/mateo/Documents/Playground/docs/supabase-spots-schema.sql) restringe `type` a `place` y `home`, pero el admin y mobile tambien manejan `event`.
2. `interests` existe en la base y en mobile, pero el mapeo de escritura del admin en [supabase.ts](/Users/mateo/Documents/Playground/apps/admin/src/supabase.ts) no lo envia al hacer `upsert`.
3. `likes` existe en `public.spots`, pero tambien hay persistencia real por usuario en `public.spot_likes`; eso duplica la fuente de verdad.
4. `distance_km` vive en la tabla y en admin, pero semanticamente depende de ubicacion del usuario y no de una carga editorial fija.

## Recomendacion de importacion real

Si el archivo se va a usar para importar directo a `public.spots`, el importador deberia:

- respetar exactamente estas columnas
- convertir `gallery_urls`, `interests`, `days`, `tags` y `moods` de CSV a `text[]`
- completar `likes` con `0` cuando no venga
- completar `distance_km` con `0` cuando no venga
- dejar que la base genere `created_at` y `updated_at`

## Valores utiles del sistema actual

Categorias visibles hoy en admin:

- `Arte y cultura`
- `Vida nocturna`
- `Cine`
- `Restaurantes`
- `Eventos`
- `Deporte y bienestar`
- `Familiar`
- `Pet friendly`
- `Naturaleza y aire libre`
- `Planes en casa`

Dias que la app ya entiende en filtros y parsing de horarios:

- `Lun`
- `Mar`
- `Mie`
- `Jue`
- `Vie`
- `Sab`
- `Dom`
