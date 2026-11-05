self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', () => {
  // clients.claim() removed: not needed for a push-only SW and can
  // cause page reloads in iOS Safari PWA on second open.
});

self.addEventListener('push', (event) => {
  const payload = (() => {
    try {
      return event.data ? event.data.json() : {};
    } catch (_error) {
      return {};
    }
  })();

  const title = payload.title || 'Spots';
  const body = payload.body || 'Tienes una nueva notificacion.';
  const url = payload.url || '/';
  const tag = payload.tag || 'spots-web-push';

  event.waitUntil(
    self.registration.showNotification(title, {
      badge: '/apple-touch-icon-v2.png',
      body,
      data: {
        url,
      },
      icon: '/apple-touch-icon-v2.png',
      renotify: true,
      tag,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  let targetUrl = self.location.origin + '/';
  try {
    const requested = new URL(event.notification.data?.url || '/', self.location.origin);
    if (requested.origin === self.location.origin) targetUrl = requested.href;
  } catch (_) { /* Invalid destinations open Spots, never an external site. */ }

  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    }),
  );
});
