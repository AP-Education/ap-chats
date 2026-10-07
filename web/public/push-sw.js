self.addEventListener('push', (event) => {
  let data;
  try {
    data = event.data?.json();
  } catch {
    data = null;
  }
  const url = safeUrl(data?.url);
  event.waitUntil(
    self.registration.showNotification(
      typeof data?.title === 'string' ? data.title : 'AP Connect',
      {
        body: typeof data?.body === 'string' ? data.body : 'Нове повідомлення',
        icon: '/push-icon.png',
        badge: '/push-icon.png',
        tag: typeof data?.channelId === 'string' ? data.channelId : 'ap-connect',
        renotify: true,
        data: { url, userId: data?.userId },
      },
    ),
  );
});

function safeUrl(value) {
  try {
    const url = new URL(value, self.location.origin);
    if (
      url.origin === self.location.origin &&
      /^\/(channels|direct)\/[0-9a-f-]{36}$/i.test(url.pathname)
    )
      return url.href;
  } catch {
    /* use the app home */
  }
  return self.location.origin + '/';
}

// No fetch handler, so taking over open pages at once is safe and lets a click reach them.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const destination = new URL(safeUrl(event.notification.data?.url));
      if (typeof event.notification.data?.userId === 'string')
        destination.searchParams.set('pushUser', event.notification.data.userId);
      const url = destination.href;

      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const client = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (!client) {
        await self.clients.openWindow(url);
        return;
      }

      // Focus first, while the click still counts as a user gesture; the page routes in-app.
      await client.focus();
      client.postMessage({ type: 'notifications/open', url });
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
