import { createContext, useContext } from 'react';

export interface MobileMenuStore {
  open: () => void;
  isConversation: boolean;
  isOpen: boolean;
  unreadCount: number;
}

export const MobileMenuContext = createContext<MobileMenuStore | null>(null);

export function useMobileMenu(): MobileMenuStore {
  return (
    useContext(MobileMenuContext) ?? {
      open: () => {},
      isConversation: false,
      isOpen: false,
      unreadCount: 0,
    }
  );
}
