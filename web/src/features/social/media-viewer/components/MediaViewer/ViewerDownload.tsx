import { IconButton, LoadingIcon } from '@ap-education/ui';
import { DownloadSimpleIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

import type { Attachment } from '@/features/social/messaging/attachments/types';
import { useAttachmentDownload } from '@/features/social/messaging/components/MessageAttachments/useAttachmentAccess';

interface ViewerDownloadProps {
  messageId: string;
  attachment: Attachment;
}

export function ViewerDownload({ messageId, attachment }: ViewerDownloadProps) {
  const { t } = useTranslation('mediaViewer');
  const download = useAttachmentDownload(messageId, attachment);

  return (
    <IconButton
      size={40}
      aria-label={t(($) => $.download, { name: attachment.name })}
      disabled={download.downloading}
      onClick={() => void download.download()}
    >
      {download.downloading ? <LoadingIcon size={22} /> : <DownloadSimpleIcon size={22} />}
    </IconButton>
  );
}
