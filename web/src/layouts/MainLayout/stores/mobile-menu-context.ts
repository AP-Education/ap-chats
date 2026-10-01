import { createContext, useContext } from 'react';

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
