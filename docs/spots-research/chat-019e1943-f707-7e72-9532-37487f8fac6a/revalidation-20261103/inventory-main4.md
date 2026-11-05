# Inventario completo de encargos de catalogo: Main 4

Se reviso el historial completo del chat mediante tres paginas de read_thread, hasta hasMore=false. No hubo solicitudes explicitas de crear o subir nuevos lugares a Spots.

## Correccion solicitada

El usuario pidio: "quita Lago verde como sector, lago verde es un mall" (mensaje item-72). El cambio historico afecto la clasificacion de Don Samuel y el normalizador general. Lago Verde no es una solicitud de alta como lugar.

## Lugar con trabajo de revalidacion

Don Samuel Bakery, Instagram https://www.instagram.com/donsamuelbakery/, Menupp https://menupp.co/donsamuelhealthy. Spot3650, slug don-samuel. Una sede existente5136, don-samuel-cali, Parque Comercial Lago Verde / Pance. No se solicitaron nuevas sedes.

Estado real: INTEGRADO LOCAL + QA PARCIAL; CIERRE BLOCKED; NO PUBLICADO. completion.json tiene estructura valida y salida1/canAdvance=false. No presentar como complete ni partial_exhausted.

Integrado: taxonomia corroborada; WhatsApp oficial; carta26 productos/41 presentaciones; precios fuera del calculo presencial; presupuesto explicito pendiente; retiro del pin del mall como coordenada exacta; retiro de horarios fuente inactivos; tres fotos distintas, logo existente conservado; copy sin invitacion presencial no confirmada. Registros existentes conservados, sin borrar sedes.

Verificado: persistencia mediante local-verification.json y adaptador real mapRowsToSpots; presupuesto retorna null sin escenarios. App desktop1280x720: buscar Don Samuel da0 resultados, sin card/pin; /spot/don-samuel-cali muestra No encontramos este lugar. QA movil y cierre de fuentes no terminados.

Faltantes: inventario fisico actual; precisar duracion del cierre (post oficial13/oct/2026 dice donde quedaba el punto y ofrece domicilios; no afirmar cierre permanente de la marca); coordenadas exactas/enlace propio; horarios/festivos/condiciones de visita actuales; presupuesto presencial; cobertura restante de historias/publicaciones y QA movil/final.

La sede conserva is_active=false y business_status=unknown: se documento la evidencia afirmativa del antiguo punto, sin inventar duracion temporal/permanente ni reabrir por silencio. Revisar esta decision en la centralizacion antes del cierre final.

Rutas de evidencia, JSON de integracion y matriz: subcarpeta don-samuel/ junto a este archivo. Ver inventory-main4.json para rutas absolutas y detalle.

## Listas que NO fueron encargos de ingestion

El usuario pidio listar lugares inactivos/no visibles. La respuesta original distinguio19 inactivos,96 sin sedes activas y15 parcialmente ocultos. No pidio subir ni revisar todas esas marcas. Sus nombres/IDs estan enumerados en diagnosticNonAssignments de inventory-main4.json para no perder el contexto ni convertirlo en trabajo autorizado.

No hay encargos descartados ni otra cola de lugares pendiente en este chat. Los candidatos de Places descartados fueron homonimos/mall/otras marcas, no tareas de ingestion. Los probes UI y la geolocalizacion temporal ajena a Spots no agregan lugares al catalogo.

## Centralizacion y limpieza

Se verifico la instruccion del usuario en Main: trabajar en un unico chat y reunir las listas de los chats activos. Se detuvo nueva adquisicion/escritura aqui. Preview8095/session96962 apagado; puerto sin listener. Pestanas propias IAB2y3 cerradas; DevTools2 ya estaba cerrada. Bundle temporal de foto y logo temporal limpiados; assets estables conservados; navegador compartido y procesos ajenos intactos. No Hostinger.

