# Spots Seed Cali v2

Fecha de preparacion: 2026-03-26

Archivo principal de revision:

- `docs/spots-seed-cali-review.csv`

## Alcance de esta tanda

- 20 lugares de Cali
- categorias diversas
- incluye un caso de marca con multiples sedes: `Local Burger`
- campos pensados para poblar despues app/admin
- segunda pasada enfocada en fortalecer:
  - links oficiales
  - barrio / sede
  - horarios
  - contacto
  - menu cuando aplica

## Criterio de fuentes

- prioridad a fuentes oficiales cuando aparecieron
- apoyo con portales de turismo/locales como `vivecali.com`
- algunos registros siguen con validacion parcial y requieren confirmacion manual antes de sembrar definitivo

## Registros que quedaron mejor sustentados en esta pasada

- `Museo La Tertulia`
- `Museo Caliwood`
- `Zoologico de Cali`
- `Dulcinea Cafe Vintage`
- `Cafe Valparaiso`
- `Tarantella Coffee & Drinks`
- `El Toro Enamorao`
- `SAGAN Cali`
- `Local Burger` (2 sedes)

## Campos que siguen pendientes en varios registros

- `latitude`
- `longitude`
- `menu_url`
- `instagram`
- `price_min_cop`
- `price_max_cop`

## Nota sobre coordenadas

- la semilla ya esta pensada para soportar filtro de distancia real
- pero la `geocodificacion` final conviene hacerla en un paso separado y programatico
- asi evitamos cargar coordenadas manuales dudosas
- en esta version las direcciones ya estan mas listas para ese paso

## Recomendacion de siguiente paso

1. Revisar este CSV
2. Aprobar, corregir o eliminar lugares
3. Hacer una pasada de `geocodificacion + normalizacion`
4. Cerrar precios / menus / Instagram faltantes
5. Convertirlo al formato seed de la app/admin
