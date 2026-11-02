import { TimelineEntryText } from '@ap-education/timeline/react';
import type { ReactNode } from 'react';

import { MessageMarkdown } from '@/features/social/mentions/components/MessageMarkdown/MessageMarkdown';

import { useMessageActionScope } from './MessageActionScope';
import styles from './MessageReadContent.module.css';

export function MessageReadContent({ jumboEmoji, meta }: { jumboEmoji: number; meta: ReactNode }) {
  const { item, context } = useMessageActionScope();

  if (item.message.markdown === null) {
    return null;
  }

  return (
    <TimelineEntryText
      className={styles.markdown}
      data-jumbo={jumboEmoji || undefined}
      data-message-text
    >
      <MessageMarkdown
        markdown={item.message.markdown}
        mentions={item.mentions}
        viewer={{
          memberId: context.memberId,
          mentioned: Boolean(item.mentionsMe),
          roleIds: item.rolesMentioningMe ?? [],
        }}
      />
      {meta}
    </TimelineEntryText>
  );
}
