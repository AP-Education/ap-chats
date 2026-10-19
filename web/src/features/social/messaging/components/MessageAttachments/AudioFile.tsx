import { MusicNotesIcon, PlayIcon } from '@phosphor-icons/react';
import { useState } from 'react';

import { fileSummary } from '../../attachments/file-presentation';
import { AttachmentPlayer } from './AttachmentPlayer';
import type { FileAttachmentProps } from './FileAttachment';
import { FileBadge } from './FileBadge';
import { FileCard } from './FileCard';
import { FileDownloadButton } from './FileDownloadButton';
import { useAttachmentDownload } from './useAttachmentAccess';

// Audio plays in place, under its card.
export function AudioFile({ attachment, messageId, available }: FileAttachmentProps) {
  const [playing, setPlaying] = useState(false);
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
          label={`Відтворити ${attachment.name}`}
          disabled={!available || playing}
          onPress={() => setPlaying(true)}
        >
          {playing ? (
            <MusicNotesIcon size={22} weight="fill" />
          ) : (
            <PlayIcon size={22} weight="fill" />
          )}
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
    >
      {playing && available && <AttachmentPlayer attachment={attachment} messageId={messageId} />}
    </FileCard>
  );
}
