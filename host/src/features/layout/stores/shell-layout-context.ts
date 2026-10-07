import type { useSwipeDrawer } from '@ap/ui';
import { createContext, type RefObject, useContext } from 'react';

/** DOM slots of the layout; applications portal their parts into them. */
export interface ShellHosts {
  banner: HTMLElement | null;
  rail: HTMLElement | null;
  panel: HTMLElement | null;
  content: HTMLElement | null;
}

export interface ShellHostsContextValue {
  hosts: ShellHosts;
  setHost: Record<keyof ShellHosts, (element: HTMLElement | null) => void>;
}

export interface ShellFrameContextValue {
  isMobile: boolean;
  isMenuOpen: boolean;
  closeMenu: () => void;
  sheet: ReturnType<typeof useSwipeDrawer>;
  bodyRef: RefObject<HTMLDivElement | null>;
  drawerRef: RefObject<HTMLElement | null>;
}

export const ShellHostsContext = createContext<ShellHostsContextValue | null>(null);
export const ShellFrameContext = createContext<ShellFrameContextValue | null>(null);

function required<T>(value: T | null): T {
  if (!value) throw new Error('ShellLayout parts must be rendered inside <ShellLayout>');
  return value;
}

/** Callback ref that registers the element as one of the layout's slots. */
export function useShellHostRef(name: keyof ShellHosts): (element: HTMLElement | null) => void {
  return required(useContext(ShellHostsContext)).setHost[name];
}

export function useShellFrame(): ShellFrameContextValue {
  return required(useContext(ShellFrameContext));
}

/** The slots applications portal into. Use below `<ShellLayout>`, outside the DOM parts. */
export function useShellHosts(): ShellHosts {
  return required(useContext(ShellHostsContext)).hosts;
}
