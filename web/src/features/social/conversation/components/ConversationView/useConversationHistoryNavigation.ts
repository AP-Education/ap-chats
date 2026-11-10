import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useConversation, useConversationScope } from '@/features/social/conversation-scope/store';
import { flashMessage } from '@/features/social/messaging/flashMessage';
import { itemsOf } from '@/features/social/messaging/timeline/chat-entry';
import { useChatTimeline } from '@/features/social/messaging/timeline/useChatTimeline';
import { useActiveConversationReadState } from '@/features/social/read-state/hooks/useActiveConversationReadState';

export function useConversationHistoryNavigation() {
  const { workspaceId, channelId } = useConversationScope();
  const [params, setParams] = useSearchParams();
  const targetMessageId = params.get('message') ?? undefined;
  const [historyTargetId, setHistoryTargetId] = useState(targetMessageId);
  const clearSelection = useConversation((state) => state.clearSelection);
  const history = useChatTimeline(workspaceId, channelId, historyTargetId);
  const items = useMemo(() => itemsOf(history.entries), [history.entries]);

  useActiveConversationReadState(workspaceId, channelId, history.known, history.meta?.readState);

  const onJump = useCallback(
    (messageId: string) => {
      clearSelection();
      const row = document.getElementById(`message-${messageId}`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (messageId === targetMessageId) flashMessage(messageId);
        else setParams({ message: messageId }, { replace: true });
        return;
      }
      setHistoryTargetId(messageId);
      setParams({ message: messageId }, { replace: true });
    },
    [clearSelection, setParams, targetMessageId],
  );

  return { history, items, targetMessageId, historyTargetId, onJump };
}
