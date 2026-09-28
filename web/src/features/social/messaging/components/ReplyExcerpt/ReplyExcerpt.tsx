import { LinkIcon, PaperclipIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';

import { MessagePreview } from '../MessagePreview/MessagePreview';

const useStyles = createStyles(({ token, css }) => ({
  body: css`
    min-width: 0;
    width: 100%;
    text-align: left;
  `,
  title: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: ${token.colorPrimary};
    font-size: 14px;
    line-height: 18px;
    font-weight: 600;
  `,
  preview: css`
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    color: ${token.colorTextSecondary};
    font-size: 14px;
    line-height: 18px;
  `,
  icon: css`
    flex: 0 0 auto;
  `,
  text: css`
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    pre,
    code,
    blockquote,
    ul,
    ol {
      display: inline;
      white-space: inherit;
      margin: 0;
      padding: 0;
    }
  `,
}));

export function ReplyExcerpt({
  title,
  markdown,
  quoteText,
}: {
  title: string;
  markdown: string | null;
  quoteText?: string | null;
}) {
  const { styles } = useStyles();
  const image = /!\[[^\]]*\]\([^)]+\)/.test(markdown ?? '');
  const link = /\[[^\]]+\]\([^)]+\)|https?:\/\/\S+/.test(markdown ?? '');

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
        <span className={styles.text}>{quoteText ?? <MessagePreview markdown={markdown} />}</span>
      </div>
    </div>
  );
}
