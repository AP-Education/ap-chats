import type { GallerySlide, ViewerMedia } from '../../types';
import { LoadingSlide } from './LoadingSlide';
import { VideoSlide } from './VideoSlide';

/** What React draws inside a slide PhotoSwipe leaves to it: a video, or the wait for history. */
export function SlideContent({
  slide,
  current,
}: {
  slide: GallerySlide;
  current: ViewerMedia | undefined;
}) {
  if (slide.kind === 'loading') return <LoadingSlide />;

  const { media } = slide;
  if (media.source.kind !== 'video') return null;

  return (
    <VideoSlide
      messageId={media.item.message.id}
      attachment={media.source.attachment}
      active={media.key === current?.key}
    />
  );
}
