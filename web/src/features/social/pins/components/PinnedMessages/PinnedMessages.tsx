import { Button, Empty, Spin } from 'antd';
import { createStyles } from 'antd-style';

import { useConversationScope } from '@/features/social/conversation/store';
import { MessagePreview } from '@/features/social/messaging/components/MessagePreview/MessagePreview';

import { usePins } from '../../hooks/usePins';

const useStyles = createStyles(({ token, css }) => ({
  list: css`
    width: min(320px, 75vw);
    max-height: 350px;
    overflow-y: auto;
  `,
  item: css`
    display: block;
    width: 100%;
    margin-bottom: 4px;
    padding: 8px 10px;
    border: 0;
    border-radius: ${token.borderRadiusSM}px;
    background: transparent;
    color: ${token.colorText};
    text-align: left;
    cursor: pointer;
    &:hover {
      background: ${token.colorFillTertiary};
    }
  `,
  author: css`
    display: block;
    color: ${token.colorPrimary};
    font-size: 12px;
    font-weight: 650;
  `,
  excerpt: css`
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
}));

interface PinnedMessagesProps {
  onJump: (messageId: string) => void;
}

export function PinnedMessages({ onJump }: PinnedMessagesProps) {
  const { styles } = useStyles();
  const { workspaceId, channelId } = useConversationScope();
  const query = usePins(workspaceId, channelId);

  if (query.isPending)
    return (
      <div className={styles.list}>
        <Spin size="small" />
      </div>
    );
  if (query.isError)
    return (
      <div className={styles.list}>
        Не вдалося завантажити закріплене.{' '}
        <Button type="link" onClick={() => void query.refetch()}>
          Повторити
        </Button>
      </div>
    );
  if (!query.data?.length)
    return (
      <div className={styles.list}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Закріплених повідомлень поки немає"
        />
      </div>
    );

  return (
    <div className={styles.list}>
      {query.data.map((pin) => (
        <button
          key={pin.messageId}
          type="button"
          className={styles.item}
          onClick={() => onJump(pin.messageId)}
        >
          <span className={styles.author}>{pin.author.displayName ?? 'Ім’я недоступне'}</span>
          <span className={styles.excerpt}>
            <MessagePreview markdown={pin.markdown} />
          </span>
        </button>
      ))}
    </div>
  );
}
