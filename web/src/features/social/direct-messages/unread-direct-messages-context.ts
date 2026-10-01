import type { UseQueryResult } from '@tanstack/react-query';
import { createContext, useContext } from 'react';

import type { UnreadDirectMessage } from './api/direct-messages-api';

export type UnreadDirectMessagesQuery = UseQueryResult<UnreadDirectMessage[]>;

export const UnreadDirectMessagesContext = createContext<UnreadDirectMessagesQuery | null>(null);

export function useUnreadDirectMessagesStore(): UnreadDirectMessagesQuery {
  const value = useContext(UnreadDirectMessagesContext);
  if (!value) {
    throw new Error(
      'useUnreadDirectMessagesStore must be used within UnreadDirectMessagesContext.Provider',
    );
  }
  return value;
}
