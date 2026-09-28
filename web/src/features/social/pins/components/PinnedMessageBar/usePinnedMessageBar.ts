import { useState } from 'react';

import { useConversationScope } from '@/features/social/conversation/store';

import { usePinActions, usePins } from '../../hooks/usePins';

export function usePinnedMessageBar() {
  const { workspaceId, channelId } = useConversationScope();
  const { data: pins } = usePins(workspaceId, channelId);
  const { update } = usePinActions(workspaceId, channelId);
  const scopeKey = `${workspaceId}:${channelId}`;
  const [cursor, setCursor] = useState({ scopeKey, index: 0 });
  if (cursor.scopeKey !== scopeKey) setCursor({ scopeKey, index: 0 });

  if (!pins?.length) return null;

  const position = Math.min(cursor.index, pins.length - 1);
  const current = pins[position]!;

  return {
    current,
    position,
    total: pins.length,
    advance: () => setCursor({ scopeKey, index: (position + 1) % pins.length }),
    unpin: () => update(current.messageId, false),
  };
}
