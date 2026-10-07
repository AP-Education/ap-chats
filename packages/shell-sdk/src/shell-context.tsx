import { createContext, useContext, useEffect } from 'react';

export interface MobileMenuStore {
  open: () => void;
  isOpen: boolean;
  /** Sum of every application's badge, shown on the button that opens the menu. */
  badgeCount: number;
}

export const MobileMenuContext = createContext<MobileMenuStore | null>(null);

export function useMobileMenu(): MobileMenuStore {
  return (
    useContext(MobileMenuContext) ?? {
      open: () => {},
      isOpen: false,
      badgeCount: 0,
    }
  );
}

export const MOBILE_NAVIGATION_ID = 'mobile-navigation';
/** The shell returns focus to the element carrying it when the navigation sheet closes. */
export const MOBILE_MENU_TRIGGER_ATTRIBUTE = 'data-mobile-menu-trigger';

/** Props that turn an application's button into the opener of the shell's navigation sheet. */
export function useMobileMenuTrigger() {
  const { open, isOpen } = useMobileMenu();
  return {
    [MOBILE_MENU_TRIGGER_ATTRIBUTE]: true,
    'aria-controls': MOBILE_NAVIGATION_ID,
    'aria-expanded': isOpen,
    onClick: open,
  };
}

export interface ShellActions {
  /** Opens an application at `to`, or at the place it was last left. */
  openApp: (appId: string, to?: string) => void;
  /** Navigates the one browser history the shell owns. */
  navigate: (to: string, options?: { replace?: boolean }) => void;
  setBadge: (appId: string, count: number) => void;
  registerBeforeSignOut: (hook: () => void | Promise<void>) => () => void;
}

export const ShellActionsContext = createContext<ShellActions | null>(null);
export const AppIdContext = createContext<string | null>(null);
export const AppActiveContext = createContext(false);
export const ShellLocationContext = createContext('/');

/** Whether the application is the one currently shown in the content area. */
export function useIsAppActive(): boolean {
  return useContext(AppActiveContext);
}

export function useOpenApp(): ShellActions['openApp'] {
  return useShellActions().openApp;
}

/**
 * The shell's current URL (path, search and hash). Applications with their own router
 * follow it instead of the browser history, which only the shell changes.
 */
export function useShellLocation(): string {
  return useContext(ShellLocationContext);
}

export function useShellNavigate(): ShellActions['navigate'] {
  return useShellActions().navigate;
}

function useShellActions(): ShellActions {
  const value = useContext(ShellActionsContext);
  if (!value)
    throw new Error('Shell hooks must be used inside an application mounted by the shell');
  return value;
}

/** Publishes a count that wants the user's attention to the application's rail tile and the mobile menu button. */
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
