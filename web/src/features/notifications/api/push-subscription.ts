import { registerSubscription, removeSubscription } from './push-api';
import { dismissNotifications } from './shown-notifications';

export interface PushRegistration {
  permission: NotificationPermission;
  subscriptionId: string | null;
}

const TURNED_OFF_KEY = 'ap:push-turned-off';

export function supportsPush(): boolean {
  return (
    window.isSecureContext &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** Brings this browser's subscription and its server registration in line, recreating a lost one. */
export function synchronizePush(token: string, publicKey: string): Promise<PushRegistration> {
  return oneAtATime(async () => {
    const permission = Notification.permission;
    if (permission !== 'granted' || isTurnedOff()) return { permission, subscriptionId: null };

    const registration = await workerRegistration();
    const subscription = await subscriptionFor(registration, publicKey);
    const { id } = await registerSubscription(token, subscription);

    return { permission, subscriptionId: id };
  });
}

export async function enablePush(token: string, publicKey: string): Promise<PushRegistration> {
  // Asked straight from the click, before queued work, or the browser drops the prompt.
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { permission, subscriptionId: null };

  setTurnedOff(false);
  return synchronizePush(token, publicKey);
}

export function disablePush(
  token: string,
  subscriptionId: string | null,
): Promise<PushRegistration> {
  return oneAtATime(async () => {
    const registration = await workerRegistration();
    await dismissNotifications();

    const subscription = await registration.pushManager.getSubscription();
    if (subscription && !(await subscription.unsubscribe())) throw new Error('Unsubscribe failed');

    setTurnedOff(true);
    if (subscriptionId) await removeSubscription(token, subscriptionId);

    return { permission: Notification.permission, subscriptionId: null };
  });
}

/** Signing out forgets the owner on the server; the browser keeps its subscription for the next sign-in. */
export function releasePush(token: string, subscriptionId: string): Promise<void> {
  return oneAtATime(async () => {
    await dismissNotifications();
    await removeSubscription(token, subscriptionId);
  });
}

async function workerRegistration(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register('/push-sw.js', { scope: '/' });
  return navigator.serviceWorker.ready;
}

async function subscriptionFor(
  registration: ServiceWorkerRegistration,
  publicKey: string,
): Promise<PushSubscription> {
  const serverKey = decodeServerKey(publicKey);
  const existing = await registration.pushManager.getSubscription();
  if (existing && usesServerKey(existing, serverKey)) return existing;

  // A rotated VAPID key makes the old subscription undeliverable, so it is replaced.
  await existing?.unsubscribe();
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: serverKey,
  });
}

function usesServerKey(subscription: PushSubscription, serverKey: Uint8Array): boolean {
  const current = subscription.options.applicationServerKey;
  if (!current) return true;

  const bytes = new Uint8Array(current);
  return (
    bytes.length === serverKey.length && bytes.every((byte, index) => byte === serverKey[index])
  );
}

function decodeServerKey(key: string): Uint8Array<ArrayBuffer> {
  const decoded = atob(key.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

// Turning push off is the user's choice; synchronizing must not quietly undo it.
function isTurnedOff(): boolean {
  return localStorage.getItem(TURNED_OFF_KEY) === '1';
}

function setTurnedOff(off: boolean): void {
  if (off) localStorage.setItem(TURNED_OFF_KEY, '1');
  else localStorage.removeItem(TURNED_OFF_KEY);
}

let pending: Promise<unknown> = Promise.resolve();

// Synchronizing, enabling, disabling and releasing all touch one subscription.
function oneAtATime<T>(operation: () => Promise<T>): Promise<T> {
  const result = pending.then(operation);
  pending = result.catch(() => undefined);
  return result;
}
