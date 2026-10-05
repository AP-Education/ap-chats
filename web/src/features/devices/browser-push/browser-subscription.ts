export function applicationServerKey(key: string): Uint8Array<ArrayBuffer> {
  const decoded = atob(key.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

export function supportsWebPush(): boolean {
  return (
    window.isSecureContext &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function pushRegistration(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register('/push-sw.js', { scope: '/' });
  return navigator.serviceWorker.ready;
}
