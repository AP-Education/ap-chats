import { createContext, useContext } from 'react';

import type { ConnectionState } from '../types';

export const RealtimeContext = createContext<ConnectionState | null>(null);

export function useConnection(): ConnectionState {
  const value = useContext(RealtimeContext);
  if (!value) {
    throw new Error('useConnection must be used within RealtimeProvider');
  }
  return value;
}
