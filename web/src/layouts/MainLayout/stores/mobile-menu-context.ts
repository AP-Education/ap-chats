import { createContext, useContext } from 'react';

export interface MobileMenuStore {
  open: () => void;
  isConversation: boolean;
}

export const MobileMenuContext = createContext<MobileMenuStore | null>(null);

// Lets pages reopen the mobile nav drawer (e.g. a channel's back button)
// without lifting MainLayout's own open/close state through props.
export function useMobileMenu(): MobileMenuStore {
  return useContext(MobileMenuContext) ?? { open: () => {}, isConversation: false };
}
