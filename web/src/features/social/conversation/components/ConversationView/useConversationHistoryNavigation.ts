import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useConversation, useConversationScope } from '@/features/social/conversation-scope/store';
import { flashMessage } from '@/features/social/messaging/flashMessage';
import { useChannelRealtime } from '@/features/social/messaging/hooks/useChannelRealtime';
import { useMessageHistory } from '@/features/social/messaging/hooks/useMessageHistory';
import type { HistoryPage, HistoryWindow } from '@/features/social/messaging/types';
import { useActiveConversationReadState } from '@/features/social/read-state/hooks/useActiveConversationReadState';

const emptyPages: HistoryPage[] = [];

export function useConversationHistoryNavigation() {
  const { workspaceId, channelId } = useConversationScope();
  const [params, setParams] = useSearchParams();
  const targetMessageId = params.get('message') ?? undefined;
  const [historyTargetId, setHistoryTargetId] = useState(targetMessageId);
  const clearSelection = useConversation((state) => state.clearSelection);
  const history = useMessageHistory(workspaceId, channelId, historyTargetId);
  const pages = history.data?.pages ?? emptyPages;
  const items = useMemo(() => pages.flatMap((page) => page.items), [pages]);
  const historyWindow: HistoryWindow = {
    pages,
    targetMessageId,
    older: {
      available: history.hasPreviousPage,
      loading: history.isFetchingPreviousPage,
      load: () => history.fetchPreviousPage(),
    },
    newer: {
      available: history.hasNextPage,
      loading: history.isFetchingNextPage,
      load: () => history.fetchNextPage(),
    },
  };

  useActiveConversationReadState(workspaceId, channelId, history.data?.pages[0]);
  useChannelRealtime(workspaceId, channelId, historyTargetId);

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

  return { history, historyWindow, items, historyTargetId, onJump };
}
