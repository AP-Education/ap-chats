import { CountBadge } from '@ap-education/ui';
import { BellSlashIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';

import type { DirectMessage } from '../../api/direct-messages-api';
import { formatRecentTime } from './directMessageLabels';

const useStyles = createStyles(({ token, css }) => ({
  trailing: css`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;

    @media (max-width: ${token.screenMD}px) {
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }
  `,
  time: css`
    display: none;

    @media (max-width: ${token.screenMD}px) {
      display: block;
      color: ${token.colorTextTertiary};
      font-size: 12px;
      line-height: 18px;
      white-space: nowrap;
    }
  `,
  indicators: css`
    display: flex;
    align-items: center;
    gap: 4px;
  `,
  muted: css`
    flex-shrink: 0;
    color: ${token.colorTextTertiary};
  `,
}));

interface DirectMessageMetaProps {
  item: DirectMessage;
  badge: number;
}

/** The row's trailing side: when the last message came, or what waits there, and if it is muted. */
export function DirectMessageMeta({ item, badge }: DirectMessageMetaProps) {
  const { styles } = useStyles();
  const isMuted = item.notification.isMuted;
  // A waiting count takes the place of the time.
  const sentAt = badge > 0 ? undefined : item.lastMessage?.createdAt;
  const hasIndicators = isMuted || badge > 0;
  if (!sentAt && !hasIndicators) return null;

  return (
    <span className={styles.trailing}>
      {sentAt && (
        <time className={styles.time} dateTime={sentAt}>
          {formatRecentTime(sentAt)}
        </time>
      )}
      {hasIndicators && (
        <span className={styles.indicators}>
          {isMuted && (
            <BellSlashIcon size={18} className={styles.muted} aria-label="Сповіщення вимкнено" />
          )}
          <CountBadge count={badge} label={`${badge} непрочитаних`} />
        </span>
      )}
    </span>
  );
}
