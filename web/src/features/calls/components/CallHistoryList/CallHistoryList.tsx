import { Button, Empty } from 'antd';
import { createStyles } from 'antd-style';

import { useCallHistory } from '../../hooks/useCallHistory';
import type { CallHistoryFilter } from '../../types';
import { CallHistoryListSkeleton } from './CallHistoryListSkeleton';
import { CallHistoryRow } from './CallHistoryRow';
import { groupCallsByDay } from './groupCallsByDay';

const useStyles = createStyles(({ token, css }) => ({
  error: css`
    padding: 12px 0;
  `,
  group: css`
    &:not(:first-child) {
      margin-top: 20px;
    }
  `,
  groupLabel: css`
    padding: 0 0 8px;
    color: ${token.colorTextTertiary};
    font-size: 12px;
    font-weight: 600;
  `,
  empty: css`
    padding: 32px 0;
  `,
}));

export function CallHistoryList({
  workspaceId,
  filter,
}: {
  workspaceId: string;
  filter: CallHistoryFilter;
}) {
  const { styles } = useStyles();
  const history = useCallHistory(workspaceId, filter);

  if (history.isPending) return <CallHistoryListSkeleton />;
  if (history.isError && !history.data)
    return (
      <div role="alert" className={styles.error}>
        Не вдалося завантажити дзвінки.{' '}
        <Button type="link" onClick={() => void history.refetch()}>
          Повторити
        </Button>
      </div>
    );

  const items = history.data.pages.flatMap((page) => page.items);
  const groups = groupCallsByDay(items);

  if (groups.length === 0)
    return (
      <div className={styles.empty}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={filter === 'missed' ? 'Пропущених дзвінків немає' : 'Дзвінків поки немає'}
        />
      </div>
    );

  return (
    <div>
      {groups.map((group) => (
        <div key={group.key} className={styles.group}>
          <div className={styles.groupLabel}>{group.label}</div>
          {group.items.map((item) => (
            <CallHistoryRow key={item.id} item={item} workspaceId={workspaceId} />
          ))}
        </div>
      ))}
      {history.hasNextPage && (
        <Button
          block
          loading={history.isFetchingNextPage}
          onClick={() => void history.fetchNextPage()}
        >
          Показати ще
        </Button>
      )}
    </div>
  );
}
