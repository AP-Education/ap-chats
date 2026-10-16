import type { ViewerMedia } from '../../types';
import { VideoSlide } from './VideoSlide';

/** What React draws inside a slide PhotoSwipe leaves to it: a video. */
export function SlideContent({
  media,
  current,
}: {
  media: ViewerMedia;
  current: ViewerMedia | undefined;
}) {
  if (media.source.kind !== 'video') return null;

  return (
    <VideoSlide
      messageId={media.item.message.id}
      attachment={media.source.attachment}
      active={media.key === current?.key}
    />
  );
}
