import { IconButton, LoadingIcon } from '@ap-education/ui';
import { WarningCircleIcon, XIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('voice');
  const { discardFile } = useUnsentMessages();
  const failed = draft.status === 'error';
  const label = t(($) => (failed ? $.pending.failed : $.pending.sending));

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
          aria-label={t(($) => $.pending.progress)}
        />
      }
      time={voiceTime(durationMs)}
      speed={
        <button
          className={styles.speed}
          type="button"
          disabled
          aria-label={t(($) => $.message.speed)}
        >
          1×
        </button>
      }
      action={
        <IconButton
          size={32}
          className={styles.download}
          aria-label={t(($) => $.pending.cancel)}
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
