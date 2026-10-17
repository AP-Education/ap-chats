import { createContext, useContext } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import type { ConversationSending, Outboxes } from './outboxes';

export const OutboxesContext = createContext<Outboxes | null>(null);

/** The conversation's outgoing side, which carries on after its screen closes. */
export function useConversationSending(
  workspaceId: string,
  channelId: string,
): ConversationSending {
  const outboxes = useContext(OutboxesContext);
  const { identity } = useQueryAuth();
  if (!outboxes) throw new Error('OutboxesProvider is missing');

  return outboxes.for({ identity, workspaceId, channelId });
}
