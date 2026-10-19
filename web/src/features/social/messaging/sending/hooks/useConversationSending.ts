import { useContext } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import type { ConversationSending } from '../stores/outboxes';
import { OutboxesContext } from '../stores/outboxes-context';

export function useConversationSending(
  workspaceId: string,
  channelId: string,
): ConversationSending {
  const outboxes = useContext(OutboxesContext);
  const { identity } = useQueryAuth();
  if (!outboxes) throw new Error('OutboxesProvider is missing');

  return outboxes.for({ identity, workspaceId, channelId });
}
