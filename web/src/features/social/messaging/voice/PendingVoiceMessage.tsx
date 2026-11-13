import { IconButton, LoadingIcon } from '@ap-education/ui';
import { WarningCircleIcon, XIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

import type { AttachmentDraft } from '../attachments/types';
import { useUnsentMessages } from '../sending/stores/unsent-messages-context';
import { voiceTime } from './types';
import styles from './VoiceMessage.module.css';
import { VoiceMessageFrame } from './VoiceMessageFrame';

export function PendingVoiceMessage({
  draft,
  durationMs,
  rowId,
  meta,
}: {
  draft: AttachmentDraft;
  durationMs: number;
  rowId: string;
  meta?: ReactNode;
}) {
  const { discardFile } = useUnsentMessages();
  const failed = draft.status === 'error';
  const label = failed ? 'Не вдалося завантажити голосове' : 'Надсилаємо голосове';

  return (
    <VoiceMessageFrame
      playback={
        <button className={styles.play} type="button" disabled aria-label={label}>
          {failed ? <WarningCircleIcon size={22} /> : <LoadingIcon size={22} />}
        </button>
      }
      seek={
        <progress
          className={styles.track}
          value={draft.progress}
          max={100}
          aria-label="Завантаження голосового"
        />
      }
      time={voiceTime(durationMs)}
      speed={
        <button className={styles.speed} type="button" disabled aria-label="Швидкість відтворення">
          1×
        </button>
      }
      action={
        <IconButton
          size={32}
          className={styles.download}
          aria-label="Скасувати надсилання голосового"
          onClick={() => discardFile(rowId, draft.key)}
        >
          <XIcon size={18} />
        </IconButton>
      }
      meta={meta}
    >
      <span className={styles.uploadStatus} role="status">
        {label}
      </span>
    </VoiceMessageFrame>
  );
}
