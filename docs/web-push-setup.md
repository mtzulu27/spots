# Web Push para la PWA de Spots

Esta implementacion activa notificaciones para la PWA instalada en pantalla de inicio.

## Lo que quedo montado

- `apps/mobile/public/web-push-sw.js`: service worker que recibe y abre notificaciones.
- `apps/mobile/lib/web-push.ts`: registro, permisos, suscripcion y disparo de prueba.
- `apps/mobile/app/(tabs)/explore.tsx`: la campana activa push o envia una prueba.
- `supabase/migrations/20260331_create_web_push_subscriptions.sql`: tabla y RLS.
- `supabase/functions/send-web-push/index.ts`: edge function para enviar Web Push.

## Variables necesarias

Cliente web:

- `EXPO_PUBLIC_WEB_PUSH_PUBLIC_KEY`
- `EXPO_PUBLIC_WEB_PUSH_FUNCTION_NAME=send-web-push`

Supabase Edge Function:

- `WEB_PUSH_VAPID_PUBLIC_KEY`
- `WEB_PUSH_VAPID_PRIVATE_KEY`
- `WEB_PUSH_VAPID_SUBJECT`

## Despliegue sugerido

1. Aplicar la migracion `supabase/migrations/20260331_create_web_push_subscriptions.sql`.
2. Desplegar la edge function `send-web-push`.
3. Cargar las variables VAPID en la funcion y la llave publica en la app web.
4. Publicar la PWA bajo HTTPS.

## Como probar

1. Abrir la web de Spots en iPhone o Android.
2. Agregarla a la pantalla de inicio.
3. Abrir la app instalada desde el icono.
4. Iniciar sesion.
5. Tocar la campana una vez para suscribirse.
6. Tocar la campana otra vez para enviarte una prueba.

## Comportamiento actual

- Si no esta instalada, la campana pide agregarla a inicio.
- Si ya esta suscrita, la campana manda una notificacion de prueba.
- La primera version esta enfocada en PWA; no toca todavía push nativo de iOS o Android.
