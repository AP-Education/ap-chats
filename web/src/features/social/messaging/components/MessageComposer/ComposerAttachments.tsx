import {
  ComposerAction,
  type ComposerDraft,
  useComposerPart,
} from '@ap-education/timeline/composer';
import { IconButton } from '@ap-education/ui';
import { PaperclipIcon } from '@phosphor-icons/react';
import { Button } from 'antd';
import { useRef } from 'react';

import type { useAttachments } from '../../attachments/useAttachments';
import { AttachmentDrafts } from './AttachmentDrafts/AttachmentDrafts';
import styles from './MessageComposer.module.css';

type Uploads = ReturnType<typeof useAttachments>;

/**
 * The files the message carries, above the words. Sending never waits on their upload, as in
 * Discord, Telegram, Slack or WhatsApp; only a failed one stays behind for the person to handle.
 */
export function ComposerAttachments({ uploads }: { uploads: Uploads }) {
  useComposerPart<ComposerDraft>({
    hasContent: uploads.drafts.some((draft) => draft.status !== 'error'),
    // The files keep going up for the message under its nonce, which sends them once they are up.
    compose: (message, nonce) => {
      uploads.commit(nonce);
      return message;
    },
    receiveFiles: uploads.addFiles,
  });

  return (
    <>
      <AttachmentDrafts
        drafts={uploads.drafts}
        onRemove={uploads.remove}
        onRetry={uploads.retry}
        onDescribe={uploads.describe}
      />
      {uploads.policyError && (
        <div role="alert">
          Не вдалося завантажити ліміти файлів.{' '}
          <Button type="link" size="small" onClick={uploads.reloadPolicy}>
            Повторити
          </Button>
        </div>
      )}
    </>
  );
}

interface AttachFilesProps {
  uploads: Uploads;
  /** Inside the field beside the words, or on a phone a round control beside the field. */
  placement: 'field' | 'beside';
}

export function AttachFiles({ uploads, placement }: AttachFilesProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const input = (
    <input
      ref={fileInput}
      type="file"
      multiple
      hidden
      onChange={(event) => {
        uploads.addFiles(Array.from(event.target.files ?? []));
        event.target.value = '';
      }}
    />
  );
  const control = {
    'aria-label': 'Додати файл',
    disabled: !uploads.policy,
    onClick: () => fileInput.current?.click(),
  };

  if (placement === 'beside') {
    return (
      <>
        {input}
        <IconButton size={44} className={styles.besideField} {...control}>
          <PaperclipIcon size={22} />
        </IconButton>
      </>
    );
  }

  return (
    <>
      {input}
      <span className={styles.inField}>
        <ComposerAction {...control}>
          <PaperclipIcon size={22} />
        </ComposerAction>
      </span>
    </>
  );
}
