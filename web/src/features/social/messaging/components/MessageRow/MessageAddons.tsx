import { useConversationExtensions } from '@/features/social/conversation-scope/extensions';

import { useTimelineActions } from '../../timeline-actions-context';
import { useMessageActionScope } from './MessageActionScope';

/** What the features extending the conversation show of their own in this message. */
export function MessageAddons() {
  const { item } = useMessageActionScope();
  const { jumpTo } = useTimelineActions();
  const extensions = useConversationExtensions();

  return extensions.map(
    ({ id, MessageAddon }) => MessageAddon && <MessageAddon key={id} item={item} onJump={jumpTo} />,
  );
}
