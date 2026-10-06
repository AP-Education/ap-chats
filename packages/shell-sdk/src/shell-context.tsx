import { createContext, useContext, useEffect } from 'react';

export interface MobileMenuStore {
  open: () => void;
  isOpen: boolean;
  unreadCount: number;
}

export const MobileMenuContext = createContext<MobileMenuStore | null>(null);

export function useMobileMenu(): MobileMenuStore {
  return (
    useContext(MobileMenuContext) ?? {
      open: () => {},
      isOpen: false,
      unreadCount: 0,
    }
  );
}

export interface ShellActions {
  /** Opens an application at `to`, or at the place it was last left. */
  openApp: (appId: string, to?: string) => void;
  setBadge: (appId: string, count: number) => void;
  registerBeforeSignOut: (hook: () => void | Promise<void>) => () => void;
}

export const ShellActionsContext = createContext<ShellActions | null>(null);
export const AppIdContext = createContext<string | null>(null);
export const AppActiveContext = createContext(false);

/** Whether the application is the one currently shown in the content area. */
export function useIsAppActive(): boolean {
  return useContext(AppActiveContext);
}

export function useOpenApp(): ShellActions['openApp'] {
  return useShellActions().openApp;
}

function useShellActions(): ShellActions {
  const value = useContext(ShellActionsContext);
  if (!value)
    throw new Error('Shell hooks must be used inside an application mounted by the shell');
  return value;
}

/** Publishes the application's unread count to its rail icon and the mobile menu button. */
export function useAppBadge(count: number): void {
  const { setBadge } = useShellActions();
  const appId = useContext(AppIdContext);

  useEffect(() => {
    if (!appId) return;
    setBadge(appId, count);
    return () => setBadge(appId, 0);
  }, [appId, count, setBadge]);
}

/** Runs before the shell signs the user out, e.g. to unregister a push subscription. */
export function useBeforeSignOut(hook: () => void | Promise<void>): void {
  const { registerBeforeSignOut } = useShellActions();

  useEffect(() => registerBeforeSignOut(hook), [hook, registerBeforeSignOut]);
}
