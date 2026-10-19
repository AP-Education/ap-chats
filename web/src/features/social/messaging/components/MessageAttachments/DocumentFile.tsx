import { LoadingIcon } from '@ap-education/ui';
import { DownloadSimpleIcon } from '@phosphor-icons/react';

import { fileSummary } from '../../attachments/file-presentation';
import type { FileAttachmentProps } from './FileAttachment';
import { FileBadge } from './FileBadge';
import { FileCard } from './FileCard';
import { useAttachmentDownload } from './useAttachmentAccess';

export function DocumentFile({ attachment, messageId, available }: FileAttachmentProps) {
  const download = useAttachmentDownload(messageId, attachment);
  const save = () => void download.download();

  return (
    <FileCard
      name={attachment.name}
      meta={fileSummary(attachment.name, attachment.size)}
      onNamePress={save}
      nameDisabled={!available}
      badge={
        <FileBadge
          label={`Завантажити ${attachment.name}`}
          disabled={!available || download.downloading}
          onPress={save}
        >
          {download.downloading ? (
            <LoadingIcon size={22} />
          ) : (
            <DownloadSimpleIcon size={22} weight="bold" />
          )}
        </FileBadge>
      }
    />
  );
}
