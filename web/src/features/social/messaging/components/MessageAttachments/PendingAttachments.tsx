import { formatFileSize } from '@ap-education/timeline/composer';
import { TimelineEntryFile } from '@ap-education/timeline/media';
import { FileCardBadge } from '@ap-education/ui/media';
import { XIcon } from '@phosphor-icons/react';

import type { AttachmentDraft } from '../../attachments/types';
import { useUnsentMessages } from '../../sending/stores/unsent-messages-context';

const fileSize = (bytes: number) => formatFileSize(bytes, 'uk-UA');

function failureOf(draft: AttachmentDraft): string {
  if (draft.failure === 'expired') return 'Час завантаження минув. Спробуйте ще раз.';
  return 'Не вдалося завантажити. Перевірте з’єднання й повторіть.';
}

/** How far the upload went; a file that is up tells its size and kind, as a sent one does. */
function uploadMeta(draft: AttachmentDraft): string | undefined {
  const total = fileSize(draft.size);
  if (draft.status === 'error') return failureOf(draft);
  if (draft.status === 'queued') return `У черзі · ${total}`;
  if (draft.status === 'processing') return 'Обробка файлу';
  if (draft.status === 'ready') return undefined;
  return `${fileSize((draft.size * draft.progress) / 100)} / ${total}`;
}

function uploadProgress(draft: AttachmentDraft): number | undefined {
  if (draft.status === 'error') return undefined;
  if (draft.status === 'processing' || draft.status === 'ready') return 100;
  return draft.progress;
}

// Stands in for MessageAttachments while the message waits on its files; a badge takes one out.
export function PendingAttachments({
  rowId,
  drafts,
}: {
  rowId: string;
  drafts: AttachmentDraft[];
}) {
  const { discardFile } = useUnsentMessages();

  return drafts.map((draft) => (
    <TimelineEntryFile
      key={draft.key}
      name={draft.name}
      size={draft.size}
      meta={uploadMeta(draft)}
      metaTone={draft.status === 'error' ? 'error' : undefined}
    >
      <FileCardBadge
        label={`Скасувати надсилання ${draft.name}`}
        progress={uploadProgress(draft)}
        previewUrl={draft.previewUrl}
        onClick={() => discardFile(rowId, draft.key)}
      >
        <XIcon size={20} weight="bold" />
      </FileCardBadge>
    </TimelineEntryFile>
  ));
}
