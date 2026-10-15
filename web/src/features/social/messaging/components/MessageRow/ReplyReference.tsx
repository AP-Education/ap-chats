import { BubbleExcerpt } from '../Bubble/BubbleExcerpt';
import { ReplyExcerpt } from '../ReplyExcerpt/ReplyExcerpt';
import { useMessageActionScope } from './MessageActionScope';

/** The message this one answers, as a tappable excerpt that jumps to it. */
export function ReplyReference({ onJump }: { onJump: (messageId: string) => void }) {
  const { item } = useMessageActionScope();
  const reply = item.reply;

  if (!reply) return null;

  return (
    <BubbleExcerpt onClick={() => onJump(reply.id)}>
      <ReplyExcerpt
        title={reply.author?.displayName ?? 'Ім’я недоступне'}
        markdown={reply.markdown}
        quoteText={item.message.quoteText}
      />
    </BubbleExcerpt>
  );
}
