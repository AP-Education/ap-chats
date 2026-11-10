import type { Translation } from '../translation';
import type { mediaViewer as source } from '../uk/mediaViewer';

export const mediaViewer = {
  label: 'Media viewer',
  showInChat: 'Show in chat',
  nameUnavailable: 'Name unavailable',
  sentAt: '{{day}} at {{time}}',
  position: '{{index}} of {{total}}',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  download: 'Download {{name}}',
  imageFailed: 'Couldn’t open the image',
  openFailed: 'Couldn’t open media. Check your connection and try again.',
  videoFailed: 'Couldn’t open the video',
  videoLoading: 'Loading video',
} satisfies Translation<typeof source>;
