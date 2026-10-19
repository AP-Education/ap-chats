import { useTranslation } from 'react-i18next';

import { useTimelineActions } from '../../timeline-actions-context';
import { BubbleExcerpt } from '../Bubble/BubbleExcerpt';
import { ReplyExcerpt } from '../ReplyExcerpt/ReplyExcerpt';
import { useMessageActionScope } from './MessageActionScope';

/** The message this one answers, as a tappable excerpt that jumps to it. */
export function ReplyReference() {
  const { t } = useTranslation('messaging');
  const { item } = useMessageActionScope();
  const { jumpTo } = useTimelineActions();
  const reply = item.reply;

  if (!reply) return null;

  return (
    <BubbleExcerpt onClick={() => jumpTo(reply.id)}>
      <ReplyExcerpt
        title={reply.author?.displayName ?? t(($) => $.message.nameUnavailable)}
        markdown={reply.markdown}
        blocks={reply.blocks}
        quoteText={item.message.quoteText}
      />
    </BubbleExcerpt>
  );
}
