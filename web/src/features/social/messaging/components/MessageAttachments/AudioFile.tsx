import { TimelineEntryFile } from '@ap-education/timeline/media';
import { FileCardAction, FileCardActions, FileCardBadge } from '@ap-education/ui/media';
import { DownloadSimpleIcon, MusicNotesIcon, PlayIcon } from '@phosphor-icons/react';
import { useState } from 'react';

import { AttachmentPlayer } from './AttachmentPlayer';
import type { FileAttachmentProps } from './FileAttachment';
import { useAttachmentDownload } from './useAttachmentAccess';

// Audio plays in place, under its card.
export function AudioFile({ attachment, messageId, available }: FileAttachmentProps) {
  const [playing, setPlaying] = useState(false);
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
        disabled={!available || playing}
        onClick={() => setPlaying(true)}
      >
        {playing ? (
          <MusicNotesIcon size={22} weight="fill" />
        ) : (
          <PlayIcon size={22} weight="fill" />
        )}
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
      {playing && available && <AttachmentPlayer attachment={attachment} messageId={messageId} />}
    </TimelineEntryFile>
  );
}
