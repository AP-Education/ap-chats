import { LinkIcon, PaperclipIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

import { isLoneGif } from '../../gifs/gif-links';
import type { MessageBlock } from '../../types';
import { MessagePreview } from '../MessagePreview/MessagePreview';
import styles from './ReplyExcerpt.module.css';

export function ReplyExcerpt({
  title,
  markdown,
  blocks,
  quoteText,
}: {
  title: string;
  markdown: string | null;
  blocks?: MessageBlock[];
  quoteText?: string | null;
}) {
  const { t } = useTranslation('messaging');
  const image = /!\[[^\]]*\]\([^)]+\)/.test(markdown ?? '');
  const link =
    !isLoneGif({ markdown, blocks }) && /\[[^\]]+\]\([^)]+\)|https?:\/\/\S+/.test(markdown ?? '');

  return (
    <div className={styles.body}>
      <div className={styles.title}>{title}</div>
      <div className={styles.preview}>
        {!quoteText && image && (
          <PaperclipIcon
            size={14}
            className={styles.icon}
            aria-label={t(($) => $.message.preview.attachment)}
          />
        )}
        {!quoteText && !image && link && (
          <LinkIcon
            size={14}
            className={styles.icon}
            aria-label={t(($) => $.message.preview.link)}
          />
        )}
        <span className={styles.text}>
          {quoteText ?? <MessagePreview markdown={markdown} blocks={blocks} />}
        </span>
      </div>
    </div>
  );
}
