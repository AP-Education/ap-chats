import { useConversationScope } from '@/features/social/conversation-scope/store';
import { ForwardModal } from '@/features/social/forwarding/components/ForwardModal/ForwardModal';
import type { MessageHistoryItem } from '@/features/social/messaging/types';

interface ConversationForwardingProps {
  items: MessageHistoryItem[];
  historyReady: boolean;
  onClose: () => void;
}

export function ConversationForwarding({
  items,
  historyReady,
  onClose,
}: ConversationForwardingProps) {
  const { workspaceId, channelId } = useConversationScope();
  if (!historyReady || !items.length) return null;

  return (
    <ForwardModal
      workspaceId={workspaceId}
      sourceChannelId={channelId}
      items={items}
      onClose={onClose}
    />
  );
}
