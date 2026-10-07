import { createContext, useContext } from 'react';

export interface BrowserPushState {
  available: boolean;
  enabled: boolean;
  busy: boolean;
  permission: NotificationPermission;
  error: string | null;
  subscriptionId: string | null;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
}
export const BrowserPushContext = createContext<BrowserPushState | null>(null);
export function useWebPush(): BrowserPushState {
  const value = useContext(BrowserPushContext);
  if (!value) throw new Error('WebPushProvider is missing');
  return value;
}
