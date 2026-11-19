import { useTranslation } from 'react-i18next';

import { useTimelineActions } from '../../timeline-actions-context';
import { BubbleExcerpt } from '../Bubble/BubbleExcerpt';
import { ReplyExcerpt } from '../ReplyExcerpt/ReplyExcerpt';
import { useMessageActionScope } from './MessageActionScope';

/** The earlier messages this one is about, as a tappable excerpt of the first that jumps to it. */
export function ContextReference() {
  const { t } = useTranslation('starMe');
  const { t: messagingT } = useTranslation('messaging');
  const { item } = useMessageActionScope();
  const { jumpTo } = useTimelineActions();
  const context = item.context;

  if (!context) return null;

  const { first, count } = context;
  const title =
    count === 1
      ? (first.author.displayName ?? messagingT(($) => $.message.nameUnavailable))
      : t(($) => $.messageCount, { count });

  return (
    <BubbleExcerpt onClick={() => jumpTo(first.id)}>
      <ReplyExcerpt
        title={title}
        markdown={first.markdown}
        blocks={first.blocks}
        attachments={first.attachments}
      />
    </BubbleExcerpt>
  );
}
