# Notificaciones por cambios del catálogo

Implementación: `apps/mobile/lib/catalog-updates/engine.mjs`, `place-updates-store.tsx`, `components/place-notifications.tsx`.

## Qué funciona dentro de la app

- Se compara el contenido público por ID de lugar/sede. Hay eventos de lugar publicado, nueva sede y ficha actualizada (horarios estructurados, menú, presupuesto, fotos, ubicación, contacto e información).
- El estado inicial se conserva en `public/place-updates-baseline.json`. No genera avisos retroactivos de todo el catálogo. La auditoría en `docs/catalog-audit-2026-09-04.json` sigue siendo interna: no se interpreta como reseñas, aperturas, cierres ni verificaciones públicas.
- Cambios a `is_active: false` se excluyen; no implican cierre del negocio. Los eventos no enlazan fichas/sedes que ya no estén visibles.
- Mientras la web está abierta, se consulta cada 60 segundos, al recuperar el foco y al abrir la campana. El ciclo, listeners y fetch se cancelan al desmontar.
- Historial de hasta 300 eventos en el dispositivo; lecturas separadas por cuenta (o invitado), persistidas localmente. No hay sincronización de lecturas entre dispositivos.
- Las preferencias de tipos de notificación filtran tanto historial como contador.
- El primer acceso sin historial parte de la referencia pública. Cambios locales posteriores se detectan sin pedirle nada al hilo del catálogo.
- Si el hilo solo modifica fichas en borrador, no habrá avisos públicos hasta que se publiquen.

## Publicación del historial

`pnpm --dir apps/mobile build:updates` compara el catálogo actual, acumula eventos reales en `public/place-updates.json` y avanza la referencia. Es idempotente para el mismo cambio. Ya se ejecuta antes de `export:web` y, por tanto, de `deploy:web`. Conservar ambos JSON en el repositorio y publicarlos juntos con el catálogo; no reinicializar la referencia en cada build. No se inició ningún watcher extra.

La hora representa detección/publicación del cambio, no la fecha de una apertura física. Una corrección idéntica entre el mismo estado anterior/posterior usa el mismo ID; es una noticia de contenido, no un registro de auditoría exhaustivo. Una actualización observada en varios pasos en desarrollo puede tener más eventos que un único lote publicado.

## Push con la app cerrada: infraestructura preparada, sin activar

Archivos: `supabase/migrations/20260904_place_update_push.sql` y `supabase/functions/dispatch-place-updates/index.ts`. No se aplicó esta migración ni se desplegó/programó la función desde esta tarea, y no se enviaron notificaciones a usuarios.

Para activar en el entorno Supabase correspondiente:

1. Aplicar la migración después de la existente de `web_push_subscriptions`.
2. Configurar `SPOTS_PUBLIC_ORIGIN` (origen HTTPS de la web publicada), `CATALOG_PUSH_DISPATCH_SECRET` (secreto aleatorio solo de servidor), y las variables VAPID usadas por la función existente `send-web-push`. SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY se obtienen del entorno de funciones.
3. Desplegar `dispatch-place-updates` con verificación JWT de gateway desactivada **solo para esta función**: autentica cada llamada con su secreto propio. Nunca poner ese secreto en EXPO_PUBLIC ni en la web.
4. Programar una llamada POST cada minuto desde el scheduler de servidor, con `Authorization: Bearer <CATALOG_PUSH_DISPATCH_SECRET>`. Guardar el secreto en el almacén del scheduler. No exponer la URL/token en código cliente.
5. Publicar la web con los JSON generados. Usuarios autenticados sincronizan sus preferencias al abrirla; además deben haber otorgado permiso y tener una suscripción web-push existente. La primera sincronización no reenvía historial anterior.
6. Verificar con una cuenta/suscripción de prueba: un cambio público posterior a la suscripción y preferencias debe producir una sola entrega por ID/suscripción; una segunda ejecución no debe repetirla.

La función solo lee el feed desde el origen configurado: no acepta destinatarios ni contenidos proporcionados por el cliente. Cola con clave única evento/suscripción, RLS sin acceso cliente, claims de 25 trabajos con bloqueo, reintentos limitados, eliminación de endpoints 404/410, comprobación de preferencias antes del envío y caducidad de 24 horas. Las noticias se enlazan a la sede. Se usa un tag estable para reemplazar un aviso repetido si el proceso cae después del envío y antes de confirmar en BD; la entrega del transporte es al menos una vez, no exactamente una vez.

La sincronización de preferencias registra un aviso técnico si la migración no existe. No bloquea las notificaciones dentro de la app. El circuito de reseñas no genera eventos: no hay una fuente real de reseñas conectada.

## Validación

- `node --test apps/mobile/scripts/test-place-updates.mjs`: cambios reales, primera carga, duplicados, timestamps, editoriales, borradores, sedes, horarios y exclusión de parches.
- `pnpm --dir apps/mobile typecheck`.
- Panel de campana comprobado en localhost: estado vacío y, al habilitar actualizaciones, historial con cambios reales y contador de pendientes; sin insertar fixtures en el catálogo.
- `deno check --node-modules-dir=none supabase/functions/dispatch-place-updates/index.ts` pasó.
- La integración remota de cola/RLS/VAPID requiere aplicar y probar en el entorno de destino.

## Agrupación de actualizaciones
Cambios del mismo lugar, incluso de distintas sedes, se condensan en ventanas de 24 horas desde el primer aviso. Se conserva su ID para no reactivar la notificación leída; se unen campos y se actualiza el contenido. Pasadas 24 horas se crea otro aviso. La agrupación también se aplica al historial existente y al feed publicado para push.
