// Loaded into the generated service worker (vite.config.js → workbox.importScripts).
// Shows "bus is close" alerts sent by the Worker while the app is closed.
self.addEventListener('push', (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    return;
  }
  if (!message.title) return;
  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body || '',
      tag: message.tag || 'laxcommute-bus-alert',
      icon: '/icons/commute-v5-192.png',
      badge: '/icons/commute-v5-192.png',
      vibrate: [120, 60, 120],
      data: { url: message.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      return open ? open.focus() : self.clients.openWindow(target);
    }),
  );
});
