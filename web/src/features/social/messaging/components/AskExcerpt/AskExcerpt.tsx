import { createStyles } from 'antd-style';

import type { MemberSummary } from '@/features/workspaces/types';
import { Avatar } from '@/shared/ui/Avatar';

import { messageCount } from '../../messageCount';

const useStyles = createStyles(({ token, css }) => ({
  excerpt: css`
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  `,
  text: css`
    display: flex;
    flex-direction: column;
    min-width: 0;
    font-size: 14px;
    line-height: 1.3;
  `,
  title: css`
    overflow: hidden;
    color: ${token.colorPrimary};
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  detail: css`
    color: ${token.colorTextSecondary};
  `,
}));

/** Whom the composer asks, and about how many messages. */
export function AskExcerpt({ member, count }: { member: MemberSummary; count: number }) {
  const { styles } = useStyles();
  const name = member.displayName ?? 'учасника';

  return (
    <div className={styles.excerpt}>
      <Avatar path={member.avatarPath} alt={name} size={28} shape="circle" />
      <div className={styles.text}>
        <span className={styles.title}>Запитати {name}</span>
        <span className={styles.detail}>про {messageCount(count)}</span>
      </div>
    </div>
  );
}
