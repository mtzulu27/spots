# Place Suggestions Review 2026-04-01

Fuente revisada: `Supabase Snippet Recent Place Suggestions (1).csv`

## Resumen

- sugerencias crudas: 94
- nombres unicos por normalizacion basica: 93
- lista limpia canonica: 90
- duplicado exacto seguro: `Huna huna`
- grupos fusionados por alias o variante: `Bengala bandolero` + `Bengala y bandolero`, `El colibri` + `Colibri`, `Gente comun` + `Gente común san antonio`
- coincidencias exactas con la base actual: `Palo Mulata`, `Sushi Green`

## Archivos generados

- [place-suggestions-cleaned-2026-04-01.csv](/Users/mateo/Documents/Playground/docs/place-suggestions-cleaned-2026-04-01.csv)
- [place-suggestions-research-2026-04-01.csv](/Users/mateo/Documents/Playground/docs/place-suggestions-research-2026-04-01.csv)

## Lectura recomendada

- Usa el archivo `cleaned` como fuente de verdad para no reimportar nombres repetidos o variantes obvias.
- Usa el archivo `research` para priorizar los lugares con mejor señal de que siguen operando y para corregir nombre comercial antes de crear spots.
- No hice importacion a Supabase porque en este entorno no hay credenciales activas y varios lugares todavia necesitan validacion editorial o datos minimos de sede.

## Notas

- `Gente Comun` probablemente necesita modelarse como marca y luego definir una sede, porque una sugerencia venia como nombre general y otra como `San Antonio`.
- `Floret de Autor` aparece en web, pero parece mas atelier/floristeria que spot clasico del catalogo; conviene revisar si entra en producto.
- Algunos lugares tienen evidencia fuerte en web pero aun faltan datos operativos utiles para importacion real, como direccion exacta, imagen, horarios o contacto.
