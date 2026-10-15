import { useConversationExtensions } from '@/features/social/conversation-scope/extensions';

import { useMessageActionScope } from './MessageActionScope';

/** What the features extending the conversation show of their own in this message. */
export function MessageAddons({ onJump }: { onJump: (messageId: string) => void }) {
  const { item } = useMessageActionScope();
  const extensions = useConversationExtensions();

  return extensions.map(
    ({ id, MessageAddon }) => MessageAddon && <MessageAddon key={id} item={item} onJump={onJump} />,
  );
}
