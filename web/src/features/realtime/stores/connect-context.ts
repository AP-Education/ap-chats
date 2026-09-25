import { createContext, useContext } from 'react';

import type { ConnectionState } from '../types';

export const ConnectContext = createContext<ConnectionState | null>(null);

export function useConnection(): ConnectionState {
  const value = useContext(ConnectContext);
  if (!value) {
    throw new Error('useConnection must be used within ConnectProvider');
  }
  return value;
}
