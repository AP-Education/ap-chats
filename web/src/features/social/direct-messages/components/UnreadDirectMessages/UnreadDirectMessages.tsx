import { Button } from 'antd';
import { createStyles } from 'antd-style';
import { useMatch } from 'react-router-dom';

import { useUnreadDirectMessagesStore } from '../../unread-direct-messages-context';
import { DirectMessageRow } from '../DirectMessageList/DirectMessageRow';

const useStyles = createStyles(({ token, css }) => ({
  section: css`
    flex: 0 1 auto;
    min-height: 0;
    max-height: 42vh;
    overflow-y: auto;
    padding-bottom: 8px;
  `,
  heading: css`
    padding: 6px 16px 4px;
    color: ${token.colorTextTertiary};
    font-size: 12px;
    font-weight: 600;
  `,
  error: css`
    padding: 8px 16px;
    color: ${token.colorTextSecondary};
    font-size: 12px;
  `,
}));

export function UnreadDirectMessages({ onNavigate }: { onNavigate?: () => void }) {
  const { styles } = useStyles();
  const unread = useUnreadDirectMessagesStore();
  const activeId = useMatch('/direct/:channelId')?.params.channelId;

  if (unread.isPending) return null;
  if (unread.isError && !unread.data) {
    return (
      <div role="alert" className={styles.error}>
        Не вдалося завантажити непрочитані.{' '}
        <Button type="link" size="small" onClick={() => void unread.refetch()}>
          Повторити
        </Button>
      </div>
    );
  }
  const items = unread.data?.filter((item) => item.id !== activeId) ?? [];
  if (!items.length) return null;

  return (
    <section className={styles.section} aria-label="Непрочитані особисті розмови">
      <div className={styles.heading}>Непрочитані</div>
      {items.map((item) => (
        <DirectMessageRow
          key={item.id}
          item={item}
          unreadCount={item.unreadCount}
          onNavigate={onNavigate}
        />
      ))}
    </section>
  );
}
