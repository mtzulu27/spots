# Spots horarios: modelo y UX del admin

## Source of truth

Los horarios ya no deben definirse como un string manual en `spot_branches.hours`.

La estructura correcta es:

- `public.spot_branches`
- `public.spot_branch_hours`
- `public.spot_branch_schedule_exceptions`

`spot_branches.hours` puede seguir existiendo temporalmente como resumen editorial o fallback para mobile, pero no como fuente principal.

## Modelo de datos

### Regla general de festivos por sede

Tabla: `public.spot_branches`

Campos:

- `holiday_mode`
  - `inherit`
  - `same_as_sunday`
  - `closed`
  - `custom`
- `holiday_open_time`
- `holiday_close_time`
- `holiday_split_open_time`
- `holiday_split_close_time`

Casos que cubre:

- festivos cerrados
- festivos con el mismo horario de domingo
- festivos con horario general propio

La app decide si hoy es festivo en Colombia y, si lo es, aplica esta regla de la sede.

### Horario semanal base

Tabla: `public.spot_branch_hours`

Una fila por:

- sede
- dia de la semana

Campos:

- `branch_id`
- `day_of_week`
  - `0 = domingo`
  - `1 = lunes`
  - `2 = martes`
  - `3 = miercoles`
  - `4 = jueves`
  - `5 = viernes`
  - `6 = sabado`
- `is_closed`
- `open_time`
- `close_time`
- `split_open_time`
- `split_close_time`

Casos que cubre:

- lunes a domingo mismo horario
- horario distinto por dia
- dias cerrados
- pausa de almuerzo

### Excepciones por fecha

Tabla: `public.spot_branch_schedule_exceptions`

Una fila por:

- sede
- fecha puntual

Campos:

- `branch_id`
- `exception_date`
- `is_closed`
- `open_time`
- `close_time`
- `split_open_time`
- `split_close_time`
- `label`

Casos que cubre:

- cierres extraordinarios
- eventos privados
- cambios puntuales de horario en una fecha concreta

## UX recomendada: editor individual

### Sección: horario semanal

Mostrar 7 filas:

- Lunes
- Martes
- Miercoles
- Jueves
- Viernes
- Sabado
- Domingo

Cada fila tiene:

- toggle `Cerrado`
- `Inicio`
- `Fin`
- botón `+ pausa`

Si activas pausa:

- `Reabre`
- `Cierra`

### Sección: festivos Colombia

Mostrar un solo bloque por sede:

- selector:
  - `Sin regla especial`
  - `Como domingo`
  - `Cerrado`
  - `Horario propio`

Si `Horario propio`:

- `Abre festivo`
- `Cierra festivo`
- botón `+ pausa festiva`

### Acciones rápidas

Arriba del bloque:

- `Copiar a todos`
- `Lun-Vie`
- `Lun-Sab`
- `Todos`
- `Cerrar domingo`

### Excepciones / festivos

Bloque aparte:

- lista de excepciones
- botón `Agregar excepción`

Cada excepción:

- fecha
- cerrado / horario especial
- horas
- nota

## UX recomendada: bulk editor

No mostrar 10-14 columnas de horarios al mismo tiempo; sería muy difícil de usar.

### En la tabla bulk

Usar una sola columna resumen:

- `Horario`

Ejemplos:

- `Lun-Dom 08:00-18:00`
- `Lun-Vie 08:00-12:00 / 14:00-18:00`
- `Dom cerrado`

Y una acción por fila:

- `Editar horario`

### Modal o sheet de horario

Al hacer click en `Editar horario`, abrir el mismo editor visual del modo individual.

### Acciones masivas útiles

- aplicar horario a filas seleccionadas
- copiar horario de una sede a varias
- marcar festivos como cerrado para varias sedes

## Importación CSV

Para importación real hay dos caminos:

### Opción A

Mantener por ahora una columna `hours` como texto editorial de compatibilidad, y cargar el horario estructurado después desde el admin.

### Opción B

Agregar una columna técnica adicional:

- `schedule_json`

con un JSON compatible con `spot_branch_hours` y `spot_branch_schedule_exceptions`.

Para humanos, la opción recomendada sigue siendo:

- CSV simple para datos base
- editor visual para horarios

## Recomendación de implementación

Orden correcto:

1. aplicar [supabase-spots-v2-hours-migration.sql](/Users/mateo/Documents/Playground/docs/supabase-spots-v2-hours-migration.sql)
2. adaptar el admin individual al nuevo modelo
3. agregar resumen + modal en bulk editor
4. después adaptar mobile para leer el horario estructurado y derivar `hours`
