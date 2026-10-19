import { createContext, useContext } from 'react';

import type { UnsentMessages } from '../types';

export const UnsentMessagesContext = createContext<UnsentMessages | null>(null);

export function useUnsentMessages(): UnsentMessages {
  const value = useContext(UnsentMessagesContext);
  if (!value) {
    throw new Error('useUnsentMessages must be used within UnsentMessagesContext.Provider');
  }
  return value;
}
