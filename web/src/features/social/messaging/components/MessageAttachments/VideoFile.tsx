import { PlayIcon } from '@phosphor-icons/react';

import { fileSummary } from '../../attachments/file-presentation';
import { mediaKey, useMediaViewer } from '../../media-viewer-context';
import type { FileAttachmentProps } from './FileAttachment';
import { FileBadge } from './FileBadge';
import { FileCard } from './FileCard';
import { FileDownloadButton } from './FileDownloadButton';
import { useAttachmentDownload } from './useAttachmentAccess';

// A video plays in the viewer, among the conversation's other media.
export function VideoFile({ attachment, messageId, available }: FileAttachmentProps) {
  const viewer = useMediaViewer();
  const download = useAttachmentDownload(messageId, attachment);
  const save = () => void download.download();
  const play = () => viewer.open(mediaKey(messageId, attachment.id));

  return (
    <FileCard
      name={attachment.name}
      meta={fileSummary(attachment.name, attachment.size)}
      onNamePress={save}
      nameDisabled={!available}
      badge={
        <FileBadge label={`Відтворити ${attachment.name}`} disabled={!available} onPress={play}>
          <PlayIcon size={22} weight="fill" />
        </FileBadge>
      }
      trailing={
        <FileDownloadButton
          name={attachment.name}
          downloading={download.downloading}
          disabled={!available}
          onPress={save}
        />
      }
    />
  );
}
