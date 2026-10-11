import { useConversation } from '@/features/social/conversation/store';

import { useMessageActionScope } from './MessageActionScope';

/** What the features mounted in the conversation show of their own in this message. */
export function MessageAddons({ onJump }: { onJump: (messageId: string) => void }) {
  const { item } = useMessageActionScope();
  const contributions = useConversation((state) => state.contributions);

  return contributions.map(
    ({ MessageAddon }, index) =>
      MessageAddon && <MessageAddon key={index} item={item} onJump={onJump} />,
  );
}
