// crypto.randomUUID is only exposed in a secure context (https, or http://localhost) —
// the native mobile shell loads this app over a plain http://<LAN IP> URL so a physical
// device can reach it, which WebKit does not consider secure, leaving the real API
// undefined there. None of this app's uses are security-sensitive (idempotency keys,
// client-side identity fallbacks), so a non-cryptographic fallback is fine.
export function randomId(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}
