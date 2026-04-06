# Spots CSV Fill Instructions

## Source of truth usada

Estos templates salen de la estructura real actual del sistema:

- esquema SQL canónico en [supabase-spots-v2-schema.sql](/Users/mateo/Documents/Playground/docs/supabase-spots-v2-schema.sql)
- mapeo real del admin en [supabase.ts](/Users/mateo/Documents/Playground/apps/admin/src/supabase.ts)
- tipo que consume mobile en [spots-store.tsx](/Users/mateo/Documents/Playground/apps/mobile/lib/spots-store.tsx)

La base actual separa:

- `public.spots` = lugar/marca principal
- `public.spot_branches` = sede

Por eso el llenado correcto usa **dos CSVs**:

- [spots-places-template.csv](/Users/mateo/Documents/Playground/docs/spots-places-template.csv)
- [spots-branches-template.csv](/Users/mateo/Documents/Playground/docs/spots-branches-template.csv)

## Qué campos llenar en cada CSV

### 1. `spots-places-template.csv`

Una fila por **lugar o marca**, no por sede.

Columnas:

| columna | requerida | notas |
| --- | --- | --- |
| `type` | si | por ahora usar `place` |
| `slug` | si | slug único del lugar o marca |
| `name` | si | nombre principal visible del lugar |
| `short_description` | si | descripción corta editorial |
| `cover_image_url` | si | imagen cover principal |
| `gallery_urls` | no, pero recomendado | URLs separadas por coma |
| `category` | si | categoría visible en la app |
| `city` | si | normalmente `Cali` |
| `tags` | no | texto separado por comas |
| `moods` | no | texto separado por comas |
| `is_active` | si | `true` o `false` |
| `is_featured` | si | `true` o `false` |

### 2. `spots-branches-template.csv`

Una fila por **sede**.

Columnas:

| columna | requerida | notas |
| --- | --- | --- |
| `spot_slug` | si | debe coincidir con el `slug` del CSV de lugares |
| `slug` | si | slug único de la sede |
| `neighborhood` | si | barrio o sector de la sede |
| `mall` | no | mall o hub si aplica |
| `hours` | no | resumen editorial de horario |
| `address` | si | dirección de la sede |
| `min_budget` | si | presupuesto mínimo en COP sin puntos |
| `max_people` | si | aforo editorial / tamaño de parche |
| `menu_url` | no | URL del menú si existe |
| `whatsapp` | no | URL `https://wa.me/...` |
| `phone` | no | teléfono clickeable para llamada, fijo o celular |
| `instagram` | no | URL completa del Instagram |
| `latitude` | no | opcional si ya la tienes |
| `longitude` | no | opcional si ya la tienes |
| `is_active` | si | `true` o `false` |
| `sort_order` | si | orden editorial, por ejemplo `10, 20, 30` |

## Campos de la DB que NO conviene llenar manualmente

Aunque existan en la base, no conviene pedirlos a ChatGPT para esta investigación:

- `id` en `spots` y `spot_branches`
  La base los genera.
- `likes`
  Es operacional, no editorial.
- `created_at`, `updated_at`
  Los genera la base.
- tablas `spot_branch_hours` y `spot_branch_schedule_exceptions`
  Son más estructuradas y se llenan mejor desde el admin visual, no desde un CSV de investigación.

## Reglas editoriales para llenar sedes

- Si una marca tiene varias sedes:
  - en `spots-places-template.csv` va **una sola fila**
  - en `spots-branches-template.csv` va **una fila por sede**
- `name` es el nombre principal de la marca/lugar.
- `neighborhood` es el barrio real de la sede.
- `mall` solo se llena si está dentro de un centro comercial, plaza o hub.
- `slug` de sede:
  - primero nombre del lugar
  - luego mall si tiene
  - si no tiene mall, usar barrio

Ejemplos:

- `brunchs-house-bio-mall`
- `brunchs-house-granada`

## Prompt para ChatGPT

```md
Quiero que investigues una lista de lugares de Cali y me devuelvas la información lista para copiar en dos CSVs del sistema Spots.

Importante:
- La fuente de verdad del sistema separa:
  - `spots` = lugar/marca principal
  - `spot_branches` = sedes
- No inventes datos.
- Si un dato no se puede confirmar, déjalo vacío.
- Prioriza fuentes oficiales:
  - sitio oficial
  - Instagram oficial
  - Google Maps
  - menú oficial
  - WhatsApp oficial

Tu salida debe venir en dos bloques:

1. `PLACES CSV`
2. `BRANCHES CSV`

Debes usar exactamente estas columnas.

## PLACES CSV
Columnas exactas:
`type,slug,name,short_description,cover_image_url,gallery_urls,category,city,tags,moods,is_active,is_featured`

Reglas:
- usar `type=place`
- una fila por marca o lugar principal
- `slug` debe ser único y legible
- `name` = nombre principal del lugar
- `short_description` = una sola frase editorial corta
- `gallery_urls` = URLs separadas por coma
- `city` = `Cali` salvo evidencia clara de otra ciudad
- `tags` y `moods` = listas separadas por comas, sin duplicados
- `is_active=true` salvo evidencia de cierre
- `is_featured=false` por defecto

## BRANCHES CSV
Columnas exactas:
`spot_slug,slug,neighborhood,mall,hours,address,min_budget,max_people,menu_url,whatsapp,phone,instagram,latitude,longitude,is_active,sort_order`

Reglas:
- una fila por sede
- `spot_slug` debe coincidir con el `slug` del bloque PLACES CSV
- `slug` de sede:
  - nombre del lugar + mall si tiene
  - si no tiene mall, nombre del lugar + barrio
- `neighborhood` = barrio o sector real de la sede
- `mall` solo si aplica
- `hours` = resumen editorial del horario si está claro
- `address` = dirección completa
- `min_budget` = presupuesto mínimo en COP, número entero sin puntos ni comas
- `max_people` = número editorial razonable
- `menu_url`, `whatsapp`, `instagram` = URLs completas si existen
- `phone` = número visible para llamar; puede ser fijo o celular
- `latitude` y `longitude` solo si puedes verificarlas con confianza
- `is_active=true` salvo evidencia de cierre
- `sort_order` = 10, 20, 30...

## Regla clave sobre múltiples sedes
- Si un lugar tiene varias sedes:
  - solo una fila en PLACES CSV
  - varias filas en BRANCHES CSV
- No mezcles varias sedes en una sola fila.

## Formato de respuesta
Devuélveme:

1. Un bloque llamado `PLACES CSV`
2. Un bloque llamado `BRANCHES CSV`
3. Una sección final llamada `Notas de validación`

En `Notas de validación` incluye:
- sedes detectadas por marca
- campos faltantes
- inconsistencias entre fuentes
- supuestos que tomaste
```
