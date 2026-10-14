import { createContext, useContext } from 'react';

/** What a message the server never took can still do: go out again, or be dropped. */
export interface UnsentMessages {
  retry: (rowId: string) => void;
  discard: (rowId: string) => void;
}

export const UnsentMessagesContext = createContext<UnsentMessages | null>(null);

export function useUnsentMessages(): UnsentMessages {
  const value = useContext(UnsentMessagesContext);
  if (!value) {
    throw new Error('useUnsentMessages must be used within UnsentMessagesContext.Provider');
  }
  return value;
}
