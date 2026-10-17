import { createContext, useContext } from 'react';

/** What a message the server hasn't taken yet can still do: go out again, or be withdrawn,
 * whole or one file at a time while its files are still going up. */
export interface UnsentMessages {
  retry: (rowId: string) => void;
  discard: (rowId: string) => void;
  discardFile: (rowId: string, fileKey: string) => void;
}

export const UnsentMessagesContext = createContext<UnsentMessages | null>(null);

export function useUnsentMessages(): UnsentMessages {
  const value = useContext(UnsentMessagesContext);
  if (!value) {
    throw new Error('useUnsentMessages must be used within UnsentMessagesContext.Provider');
  }
  return value;
}
