import { XIcon } from '@phosphor-icons/react';

import { fileExtension, formatFileSize } from '../../attachments/file-presentation';
import type { AttachmentDraft } from '../../attachments/types';
import { useUnsentMessages } from '../../unsent-messages-context';
import { FileBadge } from './FileBadge';
import { FileCard } from './FileCard';

function uploadMeta(draft: AttachmentDraft): string {
  const total = formatFileSize(draft.size);
  if (draft.status === 'error') return draft.error ?? 'Не вдалося завантажити';
  if (draft.status === 'queued') return `У черзі · ${total}`;
  if (draft.status === 'processing') return 'Обробка файлу';
  if (draft.status === 'ready') return `${total} · ${fileExtension(draft.name)}`;
  return `${formatFileSize((draft.size * draft.progress) / 100)} / ${total}`;
}

function uploadProgress(draft: AttachmentDraft): number | undefined {
  if (draft.status === 'error') return undefined;
  if (draft.status === 'processing' || draft.status === 'ready') return 100;
  return draft.progress;
}

// Rendered in place of MessageAttachments while the message waits on its files: it is already
// in the timeline (sending never waits on uploads), so this shows them going up, live, and each
// one's badge takes it out of the message, as on Telegram.
export function PendingAttachments({
  rowId,
  drafts,
}: {
  rowId: string;
  drafts: AttachmentDraft[];
}) {
  const { discardFile } = useUnsentMessages();

  return drafts.map((draft) => (
    <FileCard
      key={draft.key}
      name={draft.name}
      meta={uploadMeta(draft)}
      metaTone={draft.status === 'error' ? 'error' : undefined}
      badge={
        <FileBadge
          label={`Скасувати надсилання ${draft.name}`}
          progress={uploadProgress(draft)}
          previewUrl={draft.previewUrl}
          onPress={() => discardFile(rowId, draft.key)}
        >
          <XIcon size={20} weight="bold" />
        </FileBadge>
      }
    />
  ));
}
