# Spots Cali Batch 3

Fecha de preparacion: 2026-03-31

## Criterios aplicados

- Se excluyeron lugares del oriente de Cali.
- Se priorizaron zonas pedidas por el usuario: `Pance`, `Ciudad Jardin`, `Granada`, `El Penon`.
- Se aceptaron dos excepciones pedidas expresamente por el usuario en el centro: `Callao` y `La Pergola Clandestina`.
- Cuando no fue claro obtener una imagen oficial reutilizable, se asigno `cover_image_url` de stock desde Unsplash.

## Cobertura por categoria

- `Arte y cultura`: Museo La Tertulia
- `Cine`: Museo Caliwood
- `Familiar`: Zoologico de Cali
- `Naturaleza y aire libre`: Jardin Botanico de Cali, Cerro de las Tres Cruces, Cristo Rey
- `Pet friendly`: sin lugar independiente en esta tanda; `Lago Verde` queda solo como hub en campo `mall`
- `Restaurantes`: Dos Santos Cantina, Cafe Gardenia, Hoi An Cocina Vietnamita, Purist Cafe, Valle Catalina, El Cafe del Sol, Taqueria Chalacas, El Paso, El Cilindro, Uki Fresh Food, Cafe Pintado, Cascanueces, Turk House, Dolce Vicolo, La Corte de la Carne, Bomberry, El Chuzo de Nando, Mr Tenders, La Propia Burger, Vital Bistro, Klub Berry Acai, Palo Mulata, La Botella Malecon, Wetsunday, Cafe Viajero, Mushu, El Toro Enamorao, Nikkei 232, Chilitaco, Sushi Green, Cheers Pizzeria, Jugos Parque del Perro
- `Vida nocturna`: Callao, La Pergola Clandestina, BBC

## Notas de validacion

- `Callao` se dejo con `neighborhood=Centro` y `mall=Hotel Aristi` por instruccion directa del usuario.
- `La Pergola Clandestina` se dejo con `neighborhood=Centro` por instruccion directa del usuario, aunque varias fuentes la ubican en el entorno de `San Pedro / Centro`.
- `Parque del Perro` queda solo como hub en campo `mall`, con `San Fernando` como barrio operativo para las sedes.
- Se agregaron varias marcas de `Lago Verde` con `neighborhood=Pance` y `mall=Lago Verde`, tal como pediste.
- Se agregaron varias marcas gastronómicas de `Puerto 125` con `neighborhood=Pance` y `mall=Puerto 125`.
- Para marcas con varias sedes suficientemente claras, se añadieron sedes extra: `Sushi Green`, `Turk House` y `Dolce Vicolo`.
- `Cafe Gardenia` se normalizo con dos sedes activas en `Granada` y `Rio`; esto reemplaza la sede vieja de `Santa Monica`.
- `El Parque - Cocina al aire libre` queda solo como hub en campo `mall`; no se maneja como lugar independiente.
- `Nikkei 232` presenta direcciones distintas segun la fuente. Para esta tanda se cargo la sede asociada a `El Parque - Cocina al aire libre`, que es la que aparecio en fuentes de delivery.
- En varios restaurantes se dejaron vacios `instagram`, `menu_url`, `whatsapp` o coordenadas cuando no se pudieron confirmar con suficiente confianza en una fuente clara.
- En varios lugares culturales y naturales el `min_budget` es editorial o `0` cuando el plan puede ser gratuito o la tarifa varia.

## Fuentes principales consultadas

- `docs/spots-seed-cali-review.csv` para Museo La Tertulia, Museo Caliwood, Zoologico de Cali, Cristo Rey y El Toro Enamorao.
- Sitio oficial de Lago Verde para validar el hub comercial y apoyar la referencia de `mall` en sedes de Pance.
- Sitio oficial de Hoi An para sede y horarios en Marbella Plaza.
- Sitio/blog de Purist Cafe para sede Pance en Marbella Plaza.
- Sitios de terceros de alta visibilidad para horarios o direccion cuando no hubo confirmacion oficial simple: TripAdvisor, Waze, Rappi, Corner, TripTap, Nightlife International.
