import { IconButton, LoadingIcon } from '@ap-education/ui';
import { DownloadSimpleIcon, MusicNotesIcon, PlayIcon } from '@phosphor-icons/react';
import { useState } from 'react';

import { fileExtension, formatFileSize } from '../../attachments/file-presentation';
import type { Attachment } from '../../attachments/types';
import { mediaKey, useMediaViewer } from '../../media-viewer-context';
import { AttachmentPlayer } from './AttachmentPlayer';
import { FileBadge } from './FileBadge';
import { FileCard } from './FileCard';
import { useAttachmentDownload } from './useAttachmentAccess';

export function FileAttachment({
  attachment,
  messageId,
  available,
}: {
  attachment: Attachment;
  messageId: string;
  available: boolean;
}) {
  const viewer = useMediaViewer();
  const [playing, setPlaying] = useState(false);
  const download = useAttachmentDownload(messageId, attachment);
  const video = attachment.preview === 'video';
  const playable = video || attachment.preview === 'audio';
  // A video plays in the viewer, among the conversation's other media; audio plays in place.
  const play = video
    ? () => viewer.open(mediaKey(messageId, attachment.id))
    : () => setPlaying(true);
  const save = () => void download.download();
  const meta = `${formatFileSize(attachment.size)} · ${fileExtension(attachment.name)}`;

  // The badge is the file's main action, as on Telegram: play what plays, download the rest.
  const badge = playable ? (
    <FileBadge
      label={`Відтворити ${attachment.name}`}
      disabled={!available || playing}
      onPress={play}
    >
      {playing ? <MusicNotesIcon size={22} weight="fill" /> : <PlayIcon size={22} weight="fill" />}
    </FileBadge>
  ) : (
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
  );
  // What plays keeps a way to save it beside the name.
  const trailing = playable && (
    <IconButton
      size={36}
      aria-label={`Завантажити ${attachment.name}`}
      disabled={!available || download.downloading}
      onClick={save}
    >
      {download.downloading ? <LoadingIcon size={20} /> : <DownloadSimpleIcon size={20} />}
    </IconButton>
  );

  return (
    <FileCard
      name={attachment.name}
      meta={meta}
      badge={badge}
      onNamePress={save}
      nameDisabled={!available}
      trailing={trailing}
    >
      {playing && available && <AttachmentPlayer attachment={attachment} messageId={messageId} />}
    </FileCard>
  );
}
