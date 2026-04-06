# Spots Cali batch 2

Fecha de preparacion: 2026-03-29

## Ya existentes en la base actual

Verifique la base remota de Supabase y estos lugares ya existen:

1. `Casa Bananá`
   - sedes:
     - `casa-banana-granada`
     - `casa-banana-puerto-125`
2. `La Corteza`
   - sede:
     - `la-corteza`

No los incluí en el batch para no duplicarlos.

## Lugares confirmados en este batch

1. `Izumi`
   - fuente principal: Tripadvisor
   - datos confirmados: dirección, teléfono, horario general, tipo de cocina
2. `Loco Por Ti`
   - fuente principal: Tripadvisor
   - datos confirmados: dirección, tipo general de lugar
   - faltan por confirmar: teléfono, horario, Instagram oficial
3. `Mantra Coffee Club`
   - fuente principal: Rappi
   - datos confirmados: dirección, horario general, rango mínimo observado
4. `Luci Bakery`
   - fuente principal: web oficial
   - datos confirmados: dirección, horario, web, WhatsApp, Instagram
5. `Casa Cantera`
   - fuente principal: Restaurant Guru
   - datos confirmados: dirección, horario, teléfono, Instagram, rango mínimo observado
6. `Cafe Gardenia`
   - fuentes: Waze, TripTap, TodosNegocios
   - datos confirmados: dirección, horario, teléfono, Instagram, rango mínimo observado
7. `Lakasia`
   - fuentes: Restaurant Guru, Cybo, Sluurpy
   - datos confirmados: dirección, teléfono, Instagram, web/menu, horario general

## Pendientes por validar contigo antes de cargar

Estos nombres siguen ambiguos o no tienen suficiente respaldo claro para cargarlos sin riesgo:

1. `Simón’s`
2. `Maranello parque del perro`
3. `Chelita go mex`
4. `Bruch duquesa`
5. `Miércoles de 2x1 en zorro azul`
6. `La buena vida Marbella`
7. `Refugio jardín Zen en villa de Leyva`
8. `Clase de cerámica averiguar en el te`
9. `Mantra rooftop`
10. `Dolka`
11. `Odiseo`
12. `Storia damore`
13. `Gente común san Antonio`
14. `Amasijo bruch sábado y domingo mimosas 2x1`
15. `Joe’s`
16. `Bengala y bandolero`
17. `Nuevo León`
18. `La chocolatadd 24 cj`
19. `Café quindio granada`
20. `Pizza della Madonna`
21. `Pradera de minca`
22. `Casa latte`
23. `Fit bar`
24. `Floret`
25. `Carpanetto`
26. `Guadalupe café dapa`
27. `Terraza san Camilo`

## Nota de estructura

Preparé el batch usando solo columnas reales del schema actual:

- `spots`
- `spot_branches`

Dejé vacíos estos campos cuando no encontré respaldo suficiente:

- `cover_image_url`
- `gallery_urls`
- `latitude`
- `longitude`
- links o precios no confirmados

Eso evita inventar información y deja el batch listo para completar sin inconsistencias.
