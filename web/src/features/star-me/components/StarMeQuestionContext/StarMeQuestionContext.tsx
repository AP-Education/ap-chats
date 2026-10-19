import { useTranslation } from 'react-i18next';

import type { MessageAddonProps } from '@/features/social/conversation-scope/extensions';
import { useConversationScope } from '@/features/social/conversation-scope/store';
import { BubbleExcerpt } from '@/features/social/messaging/components/Bubble/BubbleExcerpt';
import { ReplyExcerpt } from '@/features/social/messaging/components/ReplyExcerpt/ReplyExcerpt';

import { usePickedMessages } from '../../hooks/usePickedMessages';
import { useStarMe } from '../../hooks/useStarMe';

/** What a question to StarMe was asked about, quoted above it for everyone in the channel. */
export function StarMeQuestionContext({ item, onJump }: MessageAddonProps) {
  const { t } = useTranslation('starMe');
  const { workspaceId } = useConversationScope();
  const starMe = useStarMe(workspaceId);
  const asksStarMe = Boolean(
    starMe && item.mentions?.some(({ memberId }) => memberId === starMe.memberId),
  );
  const { data: picked = [] } = usePickedMessages(item.message.id, asksStarMe);

  const [first] = picked;
  if (!first) return null;

  const title =
    picked.length === 1
      ? (first.author.displayName ?? t(($) => $.nameUnavailable))
      : t(($) => $.messageCount, { count: picked.length });

  return (
    <BubbleExcerpt onClick={() => onJump(first.id)}>
      <ReplyExcerpt title={title} markdown={first.markdown} />
    </BubbleExcerpt>
  );
}
