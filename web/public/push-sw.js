self.addEventListener('push', (event) => {
  let data;
  try {
    data = event.data?.json();
  } catch {
    data = null;
  }
  event.waitUntil(
    self.registration.showNotification(
      typeof data?.title === 'string' ? data.title : 'AP Connect',
      {
        body: typeof data?.body === 'string' ? data.body : 'Нове повідомлення',
        icon: '/push-icon.png',
        tag: typeof data?.collapseKey === 'string' ? data.collapseKey : 'ap-connect',
        renotify: true,
        data: { userId: data?.userId, target: data?.target },
      },
    ),
  );
});

// No fetch handler, so taking over open pages at once is safe and lets a click reach them.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      // The page decides where the target leads and whether it belongs to the signed-in account.
      const tap = {
        userId: event.notification.data?.userId,
        target: event.notification.data?.target,
      };

      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const client = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (!client) {
        await self.clients.openWindow(`/?notification=${encodeURIComponent(JSON.stringify(tap))}`);
        return;
      }

      // Focus first, while the click still counts as a user gesture; the page routes in-app.
      await client.focus();
      client.postMessage({ type: 'notifications/open', ...tap });
    })(),
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      const applicationServerKey = event.oldSubscription?.options?.applicationServerKey;
      if (applicationServerKey) {
        await self.registration.pushManager
          .subscribe({ userVisibleOnly: true, applicationServerKey })
          .catch(() => undefined);
      }

      // Registering needs the user's token, which only an open page has.
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) client.postMessage({ type: 'push/subscription-changed' });
    })(),
  );
});
