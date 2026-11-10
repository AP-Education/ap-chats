import type { InspectedMedia } from '@ap-education/storage/media';

import type { Attachment } from '../messages/types/message.types';

/** What a message keeps of an inspected file; a file without a placeholder keeps none at all. */
export function attachmentMedia({
  placeholder,
  ...media
}: InspectedMedia): Pick<Attachment, 'mediaType' | 'preview' | 'width' | 'height' | 'placeholder'> {
  return { ...media, ...(placeholder ? { placeholder } : {}) };
}
