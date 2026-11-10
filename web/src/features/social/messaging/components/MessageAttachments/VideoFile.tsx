import { TimelineEntryFile, useTimelineMediaActions } from '@ap-education/timeline/media';
import { FileCardAction, FileCardActions, FileCardBadge } from '@ap-education/ui/media';
import { DownloadSimpleIcon, PlayIcon } from '@phosphor-icons/react';

import { mediaKey } from '../../message-media';
import type { FileAttachmentProps } from './FileAttachment';
import { useAttachmentDownload } from './useAttachmentAccess';

// A video plays in the viewer, among the conversation's other media.
export function VideoFile({ attachment, messageId, available }: FileAttachmentProps) {
  const { open } = useTimelineMediaActions();
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
        label={`Відтворити ${attachment.name}`}
        disabled={!available}
        onClick={() => open(mediaKey(messageId, attachment.id))}
      >
        <PlayIcon size={22} weight="fill" />
      </FileCardBadge>
      <FileCardActions>
        <FileCardAction
          label={`Завантажити ${attachment.name}`}
          disabled={!available}
          busy={download.downloading}
          onClick={save}
        >
          <DownloadSimpleIcon size={20} />
        </FileCardAction>
      </FileCardActions>
    </TimelineEntryFile>
  );
}
