import type { ReactNode } from 'react';

import type { Attachment } from '../../attachments/types';
import { voiceBlocks } from '../../voice/voice-blocks';
import { MessageBlocks } from '../MessageBlocks/MessageBlocks';
import { AudioFile } from './AudioFile';
import { DocumentFile } from './DocumentFile';
import { VideoFile } from './VideoFile';

export interface FileAttachmentProps {
  attachment: Attachment;
  messageId: string;
  available: boolean;
  overlay?: ReactNode;
  footer?: ReactNode;
}

// The badge is the file's main action, as on Telegram: play what plays, download the rest.
export function FileAttachment(props: FileAttachmentProps) {
  const { preview } = props.attachment;

  const blocks = voiceBlocks([props.attachment]);
  if (blocks.length) {
    return (
      <MessageBlocks
        blocks={blocks}
        messageId={props.messageId}
        attachments={[props.attachment]}
        available={props.available}
        meta={props.footer}
      />
    );
  }

  if (preview === 'video') return <VideoFile {...props} />;
  if (preview === 'audio') return <AudioFile {...props} />;
  return <DocumentFile {...props} />;
}
