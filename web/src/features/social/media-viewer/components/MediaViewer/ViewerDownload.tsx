import { IconButton, LoadingIcon } from '@ap-education/ui';
import { DownloadSimpleIcon } from '@phosphor-icons/react';

import type { Attachment } from '@/features/social/messaging/attachments/types';
import { useAttachmentDownload } from '@/features/social/messaging/components/MessageAttachments/useAttachmentAccess';

interface ViewerDownloadProps {
  messageId: string;
  attachment: Attachment;
}

export function ViewerDownload({ messageId, attachment }: ViewerDownloadProps) {
  const download = useAttachmentDownload(messageId, attachment);

  return (
    <IconButton
      size={40}
      aria-label={`Завантажити ${attachment.name}`}
      disabled={download.downloading}
      onClick={() => void download.download()}
    >
      {download.downloading ? <LoadingIcon size={22} /> : <DownloadSimpleIcon size={22} />}
    </IconButton>
  );
}
