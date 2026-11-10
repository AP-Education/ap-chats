import { TimelineEntryFile } from '@ap-education/timeline/media';
import { FileCardBadge } from '@ap-education/ui/media';
import { DownloadSimpleIcon } from '@phosphor-icons/react';

import type { FileAttachmentProps } from './FileAttachment';
import { useAttachmentDownload } from './useAttachmentAccess';

export function DocumentFile({ attachment, messageId, available }: FileAttachmentProps) {
  const download = useAttachmentDownload(messageId, attachment);
  const save = () => void download.download();

  return (
    <TimelineEntryFile
      name={attachment.name}
      size={attachment.size}
      onNameClick={save}
      nameDisabled={!available}
    >
      <FileCardBadge
        label={`Завантажити ${attachment.name}`}
        disabled={!available}
        busy={download.downloading}
        onClick={save}
      >
        <DownloadSimpleIcon size={22} weight="bold" />
      </FileCardBadge>
    </TimelineEntryFile>
  );
}
