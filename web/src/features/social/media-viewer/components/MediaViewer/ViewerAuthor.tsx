import { TimelineMediaTitle, useTimelineMediaItem } from '@ap-education/timeline/media';
import { useTranslation } from 'react-i18next';

import type { ChatMedia } from '@/features/social/messaging/message-media';
import type { MessageEntry } from '@/features/social/messaging/timeline/chat-entry';
import { Avatar } from '@/shared/ui/Avatar';

/** Who sent the media on screen and when, which leads back to the message. */
export function ViewerAuthor() {
  const { t } = useTranslation('mediaViewer');
  const { entry } = useTimelineMediaItem<MessageEntry, ChatMedia>();
  const { author } = entry.payload.item;
  const name = author.displayName ?? t(($) => $.nameUnavailable);

  return (
    <TimelineMediaTitle name={name}>
      <Avatar path={author.avatarPath} alt={name} size={36} shape="circle" />
    </TimelineMediaTitle>
  );
}
