import { LinkIcon, PaperclipIcon } from '@phosphor-icons/react';

import type { Attachment } from '../../attachments/types';
import { isLoneGif } from '../../gifs/gif-links';
import type { MessageBlock } from '../../types';
import { MessagePreview } from '../MessagePreview/MessagePreview';
import styles from './ReplyExcerpt.module.css';

export function ReplyExcerpt({
  title,
  markdown,
  blocks,
  attachments,
  quoteText,
}: {
  title: string;
  markdown: string | null;
  blocks?: MessageBlock[];
  attachments?: Attachment[];
  quoteText?: string | null;
}) {
  const image = /!\[[^\]]*\]\([^)]+\)/.test(markdown ?? '');
  const link =
    !isLoneGif({ markdown, blocks }) && /\[[^\]]+\]\([^)]+\)|https?:\/\/\S+/.test(markdown ?? '');

  return (
    <div className={styles.body}>
      <div className={styles.title}>{title}</div>
      <div className={styles.preview}>
        {!quoteText && image && (
          <PaperclipIcon size={14} className={styles.icon} aria-label="Вкладення" />
        )}
        {!quoteText && !image && link && (
          <LinkIcon size={14} className={styles.icon} aria-label="Посилання" />
        )}
        <span className={styles.text}>
          {quoteText ?? (
            <MessagePreview markdown={markdown} blocks={blocks} attachments={attachments} />
          )}
        </span>
      </div>
    </div>
  );
}
