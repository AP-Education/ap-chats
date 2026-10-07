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
      if (client) {
        await client.navigate(url);
        await client.focus();
      } else await self.clients.openWindow(url);
    })(),
  );
});
