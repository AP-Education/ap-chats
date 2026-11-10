import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

import type { MemberSummary } from '@/features/workspaces/types';
import { Avatar } from '@/shared/ui/Avatar';

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
  const { t } = useTranslation('messaging');
  const name = member.displayName ?? t(($) => $.ask.fallbackName);

  return (
    <div className={styles.excerpt}>
      <Avatar path={member.avatarPath} alt={name} size={28} shape="circle" />
      <div className={styles.text}>
        <span className={styles.title}>{t(($) => $.ask.title, { name })}</span>
        <span className={styles.detail}>{t(($) => $.ask.about, { count })}</span>
      </div>
    </div>
  );
}
