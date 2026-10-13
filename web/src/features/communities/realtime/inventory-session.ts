/** A signed-in person on one socket connection. */
export interface InventorySession {
  identity: string;
  socketId: string;
}

/** The channel inventory refreshes once per session: a reconnect or another sign-in earns a new one. */
export function isNewSession(last: InventorySession | null, next: InventorySession): boolean {
  return last?.identity !== next.identity || last.socketId !== next.socketId;
}
