import type { ReactNode } from 'react';

import type { Attachment } from '../../attachments/types';
import { AudioFile } from './AudioFile';
import { DocumentFile } from './DocumentFile';
import { VideoFile } from './VideoFile';

export interface FileAttachmentProps {
  attachment: Attachment;
  messageId: string;
  available: boolean;
  overlay?: ReactNode;
}

// The badge is the file's main action, as on Telegram: play what plays, download the rest.
export function FileAttachment(props: FileAttachmentProps) {
  const { preview } = props.attachment;

  if (preview === 'video') return <VideoFile {...props} />;
  if (preview === 'audio') return <AudioFile {...props} />;
  return <DocumentFile {...props} />;
}
