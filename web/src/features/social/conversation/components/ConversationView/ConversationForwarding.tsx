import { ForwardModal } from '@/features/social/forwarding/components/ForwardModal/ForwardModal';
import type { HistoryItem } from '@/features/social/messaging/types';

import { useConversationScope } from '../../store';

interface ConversationForwardingProps {
  items: HistoryItem[];
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
