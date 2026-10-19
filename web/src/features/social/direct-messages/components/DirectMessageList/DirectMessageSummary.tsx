import { createStyles } from 'antd-style';

import type { DirectMessage } from '../../api/direct-messages-api';
import { lastMessagePreview } from './directMessageLabels';

const useStyles = createStyles(({ token, css }) => ({
  body: css`
    flex: 1;
    min-width: 0;
  `,
  name: css`
    display: block;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: ${token.colorTextSecondary};
    font-weight: 500;

    @media (max-width: ${token.screenMD}px) {
      color: ${token.colorText};
      font-size: 16px;
      line-height: 24px;
      font-weight: 600;
    }
  `,
  unreadName: css`
    color: ${token.colorText};
    font-weight: 650;
  `,
  preview: css`
    display: block;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: ${token.colorTextTertiary};
    font-size: 12px;

    @media (max-width: ${token.screenMD}px) {
      color: ${token.colorTextTertiary};
      font-size: 14px;
      line-height: 20px;
    }
  `,
  unreadPreview: css`
    color: ${token.colorTextSecondary};
    font-weight: 500;

    @media (max-width: ${token.screenMD}px) {
      color: ${token.colorTextSecondary};
    }
  `,
}));

interface DirectMessageSummaryProps {
  item: DirectMessage;
  isUnread: boolean;
}

/** Who the conversation is with and what was said last, emphasised while something is unread. */
export function DirectMessageSummary({ item, isUnread }: DirectMessageSummaryProps) {
  const { styles, cx } = useStyles();

  return (
    <span className={styles.body}>
      <span className={cx(styles.name, isUnread && styles.unreadName)}>
        {item.participant.displayName ?? 'Ім’я недоступне'}
      </span>
      <span className={cx(styles.preview, isUnread && styles.unreadPreview)}>
        {lastMessagePreview(item.lastMessage)}
      </span>
    </span>
  );
}
