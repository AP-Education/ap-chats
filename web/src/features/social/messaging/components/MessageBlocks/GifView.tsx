import { TimelineEntryMedia, useTimelineMediaActions } from '@ap-education/timeline/media';
import { MediaBadge, MediaFrame, MediaFrameOpen } from '@ap-education/ui/media';
import { thumbHashStyle } from '@ap-education/ui/thumbhash';
import { type ReactNode, useMemo, useState } from 'react';

import { mediaKey } from '../../message-media';
import type { GifBlock } from '../../types';
import { GifLink } from './GifLink';

/**
 * Straight from its service's CDN; KLIPY swaps a taken-down GIF for its own notice. One that fails
 * to load at all leaves its link instead.
 */
export function GifView({
  block,
  messageId,
  overlay,
}: {
  block: GifBlock;
  messageId: string;
  overlay?: ReactNode;
}) {
  const { open } = useTimelineMediaActions();
  const [broken, setBroken] = useState(false);
  const key = mediaKey(messageId, 'gif');
  const title = block.title || 'GIF';
  const { placeholder } = block.media;
  const standIn = useMemo(
    () => (placeholder ? thumbHashStyle(placeholder) : undefined),
    [placeholder],
  );

  if (broken) {
    return (
      <TimelineEntryMedia>
        <GifLink href={block.link} />
        {overlay}
      </TimelineEntryMedia>
    );
  }

  return (
    <TimelineEntryMedia style={standIn}>
      <MediaFrame
        src={block.media.url}
        size={block.media}
        alt={title}
        mediaKey={key}
        onImageError={() => setBroken(true)}
      >
        <MediaFrameOpen aria-label={`Переглянути ${title}`} onClick={() => open(key)} />
        <MediaBadge corner="top-start" aria-hidden>
          GIF
        </MediaBadge>
      </MediaFrame>
      {overlay}
    </TimelineEntryMedia>
  );
}
