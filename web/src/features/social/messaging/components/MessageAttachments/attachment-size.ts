import type { Attachment } from '../../attachments/types';
import type { MediaSize } from '../../media/media-fit';

// An image stored before its size was known shows at the proportions of a common photo.
const UNKNOWN_SIZE: MediaSize = { width: 4, height: 3 };

export function attachmentSize({ width, height }: Attachment): MediaSize {
  return width && height ? { width, height } : UNKNOWN_SIZE;
}
