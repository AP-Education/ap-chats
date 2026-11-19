import { formatFileSize } from '@ap-education/timeline/composer';
import { TimelineEntryFile } from '@ap-education/timeline/media';
import { FileCardBadge } from '@ap-education/ui/media';
import { XIcon } from '@phosphor-icons/react';
import type { TFunction } from 'i18next';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { useChatsLanguage } from '@/shared/i18n/useChatsLanguage';

import type { AttachmentDraft } from '../../attachments/types';
import { useUnsentMessages } from '../../sending/stores/unsent-messages-context';
import type { MessageBlock } from '../../types';
import { MessageBlocks } from '../MessageBlocks/MessageBlocks';
import { intlLocale } from '../packageLabels';

function failureOf(draft: AttachmentDraft, t: TFunction<'messaging'>): string {
  if (draft.failure === 'expired') return t(($) => $.attachments.errors.uploadExpired);
  return t(($) => $.attachments.errors.uploadFailed);
}

/** How far the upload went; a file that is up tells its size and kind, as a sent one does. */
function uploadMeta(
  draft: AttachmentDraft,
  t: TFunction<'messaging'>,
  locale: string,
): string | undefined {
  const fileSize = (bytes: number) => formatFileSize(bytes, locale);
  const total = fileSize(draft.size);
  if (draft.status === 'error') return failureOf(draft, t);
  if (draft.status === 'queued') return t(($) => $.attachments.queuedSize, { size: total });
  if (draft.status === 'processing') return t(($) => $.attachments.status.processing);
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
  blocks = [],
  meta,
}: {
  rowId: string;
  drafts: AttachmentDraft[];
  blocks?: MessageBlock[];
  meta?: ReactNode;
}) {
  const { t } = useTranslation('messaging');
  const locale = intlLocale(useChatsLanguage());
  const { discardFile } = useUnsentMessages();

  return drafts.map((draft, index) => {
    const voice = blocks.find(
      (block) => block.type === 'voice' && block.attachmentId === draft.key,
    );
    if (voice) {
      return (
        <MessageBlocks
          key={draft.key}
          blocks={[voice]}
          messageId={rowId}
          drafts={[draft]}
          meta={index === drafts.length - 1 && meta}
        />
      );
    }

    return (
      <TimelineEntryFile
        key={draft.key}
        name={draft.name}
        size={draft.size}
        meta={uploadMeta(draft, t, locale)}
        metaTone={draft.status === 'error' ? 'error' : undefined}
      >
        <FileCardBadge
          label={t(($) => $.attachments.cancelUpload, { name: draft.name })}
          progress={uploadProgress(draft)}
          previewUrl={draft.previewUrl}
          onClick={() => discardFile(rowId, draft.key)}
        >
          <XIcon size={20} weight="bold" />
        </FileCardBadge>
      </TimelineEntryFile>
    );
  });
}
