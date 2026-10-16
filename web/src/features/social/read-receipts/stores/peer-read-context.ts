import { createContext, useContext } from 'react';

import { isReadByPeer } from '../read-receipts';

// Null outside a conversation that shares read receipts, where nothing shows as read.
export const PeerReadContext = createContext<string | null>(null);

export function useIsReadByPeer(seq: string): boolean {
  return isReadByPeer(seq, useContext(PeerReadContext));
}
