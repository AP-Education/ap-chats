import type { HistoryItem } from '@/features/social/messaging/types';
import { isMessageItem } from '@/features/social/messaging/types';
import { ReactorsDialog } from '@/features/social/reactions/components/ReactorsDialog/ReactorsDialog';

import { useConversation } from '../../store';

export function ConversationReactors({ items }: { items: HistoryItem[] }) {
  const messageId = useConversation((state) => state.reactionsMessageId);
  const showReactions = useConversation((state) => state.showReactions);
  const item = messageId
    ? items.filter(isMessageItem).find((entry) => entry.id === messageId)
    : undefined;
  if (!item?.reactions?.length) return null;

  return <ReactorsDialog item={item} onClose={() => showReactions(null)} />;
}
