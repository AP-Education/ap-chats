import { useTimelineMediaItem } from '@ap-education/timeline/media';
import { MediaViewerCaption } from '@ap-education/ui/media';

import { MessageMarkdown } from '@/features/social/mentions/components/MessageMarkdown/MessageMarkdown';
import type { ChatMedia } from '@/features/social/messaging/message-media';
import type { MessageEntry } from '@/features/social/messaging/timeline/chat-entry';

/** The message's text under its media, with the people it mentions. */
export function ViewerCaption({ memberId }: { memberId: string | undefined }) {
  const { caption, entry } = useTimelineMediaItem<MessageEntry, ChatMedia>();
  if (!caption) return null;

  const { item } = entry.payload;

  return (
    <MediaViewerCaption>
      <MessageMarkdown
        markdown={caption}
        mentions={item.mentions}
        viewer={{
          memberId,
          mentioned: Boolean(item.mentionsMe),
          roleIds: item.rolesMentioningMe ?? [],
        }}
      />
    </MediaViewerCaption>
  );
}
